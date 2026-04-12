import { describe, it, expect } from "vitest";
import {
  fetchGithubStats,
  formatGithubDialog,
  getGithubDialog,
  GITHUB_FALLBACK_LINES,
  type GithubStats,
} from "@/game/npcs/live/github";

/**
 * Live GitHub NPC tests — criterion #10 coverage for the first of 5
 * API-powered NPCs. Mocked fetch verifies success + every failure
 * path falls back to the static dialog.
 */

function okResponse(body: Partial<GithubStats>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Live NPC — GitHub Day Care Man", () => {
  describe("fetchGithubStats success path", () => {
    it("parses a well-formed JSON response into a GithubStats object", async () => {
      const fakeFetch: typeof fetch = async () =>
        okResponse({
          followers: 8300,
          publicRepos: 59,
          stars: 1200,
          forks: 300,
          contributions: 1240,
        });
      const stats = await fetchGithubStats(fakeFetch);
      expect(stats).not.toBeNull();
      expect(stats?.followers).toBe(8300);
      expect(stats?.publicRepos).toBe(59);
      expect(stats?.stars).toBe(1200);
    });

    it("fills in stars/forks defaults when missing", async () => {
      const fakeFetch: typeof fetch = async () =>
        okResponse({ followers: 100, publicRepos: 10 });
      const stats = await fetchGithubStats(fakeFetch);
      expect(stats?.stars).toBe(0);
      expect(stats?.forks).toBe(0);
    });
  });

  describe("fetchGithubStats failure paths → null", () => {
    it("returns null on network error (fetch throws)", async () => {
      const fakeFetch: typeof fetch = async () => {
        throw new Error("ECONNREFUSED");
      };
      const stats = await fetchGithubStats(fakeFetch);
      expect(stats).toBeNull();
    });

    it("returns null on 500 status", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("Internal Server Error", { status: 500 });
      const stats = await fetchGithubStats(fakeFetch);
      expect(stats).toBeNull();
    });

    it("returns null on 404 status", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("Not Found", { status: 404 });
      const stats = await fetchGithubStats(fakeFetch);
      expect(stats).toBeNull();
    });

    it("returns null when followers field is missing", async () => {
      const fakeFetch: typeof fetch = async () =>
        okResponse({ publicRepos: 10 } as Partial<GithubStats>);
      const stats = await fetchGithubStats(fakeFetch);
      expect(stats).toBeNull();
    });

    it("returns null when response body is invalid JSON", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("not-json", { status: 200 });
      const stats = await fetchGithubStats(fakeFetch);
      expect(stats).toBeNull();
    });

    it("returns null when followers is the wrong type", async () => {
      const fakeFetch: typeof fetch = async () =>
        okResponse({ followers: "100" } as unknown as Partial<GithubStats>);
      const stats = await fetchGithubStats(fakeFetch);
      expect(stats).toBeNull();
    });
  });

  describe("formatGithubDialog", () => {
    it("renders the full stats into a multi-line dialog", () => {
      const lines = formatGithubDialog({
        followers: 8300,
        publicRepos: 59,
        stars: 1200,
        forks: 300,
        contributions: 1240,
      });
      const joined = lines.join(" ");
      expect(joined).toContain("8300");
      expect(joined).toContain("GitHub");
      expect(joined).toContain("1200");
      expect(joined).toContain("59");
      expect(joined).toContain("1240");
    });

    it("shows the simpler 'Check out his N repos' copy when stars=0", () => {
      const lines = formatGithubDialog({
        followers: 100,
        publicRepos: 10,
        stars: 0,
        forks: 0,
      });
      const joined = lines.join(" ");
      expect(joined).toContain("10 repos");
      expect(joined).not.toContain("0 stars");
    });

    it("omits the contributions line when contributions is undefined", () => {
      const lines = formatGithubDialog({
        followers: 100,
        publicRepos: 10,
        stars: 50,
        forks: 20,
      });
      expect(lines.every((l) => !l.includes("contributions"))).toBe(true);
    });

    it("first line is always the Day Care greeting", () => {
      const lines = formatGithubDialog({
        followers: 1,
        publicRepos: 1,
        stars: 0,
        forks: 0,
      });
      expect(lines[0]).toBe("Welcome to the ML MODEL DAY CARE!");
    });
  });

  describe("getGithubDialog (combined helper)", () => {
    it("returns fallback lines when fetch fails", async () => {
      const fakeFetch: typeof fetch = async () => {
        throw new Error("offline");
      };
      const lines = await getGithubDialog(fakeFetch);
      expect(lines).toEqual(GITHUB_FALLBACK_LINES);
    });

    it("returns dynamic lines when fetch succeeds", async () => {
      const fakeFetch: typeof fetch = async () =>
        okResponse({ followers: 42, publicRepos: 7, stars: 0 });
      const lines = await getGithubDialog(fakeFetch);
      expect(lines).not.toEqual(GITHUB_FALLBACK_LINES);
      expect(lines.some((l) => l.includes("42"))).toBe(true);
    });
  });
});
