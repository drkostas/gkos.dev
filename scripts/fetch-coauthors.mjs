#!/usr/bin/env node
/**
 * One-shot: pull co-authors from OpenAlex for every paper in src/data/publications.ts.
 *
 * For each paper, query OpenAlex by title (with author verification), extract the
 * authorship list, and aggregate across all papers. Filter to co-authors who
 * appear on ≥2 papers, drop Kostas himself.
 *
 * Output: scripts/coauthors-out.json
 *   [{ name, papersTogether, papers: [paperTitle, ...] }]
 *
 * Run:  node scripts/fetch-coauthors.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLICATIONS_PATH = path.join(ROOT, "src/data/publications.ts");
const OUT_PATH = path.join(__dirname, "coauthors-out.json");

const AUTHOR_VERIFY = /Georgiou|Γεωργ/i;
const MIN_PAPERS = 2;

function normalizeTitle(s) {
  return s.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

async function searchOpenAlex(title) {
  const query = encodeURIComponent(title.slice(0, 200));
  const url = `https://api.openalex.org/works?search=${query}&per-page=5&select=title,authorships,primary_location`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "gkos-portfolio/1.0 (mailto:gkos.mldev@gmail.com)",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const wanted = normalizeTitle(title);

  const scored = (data.results ?? []).map((work) => {
    const workTitle = normalizeTitle(work.title ?? "");
    const authors = (work.authorships ?? []).map((a) => ({
      name: a.author?.display_name ?? "",
      id: a.author?.id ?? "",
    }));
    const hasAuthor = authors.some((a) => AUTHOR_VERIFY.test(a.name));
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
  return { authors: best.authors, sourceTitle: best.work.title };
}

async function main() {
  const src = await readFile(PUBLICATIONS_PATH, "utf8");

  // Parse out { slug, title } from publications.ts source.
  const entries = [];
  const re = /slug:\s*"([^"]+)",\s*\n\s*title:\s*("|')([\s\S]*?)\2,\s*\n\s*year:/g;
  let m;
  while ((m = re.exec(src))) {
    const slug = m[1];
    const title = m[3].replace(/\s+/g, " ").trim().replace(/\\"/g, '"');
    entries.push({ slug, title });
  }

  console.log(`Found ${entries.length} papers in publications.ts`);

  // Aggregate: { authorName -> { papers: Set<title>, displayName } }
  const aggregate = new Map();
  for (const { title } of entries) {
    console.log(`\n→ "${title.slice(0, 60)}…"`);
    const result = await searchOpenAlex(title);
    if (!result) {
      console.log(`   ✗ no match`);
      continue;
    }
    console.log(`   authors: ${result.authors.map((a) => a.name).join(", ")}`);
    for (const author of result.authors) {
      if (AUTHOR_VERIFY.test(author.name)) continue;
      if (!aggregate.has(author.name)) {
        aggregate.set(author.name, { papers: new Set(), id: author.id });
      }
      aggregate.get(author.name).papers.add(title);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const out = [...aggregate.entries()]
    .map(([name, info]) => ({
      name,
      openalexId: info.id ? info.id.replace("https://openalex.org/", "") : null,
      papersTogether: info.papers.size,
      papers: [...info.papers],
    }))
    .filter((c) => c.papersTogether >= MIN_PAPERS)
    .sort((a, b) => b.papersTogether - a.papersTogether);

  await writeFile(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\n✓ wrote ${OUT_PATH}`);
  console.log(`  ${out.length} co-authors with ≥${MIN_PAPERS} shared papers`);
  for (const c of out) {
    console.log(`    ${c.papersTogether.toString().padStart(2)} — ${c.name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
