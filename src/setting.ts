import { App, PluginSettingTab, Setting } from "obsidian";
import HugoPublishPlugin from "./main";
import * as path from 'path';


export interface HugoPublishSettings {
    blog_tag: string;
    export_blog_tag: boolean;
    site_dir: string; // absolute path
    blog_dir: string; // relative path to site_dir
    exclude_dir: string; // relative path to site_dir
    static_dir: string; // relative path to site_dir/static
    keep_list: string;
    get_blog_abs_dir: () => string;
    get_static_abs_dir: () => string;
    get_blog_keep_list: () => RegExp[];
}

export const DEFAULT_SETTINGS: HugoPublishSettings = {
    blog_tag: "blog",
    blog_dir: "",
    exclude_dir: "",
    static_dir: "ob",
    site_dir: "",
    keep_list: "",
    get_blog_abs_dir(): string {
        return path.join(this.site_dir, this.blog_dir);
    },
    get_static_abs_dir(): string {
        return path.join(this.site_dir, "static", this.static_dir);
    },
    get_blog_keep_list(): RegExp[] {
        const strs: string[] = this.keep_list.split(",");
        const regs = Array(0);
        for (const s of strs) {
            if (s.length > 0) {
                regs.push(RegExp(s));
            }
        }
        return regs;
    },
    export_blog_tag: true
}

export class HugoPublishSettingTab extends PluginSettingTab {
    plugin: HugoPublishPlugin;

    constructor(app: App, plugin: HugoPublishPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('blog tag')
            .setDesc('All articles with this tag are treated as blogs, if empty process all articles')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.blog_tag)
                .onChange(async (value) => {
                    this.plugin.settings.blog_tag = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl).setName("export blog tag").setDesc("Export ${blog tag} to hugo md file's header")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.export_blog_tag).onChange(async (value) => {
                this.plugin.settings.export_blog_tag = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName("site dir").setDesc("Hugo site root dir, absolute path")
            .addText(text => text.setPlaceholder("/path/to/hugo/site").setValue(this.plugin.settings.site_dir).onChange(async (value) => {
                this.plugin.settings.site_dir = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName("blog dir").setDesc("All blog copy to this dir, relative path to site, note that content will be deleted first when syncing")
            .addText(text => text.setPlaceholder("blog/dir").setValue(this.plugin.settings.blog_dir).onChange(async (value) => {
                this.plugin.settings.blog_dir = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName("exclude dir").setDesc('Exclude dir when syncing, relative path to vault, split by ",", like blog/dir1')
            .addText(text => text.setPlaceholder("blog/dir1").setValue(this.plugin.settings.exclude_dir).onChange(async (value) => {
                this.plugin.settings.exclude_dir = value;
                await this.plugin.saveSettings();
            }))
        new Setting(containerEl).setName("static dir").setDesc("All static(like images) copy to static/${static dir}, like static/ob, relative path to site/static. Can be empty, note that content will be deleted first when syncing")
            .addText(text => text.setPlaceholder("./").setValue(this.plugin.settings.static_dir).onChange(async (value) => {
                this.plugin.settings.static_dir = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName("blog dir keep list").setDesc('Optional, do not delete matching files, use js regexp and split by ",". e.g. .*\\.html,.*\\.toml')
            .addText(text => text.setValue(this.plugin.settings.keep_list).onChange(async (value) => {
                this.plugin.settings.keep_list = value;
                await this.plugin.saveSettings();
            }));
    }
}

export const check_setting = (setting: HugoPublishSettings): boolean => {
    if (setting.blog_dir.length == 0 || setting.site_dir.length == 0) {
        return false
    }
    return true;
}