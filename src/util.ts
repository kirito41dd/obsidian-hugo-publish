import { App, TFile } from "obsidian";
import { ensureDir, copy, outputFile } from "fs-extra";
import * as path from 'path';

// Get all blog post filted by tag
export const get_all_blog_md = async (app: App, tag: string) => {
    const files = app.vault.getMarkdownFiles();
    const blogs: TFile[] = [];
    for (let i = 0; i < files.length; i++) {
        const meta = app.metadataCache.getFileCache(files[i]);
        const tags: string[] = meta?.frontmatter?.tags;
        if (tags.contains(tag)) {
            blogs.push(files[i])
        }
    }
    return blogs;
}

export const copy_file = async (src: string, dst: string) => {
    await ensureDir(path.dirname(dst));
    await copy(src, dst);
}

export const write_md = async (file_path: string, header: string, body: string) => {
    await outputFile(file_path, "---\n" + header + "---\n" + body);
}

// parse md content, return yaml header and left content without header
export const get_md_yaml_hader_from_content = (content: string): [string, string] => {
    const lines = content.split('\n');
    if (lines.length == 0) {
        return ["", content];
    }

    let i = 0;
    let st = -1;
    let ed = -1;
    for (; i < lines.length - 1; i++) {
        const row = lines[i];
        if (row.trim() === '---') {
            if (st < 0) {
                st = i;
            } else {
                ed = i;
                break;
            }
        }
    }
    // has hader
    if (ed > st) {
        let header = "";
        let body = "";
        for (let i = st + 1; i < ed; i++) {
            header += lines[i];
            header += '\n';
        }
        for (let i = ed + 1; i < lines.length; i++) {
            body += lines[i];
            body += "\n";
        }
        return [header, body]
    } else {
        // no hefader
        return ["", content]
    }
}
