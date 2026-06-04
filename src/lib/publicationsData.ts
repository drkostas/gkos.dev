import { publications, isTier1 } from "@/data/publications";
import { getCitationsByTitles } from "@/lib/citations";

export type EnrichedPublication = (typeof publications)[number] & {
  citations: number;
};

export async function getPublications() {
  const liveCitations = await getCitationsByTitles(
    publications.map((p) => p.title),
  );

  const enriched: EnrichedPublication[] = publications.map((p) => ({
    ...p,
    citations: Math.max(liveCitations.get(p.title)?.citationCount ?? 0, p.citations),
  }));

  const byYear = enriched.reduce<Record<number, EnrichedPublication[]>>(
    (acc, pub) => {
      if (!acc[pub.year]) acc[pub.year] = [];
      acc[pub.year].push(pub);
      return acc;
    },
    {},
  );
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  return { enriched, byYear, years, isTier1 };
}
