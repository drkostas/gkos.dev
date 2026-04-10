/**
 * Spotify API helper.
 *
 * Uses the Client Credentials + Refresh Token flow:
 *  1. Exchange refresh token for a short-lived access token (1 hour)
 *  2. Call Spotify Web API with the access token
 *  3. Cache access tokens in-memory so we don't refresh on every request
 *
 * The refresh token is long-lived and stays in .env as SPOTIFY_REFRESH_TOKEN.
 * Generated once via OAuth — see the README or the chat history.
 *
 * Scopes: user-read-currently-playing, user-read-recently-played
 */

// Hybrid env access: import.meta.env for dev (Vite + .env.local),
// process.env fallback for Vercel runtime.
const CLIENT_ID = import.meta.env.SPOTIFY_CLIENT_ID ?? process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.SPOTIFY_CLIENT_SECRET ?? process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = import.meta.env.SPOTIFY_REFRESH_TOKEN ?? process.env.SPOTIFY_REFRESH_TOKEN;

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

// Cache the access token in memory for its lifetime (~1 hour).
// Each dev server restart / build process gets a fresh token.
let cachedAccessToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.warn("[spotify] missing credentials in env");
    return null;
  }

  // Return cached token if still valid (30s safety buffer)
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 30_000) {
    return cachedAccessToken.value;
  }

  try {
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: REFRESH_TOKEN,
      }),
    });

    if (!response.ok) {
      console.warn(`[spotify] token refresh failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    cachedAccessToken = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return cachedAccessToken.value;
  } catch (error) {
    console.warn("[spotify] token refresh exception:", error);
    return null;
  }
}

async function spotifyFetch<T = any>(path: string): Promise<T | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 204 No Content means "no track currently playing" — treat as null, not error
    if (response.status === 204) return null;
    if (!response.ok) {
      console.warn(`[spotify] ${path} → ${response.status}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[spotify] ${path} failed:`, error);
    return null;
  }
}

export interface NowPlayingTrack {
  isPlaying: boolean;
  title: string;
  artist: string;
  album: string;
  albumImageUrl: string;
  songUrl: string;
  progressMs: number;
  durationMs: number;
}

/**
 * Fetch the track the user is currently playing on Spotify.
 * Returns null if nothing is playing, credentials are missing, or the API fails.
 */
export async function getNowPlaying(): Promise<NowPlayingTrack | null> {
  const data = await spotifyFetch<Record<string, any>>("/me/player/currently-playing");
  if (!data || !data.item) return null;

  const item = data.item;
  const artists = Array.isArray(item.artists) ? item.artists : [];
  const albumImages = item.album?.images ?? [];

  return {
    isPlaying: !!data.is_playing,
    title: item.name ?? "Unknown",
    artist: artists.map((a: any) => a.name).join(", ") || "Unknown artist",
    album: item.album?.name ?? "",
    albumImageUrl: albumImages[0]?.url ?? "",
    songUrl: item.external_urls?.spotify ?? "",
    progressMs: data.progress_ms ?? 0,
    durationMs: item.duration_ms ?? 0,
  };
}

/**
 * Fetch the user's most recently played track. Used as a fallback
 * when nothing is currently playing.
 */
export async function getRecentlyPlayed(): Promise<NowPlayingTrack | null> {
  const data = await spotifyFetch<{ items: Array<Record<string, any>> }>(
    "/me/player/recently-played?limit=1",
  );
  if (!data || !Array.isArray(data.items) || data.items.length === 0) return null;

  const track = data.items[0].track;
  if (!track) return null;

  const artists = Array.isArray(track.artists) ? track.artists : [];
  const albumImages = track.album?.images ?? [];

  return {
    isPlaying: false,
    title: track.name ?? "Unknown",
    artist: artists.map((a: any) => a.name).join(", ") || "Unknown artist",
    album: track.album?.name ?? "",
    albumImageUrl: albumImages[0]?.url ?? "",
    songUrl: track.external_urls?.spotify ?? "",
    progressMs: 0,
    durationMs: track.duration_ms ?? 0,
  };
}

/**
 * Get the current track if playing, otherwise the most recently played track.
 * This is the main entry point for the "Currently Playing" widget.
 */
export async function getCurrentOrRecentTrack(): Promise<NowPlayingTrack | null> {
  const now = await getNowPlaying();
  if (now) return now;
  return await getRecentlyPlayed();
}
