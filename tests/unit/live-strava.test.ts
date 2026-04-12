import { describe, it, expect } from "vitest";
import {
  fetchStravaActivity,
  formatStravaDialog,
  getStravaDialog,
  STRAVA_FALLBACK_LINES,
} from "@/game/npcs/live/strava";

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("Live NPC — Strava Nerd", () => {
  describe("fetchStravaActivity", () => {
    it("parses a well-formed Run", async () => {
      const fakeFetch: typeof fetch = async () =>
        ok({
          activity: {
            type: "Run",
            name: "Morning Run",
            distance: 10000, // 10 km
            movingTime: 3000, // 50 min
            startDate: "2026-04-12T05:30:00Z",
          },
        });
      const a = await fetchStravaActivity(fakeFetch);
      expect(a?.type).toBe("Run");
      expect(a?.distance).toBe(10000);
      expect(a?.movingTime).toBe(3000);
    });

    it("null on activity=null response", async () => {
      const fakeFetch: typeof fetch = async () => ok({ activity: null });
      expect(await fetchStravaActivity(fakeFetch)).toBeNull();
    });

    it("null on network error", async () => {
      const fakeFetch: typeof fetch = async () => {
        throw new Error("offline");
      };
      expect(await fetchStravaActivity(fakeFetch)).toBeNull();
    });

    it("null on 502", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("bad gateway", { status: 502 });
      expect(await fetchStravaActivity(fakeFetch)).toBeNull();
    });

    it("null when distance missing", async () => {
      const fakeFetch: typeof fetch = async () =>
        ok({ activity: { type: "Run", movingTime: 100 } });
      expect(await fetchStravaActivity(fakeFetch)).toBeNull();
    });
  });

  describe("formatStravaDialog", () => {
    it("renders km + pace", () => {
      const lines = formatStravaDialog({
        type: "Run",
        name: "5K",
        distance: 5000,
        movingTime: 1500, // 25 min → 5:00/km
      });
      const joined = lines.join(" ");
      expect(joined).toContain("5.0 km");
      expect(joined).toContain("5:00/km");
      expect(joined).toContain("Run");
    });

    it("handles short activities cleanly", () => {
      const lines = formatStravaDialog({
        type: "TrailRun",
        name: "Quick trail",
        distance: 1500, // 1.5 km
        movingTime: 450, // 7.5 min → 5:00/km
      });
      expect(lines.join(" ")).toContain("1.5 km");
    });
  });

  describe("getStravaDialog combined", () => {
    it("fallback on failure", async () => {
      const fakeFetch: typeof fetch = async () => {
        throw new Error("offline");
      };
      expect(await getStravaDialog(fakeFetch)).toEqual(STRAVA_FALLBACK_LINES);
    });
  });
});
