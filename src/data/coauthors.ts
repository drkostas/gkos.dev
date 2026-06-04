// Recurring co-authors across papers. Source of truth: scripts/fetch-coauthors.mjs
// aggregates author lists from OpenAlex per-paper and counts shared papers.
// Filter: ≥2 shared papers.
//
// URLs default to OpenAlex profile pages (stable, always work). Override with a
// verified Scholar / personal site URL where available — that wins.
//
// To refresh after adding new papers: `node scripts/fetch-coauthors.mjs`, then
// hand-merge updated counts and openalexIds into this file.

export type Coauthor = {
  name: string;
  /** Short label rendered under the name (e.g. "PhD Advisor", "AICIP Lab"). */
  role: string;
  /** Public profile URL — Scholar / personal site / OpenAlex. */
  url?: string;
  /** Number of co-authored papers (rendered if shown). */
  papersTogether?: number;
};

// Scholar user IDs scraped from Kostas's own Scholar co-author panel via Playwright.
// Cody Champion isn't on Scholar — falls back to a name-search URL.
function scholarProfile(userId: string): string {
  return `https://scholar.google.com/citations?user=${userId}&hl=en`;
}
function scholarSearch(name: string): string {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(`author:"${name}"`)}`;
}

export const COAUTHORS: Coauthor[] = [
  {
    name: "Hairong Qi",
    role: "PhD Advisor, UTK",
    url: scholarProfile("GqnNG-kAAAAJ"),
    papersTogether: 6,
  },
  {
    name: "Maofeng Tang",
    role: "AICIP Lab, UTK",
    url: scholarProfile("bvm91UoAAAAJ"),
    papersTogether: 5,
  },
  {
    name: "Cody Champion",
    role: "Research collaborator",
    url: scholarSearch("Cody Champion"),
    papersTogether: 3,
  },
  {
    name: "Marc Bosch",
    role: "Research collaborator",
    url: scholarProfile("mjlhwZEAAAAJ"),
    papersTogether: 3,
  },
  {
    name: "Fanqi Wang",
    role: "AICIP Lab, UTK",
    url: scholarProfile("oButXDgAAAAJ"),
    papersTogether: 2,
  },
  {
    name: "Weisheng Tang",
    role: "AICIP Lab, UTK",
    url: scholarProfile("CKxchGcAAAAJ"),
    papersTogether: 2,
  },
];
