import { describe, it, expect } from "vitest";
import {
  fetchPypiStats,
  formatPypiDialog,
  getPypiDialog,
  PYPI_FALLBACK_LINES,
} from "@/game/npcs/live/pypi";

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("Live NPC — PyPI Expert", () => {
  describe("fetchPypiStats", () => {
    it("parses well-formed stats", async () => {
      const fakeFetch: typeof fetch = async () =>
        ok({ totalDownloads: 2_500_000, packageCount: 7 });
      const s = await fetchPypiStats(fakeFetch);
      expect(s?.totalDownloads).toBe(2_500_000);
      expect(s?.packageCount).toBe(7);
    });

    it("null on network error", async () => {
      const fakeFetch: typeof fetch = async () => {
        throw new Error("offline");
      };
      expect(await fetchPypiStats(fakeFetch)).toBeNull();
    });

    it("null on 503", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("unavail", { status: 503 });
      expect(await fetchPypiStats(fakeFetch)).toBeNull();
    });

    it("null when totalDownloads missing", async () => {
      const fakeFetch: typeof fetch = async () => ok({ packageCount: 5 });
      expect(await fetchPypiStats(fakeFetch)).toBeNull();
    });
  });

  describe("formatPypiDialog", () => {
    it("formats millions with M suffix", () => {
      const lines = formatPypiDialog({ totalDownloads: 2_500_000, packageCount: 7 });
      expect(lines.join(" ")).toContain("2.5M");
      expect(lines.join(" ")).toContain("7 PyPI packages");
    });
    it("formats thousands with K suffix", () => {
      const lines = formatPypiDialog({ totalDownloads: 15_000, packageCount: 3 });
      expect(lines.join(" ")).toContain("15K");
    });
    it("raw number under 1000", () => {
      const lines = formatPypiDialog({ totalDownloads: 500, packageCount: 1 });
      expect(lines.join(" ")).toContain("500");
    });
  });

  describe("getPypiDialog combined", () => {
    it("fallback on failure", async () => {
      const fakeFetch: typeof fetch = async () => {
        throw new Error("err");
      };
      expect(await getPypiDialog(fakeFetch)).toEqual(PYPI_FALLBACK_LINES);
    });
    it("success returns non-fallback lines", async () => {
      const fakeFetch: typeof fetch = async () =>
        ok({ totalDownloads: 100, packageCount: 2 });
      const lines = await getPypiDialog(fakeFetch);
      expect(lines).not.toEqual(PYPI_FALLBACK_LINES);
    });
  });
});
