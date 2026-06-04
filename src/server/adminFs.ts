import { promises as fs } from "node:fs";
import path from "node:path";

/** Absolute paths to the content and image directories. */
const PROJECT_ROOT = process.cwd();
export const BLOG_CONTENT_DIR = path.join(PROJECT_ROOT, "src/content/blog");
export const BLOG_IMAGES_DIR = path.join(PROJECT_ROOT, "public/blog");

/** Slugify a human title into a filesystem-safe slug. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Reject paths containing `..`, absolute paths, or separators to prevent
 *  directory-traversal writes via crafted slugs. */
export function assertSafeSlug(slug: string) {
  if (!slug || slug.includes("..") || slug.includes("/") || slug.includes("\\") || path.isAbsolute(slug)) {
    throw new Error(`Unsafe slug: ${slug}`);
  }
}

export function assertSafeFilename(name: string) {
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\") || path.isAbsolute(name)) {
    throw new Error(`Unsafe filename: ${name}`);
  }
}

/** Build an MDX file buffer from frontmatter + body. */
export function buildMdx(frontmatter: Record<string, unknown>, body: string): string {
  // Match Astro Content Collections YAML: quote strings that need it, emit
  // ISO dates, keep arrays inline.
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const items = value.map((v) => JSON.stringify(v)).join(", ");
      lines.push(`${key}: [${items}]`);
    } else if (value instanceof Date) {
      // Drop the milliseconds + trailing Z for readability.
      lines.push(`${key}: ${value.toISOString().replace(/\.\d{3}Z$/, "")}`);
    } else if (typeof value === "string") {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---", "", body.replace(/\s+$/, ""), "");
  return lines.join("\n");
}

/** Parse a YAML-ish frontmatter block (small subset — enough for our schema). */
export function parseMdx(raw: string): { data: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const [, fm, body] = match;
  const data: Record<string, unknown> = {};
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    data[key] = parseScalar(raw.trim());
  }
  return { data, body };
}

function parseScalar(raw: string): unknown {
  if (raw === "") return "";
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  if (raw.startsWith("\"") && raw.endsWith("\"")) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  // Date detection: ISO 8601
  if (/^\d{4}-\d{2}-\d{2}([T ].+)?$/.test(raw)) return raw;
  // Number
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

export async function readPostFile(slug: string): Promise<{ data: Record<string, unknown>; body: string }> {
  assertSafeSlug(slug);
  const file = path.join(BLOG_CONTENT_DIR, `${slug}.mdx`);
  const raw = await fs.readFile(file, "utf8");
  return parseMdx(raw);
}

export async function writePostFile(slug: string, data: Record<string, unknown>, body: string): Promise<void> {
  assertSafeSlug(slug);
  const file = path.join(BLOG_CONTENT_DIR, `${slug}.mdx`);
  const out = buildMdx(data, body);
  await fs.writeFile(file, out, "utf8");
}

export async function deletePostFile(slug: string): Promise<void> {
  assertSafeSlug(slug);
  const file = path.join(BLOG_CONTENT_DIR, `${slug}.mdx`);
  await fs.unlink(file);
}

/** Ensure the image folder for a post exists and return its absolute path. */
export async function ensureImageDir(slug: string): Promise<string> {
  assertSafeSlug(slug);
  const dir = path.join(BLOG_IMAGES_DIR, slug);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

type ImageListItem = {
  slug: string;
  name: string;
  size: number;
  mtime: number;
  hasOriginal: boolean;
  meta?: { crop?: unknown; resize?: unknown; naturalSize?: unknown };
};

/** List image files for a post's folder, or all folders if slug is omitted. */
export async function listImages(slug?: string): Promise<ImageListItem[]> {
  if (slug) assertSafeSlug(slug);
  const root = BLOG_IMAGES_DIR;
  const out: ImageListItem[] = [];

  const scanFolder = async (folderSlug: string) => {
    const dir = path.join(root, folderSlug);
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return;
    }
    const originalSet = new Set(
      entries
        .filter((n) => n.startsWith(".original-"))
        .map((n) => n.slice(".original-".length)),
    );
    const metaSet = new Set(
      entries
        .filter((n) => n.startsWith(".meta-") && n.endsWith(".json"))
        .map((n) => n.slice(".meta-".length, -".json".length)),
    );
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      const full = path.join(dir, name);
      const stat = await fs.stat(full);
      if (!stat.isFile()) continue;
      if (!/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(name)) continue;
      let meta: ImageListItem["meta"];
      if (metaSet.has(name)) {
        try {
          const raw = await fs.readFile(path.join(dir, `.meta-${name}.json`), "utf8");
          meta = JSON.parse(raw);
        } catch {
          meta = undefined;
        }
      }
      out.push({
        slug: folderSlug,
        name,
        size: stat.size,
        mtime: stat.mtimeMs,
        hasOriginal: originalSet.has(name),
        meta,
      });
    }
  };

  if (slug) {
    await scanFolder(slug);
  } else {
    let folders: string[] = [];
    try {
      folders = await fs.readdir(root);
    } catch {
      return out;
    }
    for (const folder of folders) {
      if (folder.startsWith(".")) continue;
      const stat = await fs.stat(path.join(root, folder));
      if (stat.isDirectory()) await scanFolder(folder);
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}
