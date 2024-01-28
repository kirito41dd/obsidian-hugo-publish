import { App, Editor, FileSystemAdapter, MarkdownView, Modal, Notice, Plugin, parseYaml, stringifyYaml } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab, check_setting } from './setting';

import * as util from "./util";
import * as path from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit'
import { remark } from 'remark';

// Remember to rename these classes and interfaces!



export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	base_path: string;

	async onload() {
		await this.loadSettings();

		// get base path
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			this.base_path = this.app.vault.adapter.getBasePath();
		} else {
			console.error("can't get base path");
			return;
		}


		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'hugo sync', async (evt: MouseEvent) => {
			if (!check_setting(this.settings)) {
				new Notice('Please provide config first!');
				return;
			}
			// console.log("cwd", process.cwd());
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
			const files = this.app.vault.getMarkdownFiles();



			const blogs = await util.get_all_blog_md(this.app, this.settings.blog_tag);

			console.log("link", this.app.metadataCache.resolvedLinks);

			for (let i = 0; i < blogs.length; i++) {
				const f = files[i];
				const content = await this.app.vault.read(f);
				let [header, body] = util.get_md_yaml_hader_from_content(content)



				const hv = parseYaml(header);
				if (!("title" in hv)) {
					hv["title"] = path.parse(f.name).name;
				}
				header = stringifyYaml(hv);


				console.log("header\n", header, "body\n", body, "hv", hv);

				// const ast = unified().use(remarkParse).parse(body);
				const ast = remark.parse(body)



				console.log("ast", ast)



				const meta = this.app.metadataCache.getFileCache(f);

				const link2path: Map<string, string> = new Map();

				const abf = this.app.vault.getAbstractFileByPath(f.path);
				// copy files to blog dir
				if (abf) {
					const src = path.join(this.base_path, abf.path);
					const dst = path.join(this.settings.site_dir, this.settings.blog_dir, f.path);

					if (meta?.embeds) {
						// copy embeds to static dir
						for (const v of meta.embeds) {
							const embed_f = this.app.metadataCache.getFirstLinkpathDest(v.link, f.path);
							if (embed_f) {
								link2path.set(v.link, embed_f.path);
								const src = path.join(this.base_path, embed_f.path);
								const dst = path.join(this.settings.site_dir, "static", this.settings.static_dir, embed_f.path);
								console.log(`copy ${src} to ${dst}`);
								await util.copy_file(src, dst);
							}
						}

					}
					const static_dir = this.settings.static_dir;
					visit(ast, 'image', function (node, index, parent) {
						const v = link2path.get(node.url)
						if (v) {
							node.url = path.join("/", static_dir, v).replace(/\\/g, '/');

						}
					})

					body = remark.stringify(ast);
					console.log(`write ${src} to ${dst}`);
					await util.write_md(dst, header, body)
				}
			}

			console.log(blogs);

		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('hugo-publish');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
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

