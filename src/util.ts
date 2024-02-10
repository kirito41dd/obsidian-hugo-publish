import { App, TFile } from "obsidian";
import { ensureDir, copy, outputFile, emptyDir } from "fs-extra";
import * as path from 'path';
import { Text, Image, Root, Link } from 'mdast';
import { visit } from 'unist-util-visit'


// Get all blog post filted by tag
export const get_all_blog_md = async (app: App, tag: string) => {
    const files = app.vault.getMarkdownFiles();
    const blogs: TFile[] = [];
    for (let i = 0; i < files.length; i++) {
        const meta = app.metadataCache.getFileCache(files[i]);
        const tags: string[] = meta?.frontmatter?.tags;
        if (tags?.contains(tag)) {
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

export const delete_files_in_dir = async (dir: string) => {
    await ensureDir(dir);
    await emptyDir(dir);
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

// ![[xxx.png]] -> ![xxx.png](xxx.png)
export const transform_wiki_image = (ast: Root) => {
    visit(ast, 'paragraph', function (node, index, parent) {
        const new_children = [];
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (child.type == "text") {
                const text = child.value.slice(); // clone
                const regex = /!\[\[(.*?)\]\]/g;
                let match;
                let last_index = 0;
                let after_text = text.slice();
                while ((match = regex.exec(text)) != null) {
                    const link_text = match[1];
                    const image_url = link_text;

                    const before_text = text.slice(last_index, match.index);
                    after_text = text.slice(match.index + match[0].length);

                    if (before_text.length > 0) {
                        const v: Text = { type: "text", value: before_text };
                        new_children.push(v);
                    }
                    const v: Image = {
                        type: 'image',
                        url: encodeURI(image_url),
                        alt: image_url,
                        title: null
                    };
                    new_children.push(v);
                    last_index = match.index + match[0].length;

                }
                if (after_text.length > 0) {
                    const v: Text = { type: "text", value: after_text };
                    new_children.push(v);
                }
            } else {
                new_children.push(child);
            }
        }
        node.children = new_children;
        console.log("ast text:", node, index, parent);
    })
}


// [[xxx.png]] -> [xxx.png](xxx.png)
export const transform_wiki_link = (ast: Root) => {
    visit(ast, 'paragraph', function (node, index, parent) {
        const new_children = [];
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (child.type == "text") {
                const text = child.value.slice(); // clone
                const regex = /\[\[(.*?)\]\]/g;
                let match;
                let last_index = 0;
                let after_text = text.slice();
                while ((match = regex.exec(text)) != null) {
                    const link_text = match[1];
                    const image_url = link_text;

                    const before_text = text.slice(last_index, match.index);
                    after_text = text.slice(match.index + match[0].length);

                    if (before_text.length > 0) {
                        const v: Text = { type: "text", value: before_text };
                        new_children.push(v);
                    }
                    const link_txt: Text = {
                        type: "text",
                        value: image_url
                    };
                    const v: Link = {
                        type: 'link',
                        url: encodeURI(image_url),
                        title: null,
                        children: [link_txt]
                    };
                    new_children.push(v);
                    last_index = match.index + match[0].length;

                }
                if (after_text.length > 0) {
                    const v: Text = { type: "text", value: after_text };
                    new_children.push(v);
                }
            } else {
                new_children.push(child);
            }
        }
        node.children = new_children;
        console.log("ast text:", node, index, parent);
    })
}