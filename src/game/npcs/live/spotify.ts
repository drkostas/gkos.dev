/**
 * Spotify now-playing live-fetcher for the Spotify Guy NPC.
 * Mirrors the failure-safe pattern in github.ts.
 */

export interface SpotifyTrack {
  name: string;
  artist: string;
  album?: string;
  isPlaying: boolean;
  songUrl?: string;
}

export const SPOTIFY_FALLBACK_LINES: string[] = [
  "I lost my AirPods in the grass.",
  "KOSTAS listens to synthwave",
  "while he codes. He says it",
  "helps him focus on the flow.",
];

export async function fetchSpotifyTrack(
  fetchFn: typeof fetch = fetch,
): Promise<SpotifyTrack | null> {
  try {
    const res = await fetchFn("/api/spotify/now-playing", {
      method: "GET",
      signal:
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? (
              AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }
            ).timeout(3500)
          : undefined,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { track?: Partial<SpotifyTrack> | null };
    const track = data.track;
    if (!track || typeof track.name !== "string" || typeof track.artist !== "string") {
      return null;
    }
    return {
      name: track.name,
      artist: track.artist,
      album: typeof track.album === "string" ? track.album : undefined,
      isPlaying: track.isPlaying === true,
      songUrl: typeof track.songUrl === "string" ? track.songUrl : undefined,
    };
  } catch {
    return null;
  }
}

export function formatSpotifyDialog(track: SpotifyTrack): string[] {
  const verb = track.isPlaying ? "is listening to" : "last played";
  const lines: string[] = [
    `KOSTAS ${verb}...`,
    `"${track.name}"`,
    `by ${track.artist}`,
  ];
  if (track.album) {
    lines.push(`from ${track.album}`);
  }
  return lines;
}

export async function getSpotifyDialog(
  fetchFn: typeof fetch = fetch,
): Promise<string[]> {
  const track = await fetchSpotifyTrack(fetchFn);
  if (!track) return SPOTIFY_FALLBACK_LINES;
  return formatSpotifyDialog(track);
}
