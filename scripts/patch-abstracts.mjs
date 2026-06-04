#!/usr/bin/env node
/**
 * One-shot: take scripts/abstracts-out.json (from fetch-abstracts.mjs) and
 * insert each abstract into src/data/publications.ts as a `fullAbstract:` field.
 *
 * Idempotent: skips entries that already have a `fullAbstract` line.
 *
 * Run:  node scripts/patch-abstracts.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBS_PATH = path.join(ROOT, "src/data/publications.ts");
const ABSTRACTS_PATH = path.join(__dirname, "abstracts-out.json");

function jsonStringForTs(s) {
  // Use JSON.stringify which gives us a safely-escaped double-quoted string.
  // TS accepts JSON-escaped double-quoted strings as valid string literals.
  return JSON.stringify(s);
}

async function main() {
  const abstracts = JSON.parse(await readFile(ABSTRACTS_PATH, "utf8"));
  let src = await readFile(PUBS_PATH, "utf8");

  let patched = 0;
  let skipped = 0;
  let missing = 0;

  for (const [slug, entry] of Object.entries(abstracts)) {
    if (!entry.abstract) {
      console.log(`  - ${slug}: no abstract fetched, skip`);
      missing++;
      continue;
    }

    // Locate the entry block by slug, then find the `abstract:\n  "..."` block
    // and insert `fullAbstract:\n  "..."` after it.
    const slugMarker = `slug: "${slug}",`;
    const slugIdx = src.indexOf(slugMarker);
    if (slugIdx === -1) {
      console.warn(`  ! ${slug}: slug not found in publications.ts`);
      continue;
    }

    // Find the entry's closing brace (start of `  },` or `  }` followed by closing)
    const blockEnd = src.indexOf("\n  },", slugIdx);
    if (blockEnd === -1) {
      console.warn(`  ! ${slug}: could not find end of entry block`);
      continue;
    }
    const blockStart = slugIdx;
    const block = src.slice(blockStart, blockEnd);

    if (block.includes("fullAbstract:")) {
      console.log(`  - ${slug}: already has fullAbstract, skip`);
      skipped++;
      continue;
    }

    // Insert after the abstract's closing `,` line. Pattern: `abstract:\n      "...",\n`
    const absMatch = block.match(/(\n {4}abstract:\n {6}"[^]*?",)\n/);
    if (!absMatch) {
      console.warn(`  ! ${slug}: could not find abstract field`);
      continue;
    }
    const insertPosInBlock = absMatch.index + absMatch[1].length + 1; // right after the trailing newline
    const insertion = `    fullAbstract:\n      ${jsonStringForTs(entry.abstract)},\n`;

    const newBlock = block.slice(0, insertPosInBlock) + insertion + block.slice(insertPosInBlock);
    src = src.slice(0, blockStart) + newBlock + src.slice(blockEnd);

    console.log(`  ✓ ${slug}`);
    patched++;
  }

  await writeFile(PUBS_PATH, src);
  console.log(`\nPatched ${patched}, skipped ${skipped}, missing ${missing}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
