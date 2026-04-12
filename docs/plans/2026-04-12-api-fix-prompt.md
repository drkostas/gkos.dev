# Ralph Loop Prompt — Fix 3 Broken API NPCs on Production

## Context

Production testing on `portfolio-v2-one-pied.vercel.app` revealed that 3 of 5 live API NPCs are broken:

| NPC | Endpoint fetched | Status | Root cause |
|-----|-----------------|--------|------------|
| GitHub (Day Care Man) | `/api/stats/github` | ✅ 200 OK | Working |
| Spotify (Casino Guy) | `/api/spotify/now-playing` | ❌ 404 | **Route file `src/pages/api/spotify/now-playing.ts` does not exist** |
| Strava (Bike Shop Guy) | `/api/strava/recent` | ❌ 404 | **Route file `src/pages/api/strava/recent.ts` does not exist** |
| PyPI (Mart Expert) | `/api/stats/pypi` | ❌ Timeout | Route exists at `src/pages/api/stats/pypi.ts` but upstream PyPI API is slow; needs timeout handling or caching fix |
| Steps (Step Tracker) | localStorage only | ✅ N/A | No API needed |

The lib helpers (`src/lib/spotify.ts`, `src/lib/strava.ts`) already exist with full OAuth token exchange code. The NPC fetch code (`src/game/npcs/live/spotify.ts`, `src/game/npcs/live/strava.ts`) already exists with typed response parsing + fallback. The ONLY missing piece is the Astro API route that bridges the two.

Reference working route: `src/pages/api/stats/github.ts` — uses `src/lib/github.ts`, returns JSON, sets Cache-Control headers.

## Env vars needed on Vercel

Check the Vercel dashboard for this project and verify these env vars are set:
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`
- `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`

If any are missing, the lib helpers will log a warning and return null, causing the NPC to show fallback dialog. That's graceful but not "working."

---

## The prompt (copy below into /ralph-loop)

Fix all 3 broken API NPC endpoints so they return valid JSON on production. The loop is done ONLY when all three of these `fetch()` calls return HTTP 200 with valid JSON on the DEPLOYED production URL `https://portfolio-v2-one-pied.vercel.app`:

1. `fetch("/api/spotify/now-playing")` → `{ track: { name, artist, isPlaying } }` or `{ track: null }`
2. `fetch("/api/strava/recent")` → `{ activity: { type, name, distance, movingTime } }` or `{ activity: null }`
3. `fetch("/api/stats/pypi")` → `{ totalDownloads, packageCount }` (must not timeout)

For each endpoint:

**Step 1 — Create/fix the API route.** The lib helpers already exist:
- Spotify: `src/lib/spotify.ts` exports `getNowPlaying()` and `getRecentlyPlayed()`
- Strava: `src/lib/strava.ts` exports `getRecentActivity()` or similar
- PyPI: `src/pages/api/stats/pypi.ts` exists but times out — add a per-package timeout so one slow package doesn't block the whole response

Model the new routes after `src/pages/api/stats/github.ts`: `export const prerender = false`, export a `GET: APIRoute`, call the lib, return `Response.json()` with Cache-Control headers.

**Step 2 — Verify locally.** `npm run dev`, then `curl http://localhost:4321/api/spotify/now-playing` (or `/api/strava/recent`, `/api/stats/pypi`). If the env vars aren't in `.env.local`, the response should still be valid JSON with null data (not an HTML 404 or a crash).

**Step 3 — Run tests.** `npx tsc --noEmit` clean, `npx vitest run` all passing, `npm run build` clean.

**Step 4 — Commit + push.** One commit per endpoint fix. Push immediately after each commit so Vercel deploys.

**Step 5 — Verify on production.** After Vercel finishes building (wait 60-90s), use Playwright `browser_evaluate` to `fetch()` the endpoint on production and verify HTTP 200 + valid JSON. If it returns 404, HTML, or times out, the fix is not done — diagnose and retry.

**Step 6 — Re-verify ALL THREE.** After the last endpoint is fixed, re-fetch all three in a single `browser_evaluate` and verify all return 200 + valid JSON simultaneously. Screenshot the result.

The completion promise is: all three endpoints return HTTP 200 with valid JSON on the deployed production URL in a single verification pass. Do not emit the promise if even one endpoint is still broken. Fallback dialog (track: null / activity: null) counts as "working" — the endpoint itself must return 200, not the NPC showing live data (that depends on env vars being set on Vercel, which is the user's responsibility).
