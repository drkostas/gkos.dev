import { describe, it, expect } from "vitest";
import {
  fetchSpotifyTrack,
  formatSpotifyDialog,
  getSpotifyDialog,
  SPOTIFY_FALLBACK_LINES,
  type SpotifyTrack,
} from "@/game/npcs/live/spotify";

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Live NPC — Spotify Guy", () => {
  describe("fetchSpotifyTrack success", () => {
    it("parses a playing track", async () => {
      const fakeFetch: typeof fetch = async () =>
        okResponse({
          track: {
            name: "Strobe",
            artist: "deadmau5",
            album: "For Lack of a Better Name",
            isPlaying: true,
            songUrl: "https://open.spotify.com/track/123",
          },
        });
      const track = await fetchSpotifyTrack(fakeFetch);
      expect(track?.name).toBe("Strobe");
      expect(track?.artist).toBe("deadmau5");
      expect(track?.isPlaying).toBe(true);
    });

    it("handles a not-playing track", async () => {
      const fakeFetch: typeof fetch = async () =>
        okResponse({
          track: { name: "Song", artist: "Artist", isPlaying: false },
        });
      const track = await fetchSpotifyTrack(fakeFetch);
      expect(track?.isPlaying).toBe(false);
    });
  });

  describe("fetchSpotifyTrack failure → null", () => {
    it("returns null on network error", async () => {
      const fakeFetch: typeof fetch = async () => {
        throw new Error("offline");
      };
      expect(await fetchSpotifyTrack(fakeFetch)).toBeNull();
    });
    it("returns null on 500", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("err", { status: 500 });
      expect(await fetchSpotifyTrack(fakeFetch)).toBeNull();
    });
    it("returns null on track: null (no recent activity)", async () => {
      const fakeFetch: typeof fetch = async () => okResponse({ track: null });
      expect(await fetchSpotifyTrack(fakeFetch)).toBeNull();
    });
    it("returns null when required fields are missing", async () => {
      const fakeFetch: typeof fetch = async () =>
        okResponse({ track: { name: "Song" } });
      expect(await fetchSpotifyTrack(fakeFetch)).toBeNull();
    });
  });

  describe("formatSpotifyDialog", () => {
    it("includes the track name and artist", () => {
      const t: SpotifyTrack = {
        name: "Track",
        artist: "Artist",
        isPlaying: true,
      };
      const lines = formatSpotifyDialog(t);
      expect(lines.join(" ")).toContain("Track");
      expect(lines.join(" ")).toContain("Artist");
    });
    it("uses 'is listening to' for playing, 'last played' for not", () => {
      expect(
        formatSpotifyDialog({ name: "A", artist: "B", isPlaying: true }).join(" "),
      ).toContain("is listening to");
      expect(
        formatSpotifyDialog({ name: "A", artist: "B", isPlaying: false }).join(" "),
      ).toContain("last played");
    });
  });

  describe("getSpotifyDialog combined", () => {
    it("returns fallback on failure", async () => {
      const fakeFetch: typeof fetch = async () => {
        throw new Error("offline");
      };
      expect(await getSpotifyDialog(fakeFetch)).toEqual(SPOTIFY_FALLBACK_LINES);
    });
  });
});
