#!/usr/bin/env node
/**
 * Scaffold a new blog post MDX + image folder.
 *   npm run new-post "Your Title Here"
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const title = process.argv.slice(2).join(" ").trim();
if (!title) {
  console.error(`Usage: npm run new-post "Your Title Here"`);
  process.exit(1);
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const slug = slugify(title);
const root = process.cwd();
const mdxPath = path.join(root, "src/content/blog", `${slug}.mdx`);
const imgDir = path.join(root, "public/blog", slug);

try {
  await fs.access(mdxPath);
  console.error(`Post already exists: ${mdxPath}`);
  process.exit(1);
} catch {
  // doesn't exist — good
}

const now = new Date().toISOString().replace(/\.\d{3}Z$/, "");

const mdx = `---
title: ${JSON.stringify(title)}
publishedAt: ${now}
summary: ""
imageName: ""
categories: []
draft: true
---

Write your post here.
`;

await fs.mkdir(path.dirname(mdxPath), { recursive: true });
await fs.writeFile(mdxPath, mdx, "utf8");
await fs.mkdir(imgDir, { recursive: true });

console.log(`✓ Created ${path.relative(root, mdxPath)}`);
console.log(`✓ Created ${path.relative(root, imgDir)}/`);
console.log(`\nEdit at http://localhost:4321/admin/blog/${slug}`);
