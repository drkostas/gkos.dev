import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteMetadata } from "@/data/siteMetadata";
import { projects } from "@/data/projects";
import { publications } from "@/data/publications";

export const prerender = false;

type FeedItem = {
  title: string;
  pubDate: Date;
  description: string;
  link: string;
  categories?: string[];
};

const STREAM_KEYS = ["blog", "changelog", "publications", "projects"] as const;
type StreamKey = (typeof STREAM_KEYS)[number];

// Cap per-stream so initial-subscribe floods stay manageable.
const PER_STREAM_CAP = 20;

// Fallback date for projects that don't have `addedAt` yet. Mirrors the
// hello-world blog post date (the real site launch).
const SITE_LAUNCH = new Date("2026-04-15T12:00:00Z");

function parseIncludeParam(raw: string | null): Set<StreamKey> {
  if (raw === null) return new Set(STREAM_KEYS); // default: everything
  if (raw.trim() === "") return new Set(); // explicit empty = nothing
  const requested = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is StreamKey => (STREAM_KEYS as readonly string[]).includes(s));
  return new Set(requested);
}

function stripMarkdownLite(md: string | undefined): string {
  if (!md) return "";
  return md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/```[^\n]*\n[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .trim();
}

async function collectBlog(): Promise<FeedItem[]> {
  const posts = (await getCollection("blog"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf())
    .slice(0, PER_STREAM_CAP);
  return posts.map((post) => ({
    title: `[Blog] ${post.data.title}`,
    pubDate: post.data.publishedAt,
    description: post.data.summary,
    link: `/blog/${post.id}/`,
    categories: post.data.categories,
  }));
}

async function collectChangelog(): Promise<FeedItem[]> {
  const entries = (await getCollection("changelog"))
    .filter((e) => !e.data.draft)
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf())
    .slice(0, PER_STREAM_CAP);
  return entries.map((entry) => ({
    title: `[Changelog] ${entry.data.title}`,
    pubDate: entry.data.publishedAt,
    description: entry.data.summary || stripMarkdownLite(entry.body) || entry.data.title,
    link: `/changelog/#${entry.id}`,
  }));
}

function collectPublications(): FeedItem[] {
  return publications
    .slice(0, PER_STREAM_CAP)
    .map((pub) => ({
      title: `[Paper] ${pub.title}`,
      pubDate: pub.publishedAt || new Date(pub.year, 11, 31, 23, 59, 59),
      description: pub.abstract,
      link: pub.arxiv || pub.link || pub.code || `/publications/#${pub.slug}`,
      categories: [pub.conference],
    }));
}

function collectProjects(): FeedItem[] {
  return projects
    .slice(0, PER_STREAM_CAP)
    .map((p) => ({
      title: `[Project] ${p.name}`,
      pubDate: p.addedAt || SITE_LAUNCH,
      description: p.description,
      link: p.live || p.demo || p.source_code || `/projects/#${p.slug}`,
      categories: [p.category, ...p.tags],
    }));
}

export async function GET(context: any) {
  const url = new URL(context.request.url);
  const included = parseIncludeParam(url.searchParams.get("include"));

  const collectors: Record<StreamKey, () => Promise<FeedItem[]> | FeedItem[]> = {
    blog: collectBlog,
    changelog: collectChangelog,
    publications: collectPublications,
    projects: collectProjects,
  };

  const streams = await Promise.all(
    STREAM_KEYS.filter((k) => included.has(k)).map((k) => Promise.resolve(collectors[k]())),
  );
  const items = streams
    .flat()
    .sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  // Describe what this specific feed configuration contains so readers see
  // a meaningful description in their subscription list.
  const includedLabel = STREAM_KEYS.filter((k) => included.has(k)).join(", ") || "nothing";
  const description = `${siteMetadata.description} (Feed contents: ${includedLabel}.)`;

  return rss({
    title: siteMetadata.title,
    description,
    site: context.site || siteMetadata.siteUrl,
    items: items.map((item) => ({
      title: item.title,
      pubDate: item.pubDate,
      description: item.description,
      link: item.link,
      categories: item.categories,
    })),
  });
}
