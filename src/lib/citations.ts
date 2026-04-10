/**
 * Citation helpers for live paper metrics.
 *
 * Primary source: OpenAlex (free, no auth, generous rate limits, better coverage).
 * Fallback: Semantic Scholar (free, no auth, 100 req/5min unauthenticated).
 *
 * Used at build time to replace hardcoded citation counts in publications.ts
 * with live numbers from the literature databases.
 */

export interface PaperStats {
  title: string;
  year: number | null;
  citationCount: number;
  venue: string | null;
  doi: string | null;
  openAccessUrl: string | null;
  externalUrl: string | null;
  authors: string[];
}

// Name pattern to verify a matched paper actually belongs to Kostas.
// Covers Latin + Greek script variants ("Konstantinos Georgiou", "Kostas Georgiou",
// "K. Georgiou", "Κωνσταντίνος Γεωργίου").
const AUTHOR_VERIFY_PATTERN = /Georgiou|Γεωργ/i;

// Shared module-scoped cache for both sources.
type CacheEntry<T> = { value: T; expires: number };
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours — citations move slowly

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T): void {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

async function fetchJson<T = any>(url: string, source: string): Promise<T | null> {
  const cacheKey = `${source}:${url}`;
  const cached = getCached<T>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        // OpenAlex asks for a polite-pool email header for higher rate limits
        "User-Agent": "gkos-portfolio/1.0 (mailto:gkos.mldev@gmail.com)",
      },
    });
    if (!response.ok) {
      console.warn(`[${source}] ${response.status} on ${url}`);
      setCached(cacheKey, null);
      return null;
    }
    const data = (await response.json()) as T;
    setCached(cacheKey, data);
    return data;
  } catch (error) {
    console.warn(`[${source}] failed ${url}:`, error);
    setCached(cacheKey, null);
    return null;
  }
}

// ============================================================================
// OpenAlex — primary source
// ============================================================================

const OPENALEX_BASE = "https://api.openalex.org";

/**
 * Fetch an OpenAlex author record by OpenAlex ID or ORCID.
 * If you don't know the ID, look it up at https://openalex.org/authors/search
 */
export async function getOpenAlexAuthor(
  authorId: string,
): Promise<{ id: string; name: string; citedByCount: number; worksCount: number } | null> {
  const data = await fetchJson<Record<string, any>>(
    `${OPENALEX_BASE}/authors/${authorId}`,
    "openalex",
  );
  if (!data) return null;

  return {
    id: data.id ?? authorId,
    name: data.display_name ?? "",
    citedByCount: data.cited_by_count ?? 0,
    worksCount: data.works_count ?? 0,
  };
}

/**
 * Fetch all works (papers) by an OpenAlex author with citation counts.
 */
export async function getOpenAlexWorks(
  authorId: string,
  perPage = 100,
): Promise<PaperStats[]> {
  const data = await fetchJson<{ results: Array<Record<string, any>> }>(
    `${OPENALEX_BASE}/works?filter=author.id:${authorId}&per-page=${perPage}&select=title,publication_year,cited_by_count,primary_location,doi,open_access,authorships`,
    "openalex",
  );
  if (!data || !Array.isArray(data.results)) return [];

  return data.results.map((work) => ({
    title: work.title ?? "",
    year: work.publication_year ?? null,
    citationCount: work.cited_by_count ?? 0,
    venue: work.primary_location?.source?.display_name ?? null,
    doi: work.doi ?? null,
    openAccessUrl: work.open_access?.oa_url ?? null,
    externalUrl: work.primary_location?.landing_page_url ?? null,
    authors: (work.authorships ?? []).map(
      (a: Record<string, any>) => a.author?.display_name ?? "",
    ),
  }));
}

// ============================================================================
// Semantic Scholar — fallback source
// ============================================================================

const SEMANTIC_SCHOLAR_BASE = "https://api.semanticscholar.org/graph/v1";

/**
 * Fetch a Semantic Scholar author's aggregated stats.
 * Author ID format: numeric (e.g. "1234567") — find yours at semanticscholar.org
 */
export async function getSemanticScholarAuthor(
  authorId: string,
): Promise<{ id: string; name: string; citationCount: number; paperCount: number; hIndex: number } | null> {
  const data = await fetchJson<Record<string, any>>(
    `${SEMANTIC_SCHOLAR_BASE}/author/${authorId}?fields=name,citationCount,paperCount,hIndex`,
    "semantic-scholar",
  );
  if (!data) return null;

  return {
    id: data.authorId ?? authorId,
    name: data.name ?? "",
    citationCount: data.citationCount ?? 0,
    paperCount: data.paperCount ?? 0,
    hIndex: data.hIndex ?? 0,
  };
}

/**
 * Fetch all papers by a Semantic Scholar author with per-paper citation counts.
 */
export async function getSemanticScholarPapers(
  authorId: string,
  limit = 100,
): Promise<PaperStats[]> {
  const data = await fetchJson<{ data: Array<Record<string, any>> }>(
    `${SEMANTIC_SCHOLAR_BASE}/author/${authorId}/papers?fields=title,year,citationCount,venue,externalIds,openAccessPdf&limit=${limit}`,
    "semantic-scholar",
  );
  if (!data || !Array.isArray(data.data)) return [];

  return data.data.map((paper) => ({
    title: paper.title ?? "",
    year: paper.year ?? null,
    citationCount: paper.citationCount ?? 0,
    venue: paper.venue ?? null,
    doi: paper.externalIds?.DOI ?? null,
    openAccessUrl: paper.openAccessPdf?.url ?? null,
    externalUrl: null,
    authors: [],
  }));
}

// ============================================================================
// Per-paper title lookup — avoids the author disambiguation problem entirely
// by searching for each paper individually and taking the best title match.
// ============================================================================

/**
 * Search OpenAlex for a single paper by title, returning the citation count
 * of the best match. Only returns a result if at least one author's name
 * matches AUTHOR_VERIFY_PATTERN — this rejects false positives where the
 * search landed on an unrelated high-ranking paper because the real paper
 * isn't indexed (e.g. under-review preprints).
 */
export async function getPaperByTitle(title: string): Promise<PaperStats | null> {
  const query = encodeURIComponent(title.slice(0, 200));
  const data = await fetchJson<{ results: Array<Record<string, any>> }>(
    `${OPENALEX_BASE}/works?search=${query}&per-page=5&select=title,publication_year,cited_by_count,primary_location,doi,open_access,authorships`,
    "openalex",
  );
  if (!data || !Array.isArray(data.results) || data.results.length === 0) return null;

  const wanted = normalizeTitle(title);
  const scored = data.results
    .map((work) => {
      const workTitle = normalizeTitle(work.title ?? "");
      const authors: string[] = (work.authorships ?? []).map(
        (a: Record<string, any>) => a.author?.display_name ?? "",
      );
      const hasAuthor = authors.some((name) => AUTHOR_VERIFY_PATTERN.test(name));
      if (!workTitle) return { work, authors, score: 0, hasAuthor };

      let titleScore = 0;
      if (workTitle === wanted) titleScore = 100;
      else if (workTitle.includes(wanted) || wanted.includes(workTitle)) titleScore = 80;
      else {
        // Cheap Jaccard on tokens
        const a = new Set(wanted.split(" "));
        const b = new Set(workTitle.split(" "));
        const shared = [...a].filter((t) => b.has(t)).length;
        titleScore = (shared / Math.max(a.size, b.size)) * 60;
      }

      // Bonus for matching author — this is the decisive factor that rejects
      // unrelated high-ranking papers with similar keywords.
      const score = titleScore + (hasAuthor ? 50 : 0);
      return { work, authors, score, hasAuthor };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  // Require both a reasonable title match AND author verification.
  if (!best || !best.hasAuthor || best.score < 50) return null;

  const work = best.work;
  return {
    title: work.title ?? title,
    year: work.publication_year ?? null,
    citationCount: work.cited_by_count ?? 0,
    venue: work.primary_location?.source?.display_name ?? null,
    doi: work.doi ?? null,
    openAccessUrl: work.open_access?.oa_url ?? null,
    externalUrl: work.primary_location?.landing_page_url ?? null,
    authors: best.authors,
  };
}

/**
 * Search Semantic Scholar for a single paper by title. Used as a fallback
 * when OpenAlex doesn't index the paper (common for arXiv preprints).
 * Same author verification as OpenAlex.
 */
export async function getPaperByTitleSemanticScholar(
  title: string,
): Promise<PaperStats | null> {
  const query = encodeURIComponent(title.slice(0, 200));
  const data = await fetchJson<{ data: Array<Record<string, any>> }>(
    `${SEMANTIC_SCHOLAR_BASE}/paper/search?query=${query}&limit=5&fields=title,year,citationCount,authors,venue,externalIds,openAccessPdf`,
    "semantic-scholar",
  );
  if (!data || !Array.isArray(data.data) || data.data.length === 0) return null;

  const wanted = normalizeTitle(title);
  const scored = data.data
    .map((paper) => {
      const paperTitle = normalizeTitle(paper.title ?? "");
      const authors: string[] = (paper.authors ?? []).map(
        (a: Record<string, any>) => a.name ?? "",
      );
      const hasAuthor = authors.some((name) => AUTHOR_VERIFY_PATTERN.test(name));
      if (!paperTitle) return { paper, authors, score: 0, hasAuthor };

      let titleScore = 0;
      if (paperTitle === wanted) titleScore = 100;
      else if (paperTitle.includes(wanted) || wanted.includes(paperTitle)) titleScore = 80;
      else {
        const a = new Set(wanted.split(" "));
        const b = new Set(paperTitle.split(" "));
        const shared = [...a].filter((t) => b.has(t)).length;
        titleScore = (shared / Math.max(a.size, b.size)) * 60;
      }
      const score = titleScore + (hasAuthor ? 50 : 0);
      return { paper, authors, score, hasAuthor };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || !best.hasAuthor || best.score < 50) return null;

  const paper = best.paper;
  return {
    title: paper.title ?? title,
    year: paper.year ?? null,
    citationCount: paper.citationCount ?? 0,
    venue: paper.venue ?? null,
    doi: paper.externalIds?.DOI ?? null,
    openAccessUrl: paper.openAccessPdf?.url ?? null,
    externalUrl: null,
    authors: best.authors,
  };
}

/**
 * Fetch live citation counts for a list of static papers by title.
 * Tries OpenAlex first, then Semantic Scholar as fallback for anything
 * OpenAlex doesn't return. Both are free public APIs.
 * Returns a Map keyed by the original static title → live PaperStats (or null).
 */
export async function getCitationsByTitles(
  titles: string[],
): Promise<Map<string, PaperStats | null>> {
  const entries = await Promise.all(
    titles.map(async (title) => {
      // Try OpenAlex first
      const openAlexResult = await getPaperByTitle(title);
      if (openAlexResult) return [title, openAlexResult] as const;

      // Fall back to Semantic Scholar
      const ssResult = await getPaperByTitleSemanticScholar(title);
      return [title, ssResult] as const;
    }),
  );
  return new Map(entries);
}

// ============================================================================
// Matching — fuzzy title matcher so we can update static `publications.ts`
// with live citation counts without manually mapping every paper.
// ============================================================================

/**
 * Normalize a paper title for fuzzy matching: lowercase, strip punctuation,
 * collapse whitespace, remove common stop words that don't distinguish titles.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find a live paper that matches a static paper's title.
 * Uses a substring match on normalized titles as a cheap but effective heuristic
 * for academic papers (where titles are usually unique and specific).
 */
export function matchPaper(
  staticTitle: string,
  livePapers: PaperStats[],
): PaperStats | null {
  const staticNormalized = normalizeTitle(staticTitle);
  if (!staticNormalized) return null;

  // Exact match first
  const exact = livePapers.find(
    (p) => normalizeTitle(p.title) === staticNormalized,
  );
  if (exact) return exact;

  // Substring match: one contains the other (handles different title casings,
  // punctuation variants, "A: B" vs "A B" formatting, etc.)
  const substring = livePapers.find((p) => {
    const liveNormalized = normalizeTitle(p.title);
    if (!liveNormalized) return false;
    return (
      staticNormalized.includes(liveNormalized) ||
      liveNormalized.includes(staticNormalized)
    );
  });
  return substring ?? null;
}
