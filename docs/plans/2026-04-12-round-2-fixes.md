# Round 2 — Remaining Fixes After Round 1

Status as of commit `bf85217` on `main` (44 commits ahead of `origin/main`).

Round 1 closed all engine bugs (B1-B7), all mobile bugs (M0-M9), all content
gaps (papers, TMs, blogs, signs, research log, gym trainers, API NPCs, hidden
items, field moves, MEW phone number), added 173 unit tests + 40 Playwright
tests, fixed the PUBLICATION badge impossible-to-earn bug, fixed the
CONNECTED/CHAMPION badge pickup plumbing, and added prefers-reduced-motion
support to the title screen.

## Blocked on user action (cannot fix without push)

| Issue | Blocker | Action |
|-------|---------|--------|
| Criterion #6: Vercel deployment not live | 44 local commits not pushed | `git push origin main` |
| Criterion #11: No screen recording | Requires manual playthrough | QuickTime + iOS recording |
| Criterion #12: Production Lighthouse unmeasured | Needs deploy first | `npx lighthouse <url>/explore?touch=1` |

## P1 — Real bugs / gaps still open

### 1. GATES array empty
`src/game/data/gates.ts` → `GATES = []`. FIELD_MOVE_AWARDS has 2 entries
(FORCE PUSH + CUT) but nothing to open. Decision Ledger says:
- Snorlax gate at (68,9) — NPC-type, requires FORCE PUSH
- Tinted tree at (66,20) — terrain-type, requires CUT

**Why it's open:** Adding gate NPCs requires spawning Grid Engine collision
characters at specific tile positions. If the position is on an
unwalkable tile or an articulation point, the gate soft-locks the map.
Needs map-analyzer validation before committing.

**Fix:** Validate positions with `node scripts/map-analyzer.mjs --test 68,9`
and `--test 66,20`, add entries to GATES, test in runtime.

### 2. `npc_snorlax` exists but has no gate binding
The Snorlax NPC at `npcs.ts` line ~573 has dialog but no `spawnCondition`
tied to `isGateCleared("snorlax_gate")`. Once GATES is populated, this NPC
should be bound to the gate system via `spawnCondition`.

### 3. Audio files deleted from working tree (4834 files)
`public/game/audio/` has 4834 deletions in the working tree: old sample
libraries (`custom_attack_moves_all_gens/`, `custom_emerald_sound_effects/`,
numbered MP3 tracks). None are referenced by game code (verified via grep).
They're likely leftover reference assets from the sprite rip.

**Fix:** Either commit the deletions (`git add -A public/game/audio/ && git
commit -m "chore: remove unused audio assets"`) or restore them if they're
needed for a future audio phase.

### 4. ~~HiddenItemSystem pickup tracking~~ — RESOLVED (false alarm)
Audited in iteration 15: HiddenItemSystem uses `hasItem(tile.itemId)` from
GameSave directly — no separate HiddenItemStore exists. Idempotent by
design. No consistency issue.

## P2 — Polish / nice-to-have

### 5. prefers-reduced-motion incomplete
Title screen has it. Missing from: Birch intro (fade transitions, sprite
slide-in, typewriter effect), DialogBox typewriter, d-pad active-state
animation, overworld Phaser animations.

### 6. D-pad arm active state only distinguishable by color
Persona 4 (colorblind): the active d-pad arm uses a lighter shade of the
same hue. Add a shape cue (arrow marker, border, scale) so the active arm
reads without color.

### 7. No save fixture files
Plan wanted `tests/fixtures/saves/fresh-new-game.json`, `post-birch.json`,
`100-complete.json`. These would let Playwright tests boot directly into
specific game states without manual navigation.

### 8. No query param harness in explore.astro
Plan spec'd `?skip-intro=1`, `?skip-animations=1`, `?seed=<json>` params
gated by `import.meta.env.DEV`. Would speed up e2e tests dramatically.

### 9. Stray screenshots in /tests/
200+ PNG files from ad-hoc manual testing live in `/tests/`. They should be
moved to `tests/_archive/` or deleted to keep the test directory clean.

### 10. Visual regression baselines outdated
The 28 visual-regression tests pass with `maxDiffPixels: 50000` tolerance.
The baselines should be refreshed so the tolerance can be tightened back
to ~5000 without false positives.

### 11. Birch intro duration (16+ seconds)
Persona 1 (recruiter) concern: 16 seconds from game load to gender select.
Consider a "fast-forward" affordance for the Birch intro, or cutting 1-2
of the slower phases (BIRCH_APPEAR takes 2.6 seconds alone).

### 12. No CI/CD GitHub Actions workflow
Plan spec'd `.github/workflows/test.yml` with Vitest + Playwright + tsc
in a matrix. Not created. Once pushed, this would catch regressions on
every PR.

## Fresh-clone verification (iteration 16)

Partial unlock protocol executed in `/tmp/portfolio-v2-verify`:

```
git clone <local repo> → npm install → npx astro sync → npx tsc --noEmit
→ npx vitest run → npm run build
```

| Step | Result |
|------|--------|
| npm install | ✅ clean |
| astro sync | ✅ types generated (warnings: no blog/changelog content dirs — expected) |
| tsc --noEmit | ✅ exit 0 |
| vitest run | ✅ 17 files, 173 tests, 0 failures |
| npm run build | ✅ `[build] Complete!` |

**Note:** `tsc` fails in fresh clones until `astro sync` generates
`.astro/types.d.ts`. The unlock protocol must run `astro sync` before `tsc`.

Remaining unlock steps (blocked on user):
- `vercel deploy --prebuilt` or `git push` for Vercel auto-deploy
- Play through title → CHAMPION on 3 viewports against deployed URL
- `npx lighthouse <url>/explore?touch=1` for mobile score

## Summary

Round 1 delivered 45 commits, 173 unit tests, 40 Playwright tests, and
closed every content gap in the 15-day plan. The three remaining
completion criteria (#6, #11, #12) are blocked on user action (push +
manual recording + Lighthouse measurement). P1 items above are the
next engineering tasks once the deploy gate opens.
