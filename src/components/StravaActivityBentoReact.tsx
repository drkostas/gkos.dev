import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  elevationGainMeters: number;
  startDate: string;
  averageSpeed: number;
  maxSpeed: number;
  averageHeartrate: number | null;
  kudosCount: number;
  url: string;
};

type StravaTotals = {
  ytdRunDistanceMeters: number;
  ytdRideDistanceMeters: number;
  ytdSwimDistanceMeters: number;
  ytdRunCount: number;
  ytdRideCount: number;
  ytdSwimCount: number;
  recentRunDistanceMeters: number;
  recentRideDistanceMeters: number;
  allTimeRunDistanceMeters: number;
  allTimeRideDistanceMeters: number;
};

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  if (meters === 0) return "0 km";
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatActivityType(type: string): string {
  // Split Strava's PascalCase sport types into readable words.
  // "WeightTraining" → "Weight Training", "TrailRun" → "Trail Run".
  return type.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
  return `${Math.floor(diffDay / 365)}y ago`;
}

type Stat = { label: string; value: string };

// Pick up to 3 meaningful stat columns for the given activity.
// Cardio shows distance/moving/climbed. Strength or yoga fall back to
// duration/HR/kudos so the grid never shows "0 km, 0m climbed" for a weight session.
function pickStats(activity: StravaActivity): Stat[] {
  const stats: Stat[] = [];
  if (Number.isFinite(activity.distanceMeters) && activity.distanceMeters > 0) {
    stats.push({ label: "distance", value: formatDistance(activity.distanceMeters) });
  }
  if (Number.isFinite(activity.movingTimeSeconds) && activity.movingTimeSeconds > 0) {
    stats.push({ label: "moving", value: formatDuration(activity.movingTimeSeconds) });
  }
  if (Number.isFinite(activity.elevationGainMeters) && activity.elevationGainMeters > 0) {
    stats.push({ label: "climbed", value: `${Math.round(activity.elevationGainMeters)}m` });
  }
  if (stats.length < 3 && activity.averageHeartrate !== null && Number.isFinite(activity.averageHeartrate) && activity.averageHeartrate > 0) {
    stats.push({ label: "avg hr", value: `${Math.round(activity.averageHeartrate)} bpm` });
  }
  if (stats.length < 3 && Number.isFinite(activity.kudosCount) && activity.kudosCount > 0) {
    stats.push({ label: "kudos", value: String(activity.kudosCount) });
  }
  if (stats.length < 3 && activity.type) {
    stats.push({ label: "type", value: formatActivityType(activity.type) });
  }
  return stats.slice(0, 3);
}

function activityIcon(type: string): string {
  // Strava sport types: Run, TrailRun, Ride, EBikeRide, MountainBikeRide, Hike,
  // Swim, Walk, WeightTraining, Workout, Crossfit, Yoga, AlpineSki, Snowboard,
  // Kitesurf, Windsurf, StandUpPaddling, Rowing, Kayaking, RockClimbing, etc.
  const lower = type.toLowerCase();
  if (lower.includes("run")) return "🏃";
  if (lower.includes("ride") || lower.includes("bike") || lower.includes("cycle")) return "🚴";
  if (lower.includes("swim")) return "🏊";
  if (lower.includes("walk")) return "🚶";
  if (lower.includes("hike")) return "🥾";
  if (lower.includes("yoga")) return "🧘";
  if (lower.includes("kite")) return "🪁"; // Kitesurf — checked before "surf"
  if (lower.includes("snowboard")) return "🏂";
  if (lower.includes("ski")) return "⛷️";
  if (lower.includes("surf") || lower.includes("paddl")) return "🏄"; // Surf, Windsurf, StandUpPaddling
  if (lower.includes("sail")) return "⛵";
  if (lower.includes("row") || lower.includes("kayak") || lower.includes("canoe")) return "🚣";
  if (lower.includes("climb")) return "🧗";
  if (lower.includes("skate")) return "🛹";
  if (
    lower.includes("weight") ||
    lower.includes("strength") ||
    lower.includes("workout") ||
    lower.includes("crossfit")
  ) return "💪";
  return "🏅";
}

export function StravaActivityBentoReact() {
  const [activity, setActivity] = useState<StravaActivity | null>(null);
  const [stats, setStats] = useState<StravaTotals | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const response = await fetch("/api/strava/recent");
        const data = await response.json();
        if (cancelled) return;
        setActivity(data.activity ?? null);
        setStats(data.stats ?? null);
      } catch {
        if (!cancelled) {
          setActivity(null);
          setStats(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Year-to-date total distance across runs + rides + swims
  const ytdTotalKm = stats
    ? Math.round(
        (stats.ytdRunDistanceMeters +
          stats.ytdRideDistanceMeters +
          stats.ytdSwimDistanceMeters) /
          1000,
      )
    : 0;

  return (
    <a
      href={activity?.url ?? "https://www.strava.com/athletes"}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full"
    >
      <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-colors hover:bg-white">
        <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-orange-400/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />

        {/* Top row: heading + Strava brand pill */}
        <div className="relative z-20 mb-3 flex items-start justify-between">
          <div>
            <h2 className="font-medium text-text-primary">Last activity</h2>
            <p className="text-xs text-text-tertiary">via Strava</p>
          </div>
          <span className="inline-flex h-6 items-center rounded-full border border-orange-400/40 bg-orange-500/10 px-2 font-mono text-[10px] uppercase tracking-widest text-orange-500">
            Strava
          </span>
        </div>

        {/* Content */}
        <div className="relative z-20 flex flex-1 flex-col">
          {isLoading ? (
            <p className="text-sm text-text-tertiary">Loading…</p>
          ) : activity ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">
                  {activityIcon(activity.type)}
                </span>
                <p className="line-clamp-2 text-sm font-semibold leading-tight text-text-primary">
                  {activity.name}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {pickStats(activity).map((s) => (
                  <div key={s.label}>
                    <p className="text-lg font-semibold tracking-tight text-purple-primary">
                      {s.value}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between pt-3 text-xs text-text-tertiary">
                <span>{formatRelativeTime(activity.startDate)}</span>
                {ytdTotalKm > 0 && (
                  <span className="font-mono">
                    YTD <span className="font-semibold text-text-secondary">{ytdTotalKm} km</span>
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center">
              <p className="text-sm text-text-tertiary">
                No recent activity to show.
              </p>
            </div>
          )}
        </div>

        {/* Decorative animated dot in the corner when data is fresh */}
        {activity && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="pointer-events-none absolute right-5 top-5 z-30 flex h-2 w-2"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
          </motion.span>
        )}
      </div>
    </a>
  );
}
