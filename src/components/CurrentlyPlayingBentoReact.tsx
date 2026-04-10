import { useEffect, useState } from "react";

type NowPlayingTrack = {
  isPlaying: boolean;
  title: string;
  artist: string;
  album: string;
  albumImageUrl: string;
  songUrl: string;
  progressMs: number;
  durationMs: number;
};

// Fallback shown while loading or if the Spotify API is unavailable.
const PLACEHOLDER: NowPlayingTrack = {
  isPlaying: false,
  title: "Nothing playing",
  artist: "Check back later",
  album: "",
  albumImageUrl: "",
  songUrl: "https://open.spotify.com",
  progressMs: 0,
  durationMs: 0,
};

// Poll interval for the now-playing endpoint. 30s is a good balance —
// responsive enough that the card feels alive, rare enough that we don't
// hit Spotify's rate limit or waste battery on idle tabs.
const POLL_INTERVAL_MS = 30_000;

export function CurrentlyPlayingBentoReact() {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchTrack() {
      try {
        const response = await fetch("/api/spotify/now-playing");
        const data = await response.json();
        if (cancelled) return;
        setTrack(data.track ?? null);
      } catch {
        if (!cancelled) setTrack(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchTrack();
    const interval = window.setInterval(fetchTrack, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const display = track ?? PLACEHOLDER;
  const heading = track?.isPlaying ? "Now Playing" : "Recent Favorite";
  const coverImage = display.albumImageUrl || "";
  const href = display.songUrl || "https://open.spotify.com";

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
      <div className="group relative flex h-full flex-col overflow-clip rounded-2xl border border-border-primary bg-bg-primary p-6 hover:bg-white">
        <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
        <div className="flex flex-col">
          <div className="z-10 h-full">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-text-primary">{heading}</h2>
                {track?.isPlaying && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                )}
              </div>
              <p className="mt-2 max-h-[150px] overflow-hidden text-base text-text-secondary">
                {isLoading ? (
                  <span className="text-text-tertiary">Loading…</span>
                ) : track ? (
                  <span className="line-clamp-3 text-ellipsis">
                    <span className="font-semibold text-text-primary">{display.title}</span>
                    {" "}by{" "}
                    <span className="font-semibold">{display.artist}</span>
                  </span>
                ) : (
                  <span className="text-text-tertiary">Nothing playing right now.</span>
                )}
              </p>
            </div>
            {/* Rotating disc with album art in the center. Spins continuously;
                the whole thing slides up on card hover. */}
            <div className="user-select-none pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 transition-all duration-300 group-hover:-bottom-1">
              <svg width="179" height="171" viewBox="0 0 179 171" fill="none" xmlns="http://www.w3.org/2000/svg" className={track?.isPlaying ? "animate-spin-slow" : ""}>
                <circle cx="89.5" cy="104.5" r="89.5" fill="#3C3C3F" />
                <circle cx="89.501" cy="104.5" r="87.06" stroke="#6C6D70" strokeWidth="1.3" />
                <circle cx="89.4992" cy="104.5" r="80.3" stroke="#4D4E52" strokeWidth="0.5" />
                <circle cx="89.4995" cy="104.5" r="69.56" stroke="#4D4E52" strokeWidth="0.5" />
                <circle cx="89.5012" cy="104.5" r="57.26" stroke="#4D4E52" strokeWidth="0.5" />
                <clipPath id="vinyl-clip">
                  <circle cx="89.5" cy="104.5" r="30" />
                </clipPath>
                {coverImage && (
                  <image
                    href={coverImage}
                    x="59.5"
                    y="74.5"
                    width="60"
                    height="60"
                    clipPath="url(#vinyl-clip)"
                    preserveAspectRatio="xMidYMid slice"
                  />
                )}
                <circle cx="89.5" cy="104.5" r="8" fill="#3C3C3F" />
                <circle cx="89.5" cy="104.5" r="3" fill="#6C6D70" />
              </svg>
            </div>
            {/* Album cover underneath the vinyl, visible when disc slides up */}
            {coverImage && (
              <div className="absolute -bottom-32 left-1/2 -translate-x-1/2">
                <div
                  className="h-[210px] w-[210px] rounded-sm bg-cover bg-center shadow-md"
                  style={{ backgroundImage: `url(${coverImage})` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}
