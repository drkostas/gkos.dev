/**
 * TemplateResolver — processes {{ }} tokens in dialog lines.
 *
 * Usage: const resolved = await resolve(["Hello {{ player.name }}!"]);
 * Returns: ["Hello RED!"]
 *
 * Namespaces: github, spotify, strava, pypi, steps, badges, player, pokedex
 * Cache: 60-second TTL per namespace
 */

interface NamespaceData {
  [key: string]: string | number;
}

const cache = new Map<string, { data: NamespaceData; time: number }>();
const CACHE_TTL = 60_000; // 60 seconds

/** Fetch data for a namespace from the appropriate API */
async function fetchNamespace(ns: string): Promise<NamespaceData> {
  // Check cache
  const cached = cache.get(ns);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  let data: NamespaceData = {};

  try {
    switch (ns) {
      case "github": {
        const r = await fetch("/api/stats/github");
        if (r.ok) {
          const json = await r.json();
          data = {
            followers: json.followers ?? "?",
            repos: json.public_repos ?? "?",
            stars: json.stars ?? "?",
            commits: json.recent_commits ?? "?",
            forks: json.forks ?? "?",
            contributions: json.contributions ?? "?",
          };
        }
        break;
      }
      case "spotify": {
        const r = await fetch("/api/spotify/now-playing");
        if (r.ok) {
          const json = await r.json();
          data = {
            track: json.title ?? "nothing",
            artist: json.artist ?? "unknown",
            album: json.album ?? "",
            playing: json.isPlaying ? "listening to" : "last played",
            status: json.isPlaying ? "right now" : "recently",
          };
        }
        break;
      }
      case "strava": {
        const r = await fetch("/api/strava/recent");
        if (r.ok) {
          const json = await r.json();
          const distKm = json.distance ? (json.distance / 1000).toFixed(1) : "0";
          const pace = json.distance && json.movingTime
            ? `${Math.floor(json.movingTime / 60 / (json.distance / 1000))}:${String(Math.round(json.movingTime / (json.distance / 1000)) % 60).padStart(2, "0")}/km`
            : "";
          data = {
            distance: distKm,
            type: json.type ?? "unknown",
            name: json.name ?? "Activity",
            pace,
          };
        }
        break;
      }
      case "pypi": {
        const r = await fetch("/api/stats/pypi");
        if (r.ok) {
          const json = await r.json();
          const dl = json.total_downloads;
          const formatted = dl >= 1_000_000 ? `${(dl / 1_000_000).toFixed(1)}M`
            : dl >= 1_000 ? `${(dl / 1_000).toFixed(0)}K`
            : String(dl ?? "?");
          data = {
            downloads: formatted,
            packages: json.package_count ?? "?",
          };
        }
        break;
      }
      case "player": {
        // Read from localStorage game save
        try {
          const save = JSON.parse(localStorage.getItem("gkos:explore:save") || "{}");
          data = {
            name: save.playerName || "RED",
            steps: save.steps || 0,
          };
        } catch {
          data = { name: "RED", steps: 0 };
        }
        break;
      }
      case "badges": {
        try {
          const save = JSON.parse(localStorage.getItem("gkos:explore:save") || "{}");
          data = {
            count: save.badges?.length || 0,
            total: 8,
          };
        } catch {
          data = { count: 0, total: 8 };
        }
        break;
      }
      case "pokedex": {
        try {
          const save = JSON.parse(localStorage.getItem("gkos:explore:save") || "{}");
          data = {
            seen: save.pokedexSeen?.length || 0,
            caught: save.pokedexCaught?.length || 0,
          };
        } catch {
          data = { seen: 0, caught: 0 };
        }
        break;
      }
      case "steps": {
        try {
          const save = JSON.parse(localStorage.getItem("gkos:explore:save") || "{}");
          data = { count: save.steps || 0 };
        } catch {
          data = { count: 0 };
        }
        break;
      }
    }
  } catch (e) {
    console.warn(`TemplateResolver: failed to fetch ${ns}:`, e);
  }

  // Cache result
  cache.set(ns, { data, time: Date.now() });
  return data;
}

/** Resolve all {{ namespace.key }} tokens in a set of dialog lines */
export async function resolveTemplates(lines: string[]): Promise<string[]> {
  // Find all unique namespaces referenced
  const tokenRe = /\{\{\s*(\w+)\.(\w+)\s*\}\}/g;
  const namespacesNeeded = new Set<string>();

  for (const line of lines) {
    let match;
    while ((match = tokenRe.exec(line)) !== null) {
      namespacesNeeded.add(match[1]);
    }
  }

  if (namespacesNeeded.size === 0) return lines;

  // Fetch all needed namespaces in parallel
  const nsData = new Map<string, NamespaceData>();
  await Promise.all(
    Array.from(namespacesNeeded).map(async (ns) => {
      nsData.set(ns, await fetchNamespace(ns));
    }),
  );

  // Replace tokens
  return lines.map((line) =>
    line.replace(/\{\{\s*(\w+)\.(\w+)\s*\}\}/g, (_match, ns, key) => {
      const data = nsData.get(ns);
      if (data && key in data) return String(data[key]);
      return `[${ns}.${key}]`;
    }),
  );
}

/** Clear the namespace cache */
export function clearTemplateCache(): void {
  cache.clear();
}
