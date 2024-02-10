# Hugo Publish

This plugin helps you publish hugo blog through obsidian.

## Features
This plugin will convert the `.md` file and related images in obsidian to the hugo site dir.

Conversion includes:
- `[[link.com]]` -> `[link.com](link.com)`
- `[[xxx.png]]` -> `![xxx.png](/${static_dir}/xx.png)`
- Auto write md's yaml header like: title,date,lastmod 

## How to use

1. Complete the plugin settings: `blog_tag`,`hugo_site`...
2. Set `tags` in obsidian's md as `${blog_tag}`
3. Click `hugo sync` button or run cmd `Hugo Publish: Sync blog`
4. Enter the hugo site dir to run `hugo server` to check it

