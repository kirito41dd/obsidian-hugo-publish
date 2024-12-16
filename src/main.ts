// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { App, Editor, FileSystemAdapter, MarkdownView, Modal, Notice, Plugin, parseYaml, stringifyYaml } from 'obsidian';
import { DEFAULT_SETTINGS, HugoPublishSettings, HugoPublishSettingTab, check_setting } from './setting';

import * as util from "./util";
import * as path from 'path';
import { visit } from 'unist-util-visit'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { remark } from 'remark';
import { newlineToBreak } from 'mdast-util-newline-to-break'

import { math } from 'micromark-extension-math'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { mathFromMarkdown, mathToMarkdown } from 'mdast-util-math'
import { toMarkdown } from 'mdast-util-to-markdown'
import { gfmTable } from 'micromark-extension-gfm-table'
import { gfmTableFromMarkdown, gfmTableToMarkdown } from 'mdast-util-gfm-table'


// Remember to rename these classes and interfaces!



export default class HugoPublishPlugin extends Plugin {
	settings: HugoPublishSettings;
	base_path: string;

	async onload() {
		await this.loadSettings();
		this.settings.get_blog_abs_dir();
		// get base path
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			this.base_path = this.app.vault.adapter.getBasePath();
		} else {
			console.error("can't get base path");
			return;
		}




		// This creates an icon in the left ribbon.
		this.addRibbonIcon('folder-sync', 'hugo sync', async (evt: MouseEvent) => {
			await this.sync_blog();
		});
		// Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('hugo-publish');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'sync-blog',
			name: 'Sync blog',
			callback: async () => {
				// new SampleModal(this.app).open();
				await this.sync_blog();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new HugoPublishSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async sync_blog() {
		if (!check_setting(this.settings)) {
			new Notice('Error: Please provide config first!');
			return;
		}
		// console.log("cwd", process.cwd());
		// Called when the user clicks the icon.
		new Notice('Start syncing blogs...');

		// clear dir
		await util.delete_files_in_dir_with_keep_list(this.settings.get_blog_abs_dir(), this.settings.get_blog_keep_list());
		await util.delete_files_in_dir(this.settings.get_static_abs_dir());

		const blogs = await util.get_all_blog_md(this.app, this.settings.blog_tag);

		// Get excluded directories
		const exclude_dirs = this.settings.get_exclude_dir().map(v => v.endsWith('/') ? v : v + '/');
		console.debug('skip dirs:', exclude_dirs);

		for (let i = 0; i < blogs.length; i++) {
			const f = blogs[i];
			const content = await this.app.vault.read(f);
			const stat = await this.app.vault.adapter.stat(f.path);

			// Check if the file is in an excluded directory
			const isExcluded = exclude_dirs.some(dir => f.path.startsWith(dir));
			if (isExcluded) {
				continue; // Ignore files in excluded directories
			}

			let [header, body] = util.get_md_yaml_hader_from_content(content)
			let hv = parseYaml(header);
			if (!hv) { hv = {}; }
			if (hv) {
				if (!("title" in hv)) {
					hv["title"] = path.parse(f.name).name;
				}
				if (stat) {
					const creat_at = new Date(stat?.ctime).toISOString();
					const modify_at = new Date(stat?.mtime).toISOString()
					//console.log("process", f.path, "stat", stat, creat_at);
					if (!("date" in hv)) {
						hv["date"] = creat_at;
					}
					if (!("lastmod" in hv)) {
						hv["lastmod"] = modify_at;
					}
				}
			}

			header = stringifyYaml(hv);


			//console.log("header\n", header, "body\n", body, "hv", hv);

			// const ast = unified().use(remarkParse).parse(body);
			// const ast = remark.parse(body)

			const ast = fromMarkdown(body, {
				extensions: [math(), gfmTable()],
				mdastExtensions: [mathFromMarkdown(), gfmTableFromMarkdown()]
			})

			// hard line brek
			newlineToBreak(ast);


			//console.log("ast", ast)
			util.transform_wiki_image(ast);
			util.transform_wiki_link(ast);


			const meta = this.app.metadataCache.getFileCache(f);

			// link -> path,is_md
			const link2path: Map<string, [string, boolean]> = new Map();

			const abf = this.app.vault.getAbstractFileByPath(f.path);
			// copy files to blog dir
			if (abf) {
				//const src = path.join(this.base_path, abf.path);
				const dst = path.join(this.settings.get_blog_abs_dir(), f.path);

				if (meta?.embeds) {
					// copy embeds to static dir
					for (const v of meta.embeds) {
						const embed_f = this.app.metadataCache.getFirstLinkpathDest(v.link, f.path);
						if (embed_f) {
							link2path.set(v.link, [embed_f.path, false]);
							const src = path.join(this.base_path, embed_f.path);
							const dst = path.join(this.settings.get_static_abs_dir(), embed_f.path);
							//console.log(`copy ${src} to ${dst}`);
							await util.copy_file(src, dst);
						}
					}

				}
				if (meta?.links) {
					for (const v of meta.links) {
						const link_f = this.app.metadataCache.getFirstLinkpathDest(v.link, f.path);
						//console.log("link", v.link, link_f);
						if (link_f) {
							let is_md = false;
							if (link_f.path.endsWith(".md")) {
								is_md = true;
								link2path.set(v.link, [v.link, is_md]);
							}
						}
					}
				}
				const static_dir = this.settings.static_dir;

				//console.log("this", this);
				//console.log("link2path", link2path, "meta", meta)
				visit(ast, 'image', function (node, index, parent) {
					const decoded_url = decodeURI(node.url);
					const v = link2path.get(decoded_url)
					if (v) {
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const [vv, _is_md] = v;
						node.url = encodeURI(path.join("/", static_dir, vv).replace(/\\/g, '/'));
					}
				})
				visit(ast, 'link', function (node, index, parent) {
					const decoded_url = decodeURI(node.url);
					const v = link2path.get(decoded_url)
					if (v) {
						const [vv, is_md] = v;
						if (is_md) {
							// inner md link:  [[abc]] -> [](/abc) -> https://www.blog.com/abc
							node.url = encodeURI(path.join("/", vv).replace(/\\/g, '/'));
						} else {
							node.url = encodeURI(path.join("/", static_dir, vv).replace(/\\/g, '/'));
						}
					}
				})

				// body = remark.stringify(ast);
				body = toMarkdown(ast, { extensions: [mathToMarkdown(), gfmTableToMarkdown()] });
				//console.log(`write ${src} to ${dst}`);
				await util.write_md(dst, header, body)
			}
		}
		new Notice('Completed!');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class HugoPublishModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

