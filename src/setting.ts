import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./main";
import * as path from 'path';


export interface MyPluginSettings {
    blog_tag: string;
    site_dir: string; // absolute path
    blog_dir: string; // relative path to site_dir
    static_dir: string; // relative path to site_dir/static
    get_blog_abs_dir: () => string;
    get_static_abs_dir: () => string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    blog_tag: "blog",
    blog_dir: "",
    static_dir: "ob",
    site_dir: "",
    get_blog_abs_dir(): string {
        return path.join(this.site_dir, this.blog_dir);
    },
    get_static_abs_dir(): string {
        return path.join(this.site_dir, "static", this.static_dir);
    }
}

export class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('blog tag')
            .setDesc('All articles with this tag are treated as blogs')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.blog_tag)
                .onChange(async (value) => {
                    this.plugin.settings.blog_tag = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl).setName("site dir").setDesc("Hugo site root dir, absolute path")
            .addText(text => text.setPlaceholder("/path/to/hugo/site").setValue(this.plugin.settings.site_dir).onChange(async (value) => {
                this.plugin.settings.site_dir = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName("blog dir").setDesc("All blog copy to this dir, relative path to site")
            .addText(text => text.setPlaceholder("blog/dir").setValue(this.plugin.settings.blog_dir).onChange(async (value) => {
                this.plugin.settings.blog_dir = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName("static dir").setDesc("All static(like image) copy to static/${static dir}, like static/ob, relative path to site/static")
            .addText(text => text.setPlaceholder("static/dir").setValue(this.plugin.settings.static_dir).onChange(async (value) => {
                this.plugin.settings.static_dir = value;
                await this.plugin.saveSettings();
            }));
    }
}

export const check_setting = (setting: MyPluginSettings): boolean => {
    if (setting.blog_dir.length == 0 || setting.static_dir.length == 0 || setting.blog_tag.length == 0) {
        return false
    }
    return true;
}