/**
 * arXiv preprint lookup.
 *
 * arXiv has a free public API that returns Atom XML. We use it to find the
 * arXiv URL for each publication by title at build time, so the Publications
 * page automatically picks up arXiv links without us hand-coding them.
 *
 * Rate limiting: arXiv asks clients to wait ~3s between requests. We respect
 * this with a sequential queue. Failures are silent — if a paper isn't on
 * arXiv we just skip it and the page renders without the link.
 *
 * Author verification: matches the same /Georgiou|Γεωργ/i pattern used in
 * citations.ts so we don't accept high-ranking results from unrelated authors.
 */

const ARXIV_API = "http://export.arxiv.org/api/query";
const REQUEST_DELAY_MS = 3500; // arXiv recommends ≥3s between requests
const AUTHOR_VERIFY_PATTERN = /Georgiou|Γεωργ/i;

export interface ArxivPaper {
  id: string; // e.g. "2308.16258"
  url: string; // e.g. "https://arxiv.org/abs/2308.16258"
  title: string;
  authors: string[];
  publishedDate: string; // ISO
  abstract: string;
}

// Module-scoped cache: lookups are expensive (network + 3.5s wait per call),
// so we memoize the result for the lifetime of the build process.
const cache = new Map<string, ArxivPaper | null>();

// ----------------------------------------------------------------------------
// XML parsing helpers — arXiv's Atom feed is stable enough to regex
// ----------------------------------------------------------------------------

function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractEntries(xml: string): string[] {
  const matches: string[] = [];
  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

function extractTag(entry: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = re.exec(entry);
  return m ? unescapeXml(m[1].trim()) : null;
}

function extractAuthors(entry: string): string[] {
  const authors: string[] = [];
  const re = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(entry)) !== null) {
    authors.push(unescapeXml(m[1].trim()));
  }
  return authors;
}

function parseEntry(entry: string): ArxivPaper | null {
  const idUrl = extractTag(entry, "id");
  const title = extractTag(entry, "title");
  const published = extractTag(entry, "published");
  if (!idUrl || !title) return null;

  // arXiv id URL format: http://arxiv.org/abs/2308.16258v1
  // Strip the "vN" suffix to get the canonical ID
  const idMatch = idUrl.match(/arxiv\.org\/abs\/([^v\s]+)/i);
  if (!idMatch) return null;
  const id = idMatch[1];

  const summary = extractTag(entry, "summary");
  return {
    id,
    url: `https://arxiv.org/abs/${id}`,
    title: title.replace(/\s+/g, " "),
    authors: extractAuthors(entry),
    publishedDate: published ?? "",
    abstract: (summary ?? "").replace(/\s+/g, " ").trim(),
  };
}

// ----------------------------------------------------------------------------
// Direct lookup by arXiv ID (faster — skips title-search ranking)
// ----------------------------------------------------------------------------

const idCache = new Map<string, ArxivPaper | null>();

export async function getArxivById(id: string): Promise<ArxivPaper | null> {
  if (idCache.has(id)) return idCache.get(id)!;
  await rateLimit();
  const url = `${ARXIV_API}?id_list=${encodeURIComponent(id)}`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "gkos.dev portfolio (kgeorgio@vols.utk.edu)" },
    });
    if (!response.ok) {
      idCache.set(id, null);
      return null;
    }
    const xml = await response.text();
    const entries = extractEntries(xml);
    const parsed = entries.map(parseEntry).find((p): p is ArxivPaper => p !== null) ?? null;
    idCache.set(id, parsed);
    return parsed;
  } catch (error) {
    console.warn(`[arxiv] id-fetch failed for "${id}":`, error);
    idCache.set(id, null);
    return null;
  }
}

/** Extract the bare ID from a URL like https://arxiv.org/abs/2308.16258v1 */
export function arxivIdFromUrl(url: string): string | null {
  const m = url.match(/arxiv\.org\/abs\/([^v\s/?#]+)/i);
  return m ? m[1] : null;
}

// ----------------------------------------------------------------------------
// Title similarity scoring — same approach as citations.ts
// ----------------------------------------------------------------------------

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTitleMatch(query: string, candidate: string): number {
  const q = normalizeTitle(query);
  const c = normalizeTitle(candidate);
  if (q === c) return 100;
  const qWords = new Set(q.split(" "));
  const cWords = new Set(c.split(" "));
  const intersection = [...qWords].filter((w) => cWords.has(w)).length;
  const union = new Set([...qWords, ...cWords]).size;
  return Math.round((intersection / union) * 100);
}

function hasGeorgiouAuthor(authors: string[]): boolean {
  return authors.some((name) => AUTHOR_VERIFY_PATTERN.test(name));
}

// ----------------------------------------------------------------------------
// Sequential request queue — respects arXiv's rate limit
// ----------------------------------------------------------------------------

let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const since = Date.now() - lastRequestTime;
  if (since < REQUEST_DELAY_MS) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS - since));
  }
  lastRequestTime = Date.now();
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export async function getArxivByTitle(title: string): Promise<ArxivPaper | null> {
  if (cache.has(title)) return cache.get(title)!;

  await rateLimit();

  // Query format: ti:"<title>" matches paper titles. Quote the title and
  // strip quotes/special chars that would break the query syntax.
  const cleanTitle = title.replace(/["']/g, "");
  const params = new URLSearchParams({
    search_query: `ti:"${cleanTitle}"`,
    max_results: "5",
    sortBy: "relevance",
  });
  const url = `${ARXIV_API}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "gkos.dev portfolio (kgeorgio@vols.utk.edu)" },
    });
    if (!response.ok) {
      console.warn(`[arxiv] ${response.status} for "${title}"`);
      cache.set(title, null);
      return null;
    }

    const xml = await response.text();
    const entries = extractEntries(xml);
    const candidates = entries.map(parseEntry).filter((p): p is ArxivPaper => p !== null);

    // Find the best title match that also has an author named Georgiou
    let best: ArxivPaper | null = null;
    let bestScore = 0;
    for (const candidate of candidates) {
      const score = scoreTitleMatch(title, candidate.title);
      if (score >= 60 && hasGeorgiouAuthor(candidate.authors) && score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    cache.set(title, best);
    return best;
  } catch (error) {
    console.warn(`[arxiv] fetch failed for "${title}":`, error);
    cache.set(title, null);
    return null;
  }
}

/**
 * Batch lookup. Sequential because arXiv rate-limits per IP, not per request.
 * Returns a Map keyed by the input title (so you can look up by your own data).
 */
export async function getArxivByTitles(titles: string[]): Promise<Map<string, ArxivPaper>> {
  const result = new Map<string, ArxivPaper>();
  for (const title of titles) {
    const paper = await getArxivByTitle(title);
    if (paper) result.set(title, paper);
  }
  return result;
}
