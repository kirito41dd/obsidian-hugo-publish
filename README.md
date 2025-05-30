# Hugo Publish

The plugin designed to streamline publishing your Hugo blog directly from your Obsidian vault. Plugin scans your Obsidian vault and picks notes that include a tag specified in the plugin configuration. Only notes with the specified tag are exported.

## Features
It converts your `.md` files and related images from Obsidian note into your Hugo site directory.

Support following features
- Existing headers isn't modified
- Internal Obsidian links like `[[link.com]]` are converted to `[link.com](link.com)`
- Image links such as `[[xxx.png]]` are converted to `![xxx.png](/${static_dir}/xx.png)`
- Support exporting content as Hugo page bundles

## How to use

1. Complete the plugin settings: `Blog tag` with tag you like say `hugo`
2. Set `tags` in obsidian's md as as `hugo`
3. Click `hugo sync` button or run cmd `Hugo Publish: Sync blog`
4. Enter the hugo site dir to run `hugo server` to check it
