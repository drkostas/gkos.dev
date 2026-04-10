/**
 * Strava API helper.
 *
 * Strava uses OAuth2 with short-lived access tokens (~6 hours) and a long-lived
 * refresh token. We exchange the refresh token for an access token on demand
 * and cache the result in module memory.
 *
 * Token rotation: every refresh exchange returns a NEW refresh_token. We don't
 * persist the rotated value here — Strava accepts the original refresh token
 * indefinitely (in practice) for read-only scopes. If this ever stops working,
 * we'll need to persist rotated tokens to disk or a DB.
 *
 * Scopes: read, activity:read
 */

// Hybrid env access: import.meta.env for dev (Vite + .env.local),
// process.env fallback for Vercel runtime.
const CLIENT_ID = import.meta.env.STRAVA_CLIENT_ID ?? process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.STRAVA_CLIENT_SECRET ?? process.env.STRAVA_CLIENT_SECRET;
const INITIAL_REFRESH_TOKEN = import.meta.env.STRAVA_REFRESH_TOKEN ?? process.env.STRAVA_REFRESH_TOKEN;

const TOKEN_URL = "https://www.strava.com/oauth/token";
const API_BASE = "https://www.strava.com/api/v3";

// Cached access token + the (possibly rotated) refresh token.
let cached: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} | null = null;

async function getAccessToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET || !INITIAL_REFRESH_TOKEN) {
    console.warn("[strava] missing credentials in env");
    return null;
  }

  // Reuse cached token if still valid (60s safety buffer)
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  // Use the most recent refresh token (rotated or initial)
  const refreshToken = cached?.refreshToken ?? INITIAL_REFRESH_TOKEN;

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.warn(`[strava] token refresh failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      expires_in: number;
    };

    cached = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at * 1000,
    };
    return cached.accessToken;
  } catch (error) {
    console.warn("[strava] token refresh exception:", error);
    return null;
  }
}

async function stravaFetch<T = any>(path: string): Promise<T | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      console.warn(`[strava] ${path} → ${response.status}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[strava] ${path} failed:`, error);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface StravaActivity {
  id: number;
  name: string;
  type: string; // "Run", "Ride", "Swim", "Walk", etc.
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  elevationGainMeters: number;
  startDate: string; // ISO 8601
  averageSpeed: number; // m/s
  maxSpeed: number; // m/s
  averageHeartrate: number | null;
  kudosCount: number;
  url: string;
}

export interface StravaAthlete {
  id: number;
  firstName: string;
  lastName: string;
  city: string | null;
  country: string | null;
  profileImageUrl: string | null;
}

export interface StravaTotals {
  ytdRunDistanceMeters: number;
  ytdRideDistanceMeters: number;
  ytdSwimDistanceMeters: number;
  ytdRunCount: number;
  ytdRideCount: number;
  ytdSwimCount: number;
  recentRunDistanceMeters: number; // last 4 weeks
  recentRideDistanceMeters: number;
  allTimeRunDistanceMeters: number;
  allTimeRideDistanceMeters: number;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

function mapActivity(a: Record<string, any>): StravaActivity {
  return {
    id: a.id,
    name: a.name ?? "Untitled activity",
    type: a.sport_type ?? a.type ?? "Workout",
    distanceMeters: a.distance ?? 0,
    movingTimeSeconds: a.moving_time ?? 0,
    elapsedTimeSeconds: a.elapsed_time ?? 0,
    elevationGainMeters: a.total_elevation_gain ?? 0,
    startDate: a.start_date ?? new Date().toISOString(),
    averageSpeed: a.average_speed ?? 0,
    maxSpeed: a.max_speed ?? 0,
    averageHeartrate: a.average_heartrate ?? null,
    kudosCount: a.kudos_count ?? 0,
    url: `https://www.strava.com/activities/${a.id}`,
  };
}

/**
 * Fetch the most recent activities for the authenticated athlete.
 */
export async function getRecentActivities(limit = 5): Promise<StravaActivity[]> {
  const data = await stravaFetch<Array<Record<string, any>>>(
    `/athlete/activities?per_page=${limit}`,
  );
  if (!data || !Array.isArray(data)) return [];
  return data.map(mapActivity);
}

/**
 * Fetch the single most recent activity. Convenience wrapper.
 */
export async function getLatestActivity(): Promise<StravaActivity | null> {
  const activities = await getRecentActivities(1);
  return activities[0] ?? null;
}

/**
 * Fetch the athlete profile.
 */
export async function getAthlete(): Promise<StravaAthlete | null> {
  const data = await stravaFetch<Record<string, any>>("/athlete");
  if (!data) return null;
  return {
    id: data.id,
    firstName: data.firstname ?? "",
    lastName: data.lastname ?? "",
    city: data.city ?? null,
    country: data.country ?? null,
    profileImageUrl: data.profile ?? null,
  };
}

/**
 * Fetch year-to-date and all-time totals for the authenticated athlete.
 */
export async function getAthleteStats(athleteId: number): Promise<StravaTotals | null> {
  const data = await stravaFetch<Record<string, any>>(
    `/athletes/${athleteId}/stats`,
  );
  if (!data) return null;

  return {
    ytdRunDistanceMeters: data.ytd_run_totals?.distance ?? 0,
    ytdRideDistanceMeters: data.ytd_ride_totals?.distance ?? 0,
    ytdSwimDistanceMeters: data.ytd_swim_totals?.distance ?? 0,
    ytdRunCount: data.ytd_run_totals?.count ?? 0,
    ytdRideCount: data.ytd_ride_totals?.count ?? 0,
    ytdSwimCount: data.ytd_swim_totals?.count ?? 0,
    recentRunDistanceMeters: data.recent_run_totals?.distance ?? 0,
    recentRideDistanceMeters: data.recent_ride_totals?.distance ?? 0,
    allTimeRunDistanceMeters: data.all_run_totals?.distance ?? 0,
    allTimeRideDistanceMeters: data.all_ride_totals?.distance ?? 0,
  };
}
