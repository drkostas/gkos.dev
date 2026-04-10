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
  if (meters === 0) return "0 km";
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
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

function activityIcon(type: string): string {
  // Sport types from Strava: Run, Ride, Swim, Walk, Hike, etc.
  const lower = type.toLowerCase();
  if (lower.includes("run")) return "🏃";
  if (lower.includes("ride") || lower.includes("bike") || lower.includes("cycle")) return "🚴";
  if (lower.includes("swim")) return "🏊";
  if (lower.includes("walk")) return "🚶";
  if (lower.includes("hike")) return "🥾";
  if (lower.includes("yoga")) return "🧘";
  if (lower.includes("ski")) return "⛷️";
  if (lower.includes("surf")) return "🏄";
  if (lower.includes("workout") || lower.includes("weight")) return "💪";
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
                <div>
                  <p className="text-lg font-semibold tracking-tight text-purple-primary">
                    {formatDistance(activity.distanceMeters)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary">distance</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-purple-primary">
                    {formatDuration(activity.movingTimeSeconds)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary">moving</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-purple-primary">
                    {Math.round(activity.elevationGainMeters)}m
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary">climbed</p>
                </div>
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
