/**
 * Strava recent-activity live-fetcher for the Strava Nerd NPC.
 * Mirrors the failure-safe pattern in github.ts.
 */

export interface StravaActivity {
  type: string;
  name: string;
  distance: number; // meters
  movingTime: number; // seconds
  startDate?: string;
}

export const STRAVA_FALLBACK_LINES: string[] = [
  "KOSTAS runs marathons.",
  "He says the Greek mountains",
  "teach you more about grit than",
  "any algorithm ever could.",
];

export async function fetchStravaActivity(
  fetchFn: typeof fetch = fetch,
): Promise<StravaActivity | null> {
  try {
    const res = await fetchFn("/api/strava/recent", {
      method: "GET",
      signal:
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? (
              AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }
            ).timeout(3500)
          : undefined,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      activity?: Partial<StravaActivity> | null;
    };
    const a = data.activity;
    if (
      !a ||
      typeof a.type !== "string" ||
      typeof a.distance !== "number" ||
      typeof a.movingTime !== "number"
    ) {
      return null;
    }
    return {
      type: a.type,
      name: typeof a.name === "string" ? a.name : a.type,
      distance: a.distance,
      movingTime: a.movingTime,
      startDate: typeof a.startDate === "string" ? a.startDate : undefined,
    };
  } catch {
    return null;
  }
}

function formatKm(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function formatPace(meters: number, seconds: number): string {
  if (meters <= 0) return "—";
  const minPerKm = seconds / 60 / (meters / 1000);
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export function formatStravaDialog(a: StravaActivity): string[] {
  const km = formatKm(a.distance);
  const pace = formatPace(a.distance, a.movingTime);
  return [
    `KOSTAS's last ${a.type}...`,
    `${km} km at ${pace}.`,
    `He does this every week —`,
    `endurance for the long game.`,
  ];
}

export async function getStravaDialog(
  fetchFn: typeof fetch = fetch,
): Promise<string[]> {
  const a = await fetchStravaActivity(fetchFn);
  if (!a) return STRAVA_FALLBACK_LINES;
  return formatStravaDialog(a);
}
