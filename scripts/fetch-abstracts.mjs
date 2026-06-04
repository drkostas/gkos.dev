#!/usr/bin/env node
/**
 * One-shot: pull abstracts from OpenAlex for every paper in src/data/publications.ts.
 *
 * OpenAlex stores abstracts as an inverted index ({word: [positions]}); we reconstruct
 * the full text from that. Falls back to nothing if the paper isn't indexed.
 *
 * Output: scripts/abstracts-out.json — { [slug]: { title, abstract, sourceTitle } }
 *
 * Run:  node scripts/fetch-abstracts.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLICATIONS_PATH = path.join(ROOT, "src/data/publications.ts");
const OUT_PATH = path.join(__dirname, "abstracts-out.json");

const AUTHOR_VERIFY = /Georgiou|Γεωργ/i;

function normalizeTitle(s) {
  return s.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== "object") return null;
  const positions = [];
  for (const [word, idxs] of Object.entries(invertedIndex)) {
    for (const i of idxs) positions[i] = word;
  }
  const text = positions.filter(Boolean).join(" ").trim();
  return text || null;
}

async function searchOpenAlex(title) {
  const query = encodeURIComponent(title.slice(0, 200));
  const url = `https://api.openalex.org/works?search=${query}&per-page=5&select=title,abstract_inverted_index,authorships`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "gkos-portfolio/1.0 (mailto:gkos.mldev@gmail.com)",
    },
  });
  if (!res.ok) {
    console.warn(`  [openalex] ${res.status} on "${title}"`);
    return null;
  }
  const data = await res.json();
  const results = data.results ?? [];
  const wanted = normalizeTitle(title);

  const scored = results.map((work) => {
    const workTitle = normalizeTitle(work.title ?? "");
    const authors = (work.authorships ?? []).map((a) => a.author?.display_name ?? "");
    const hasAuthor = authors.some((n) => AUTHOR_VERIFY.test(n));
    let titleScore = 0;
    if (workTitle === wanted) titleScore = 100;
    else if (workTitle.includes(wanted) || wanted.includes(workTitle)) titleScore = 80;
    else {
      const a = new Set(wanted.split(" "));
      const b = new Set(workTitle.split(" "));
      const shared = [...a].filter((t) => b.has(t)).length;
      titleScore = (shared / Math.max(a.size, b.size)) * 60;
    }
    return { work, authors, score: titleScore + (hasAuthor ? 50 : 0), hasAuthor };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || !best.hasAuthor || best.score < 50) return null;
  const abstract = reconstructAbstract(best.work.abstract_inverted_index);
  if (!abstract) return null;
  return { title: best.work.title, abstract, score: best.score };
}

async function main() {
  const src = await readFile(PUBLICATIONS_PATH, "utf8");

  // Parse out { slug: ..., title: ... } pairs from the TS source.
  // Quick & dirty: works because publications.ts is hand-written with stable formatting.
  const entries = [];
  const re = /slug:\s*"([^"]+)",\s*\n\s*title:\s*("|')([\s\S]*?)\2,\s*\n\s*year:/g;
  let m;
  while ((m = re.exec(src))) {
    const slug = m[1];
    let title = m[3].replace(/\s+/g, " ").trim();
    // Handle the ' wrapped JSON-style title for "Adding a teaching..."
    title = title.replace(/\\"/g, '"');
    entries.push({ slug, title });
  }

  console.log(`Found ${entries.length} papers in publications.ts`);
  const out = {};
  for (const { slug, title } of entries) {
    console.log(`\n→ ${slug}`);
    console.log(`   "${title}"`);
    const result = await searchOpenAlex(title);
    if (result) {
      out[slug] = { title, sourceTitle: result.title, score: result.score, abstract: result.abstract };
      console.log(`   ✓ ${result.abstract.slice(0, 100)}…`);
    } else {
      out[slug] = { title, abstract: null };
      console.log(`   ✗ no match`);
    }
    // Be polite — OpenAlex says polite-pool can do 10/sec, but we don't need to spam
    await new Promise((r) => setTimeout(r, 250));
  }

  await writeFile(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\n✓ wrote ${OUT_PATH}`);
  const found = Object.values(out).filter((v) => v.abstract).length;
  console.log(`  ${found}/${entries.length} abstracts found`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
