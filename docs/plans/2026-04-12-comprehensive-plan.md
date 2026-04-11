# Pokemon Explore Mode — Comprehensive 15-Day Plan

> **Update 2026-04-12:** Original 10-day plan expanded to 15 days after mobile view
> was reported completely broken. Added 5 new phases (Day 8.1 through 8.5) dedicated
> to mobile audit, sizing remediation, responsiveness, and exhaustive touch button
> testing. See "Mobile Phases M1-M5" in PART 3.

> Synthesized from 10 parallel brainstorming subagents (mobile device matrix, game
> flow coverage, UI sizing audit, content completeness, API integration, performance
> and accessibility, KOSTAS state machine and story, save state edge cases, error
> handling and edge cases, and content production). Every section cites the
> originating brainstorm so we can trace any decision back to the source reasoning.
>
> This plan is meant to be executed as a ralph loop — the same prompt is fed back
> to the agent repeatedly, and each iteration must check off items with evidence.
> The plan is NOT a suggestion list. Every task is mandatory, numbered, and has
> explicit acceptance criteria.

---

## EXECUTIVE SUMMARY

The game is ~50% complete. Engine, systems, save state, touch controls, and
website integration are in place. **Content is the remaining gap.** Specifically:

1. **KOSTAS state machine is a stub** — only priority 1 (hand out the next badge
   in a hardcoded order) is wired. Priorities 2-7 (close-to-badge hints, new
   content, Research Log, MEW story, general guidance, complete state) don't exist.
2. **Papers are misaligned** — code has 5 generic paper items, design requires 10
   specific papers. Route trainers (4) don't exist at all.
3. **Pokemon placements have drifted** — positions don't match the design doc's
   placement table. Some Pokemon are on the wrong route.
4. **Hidden items are all wrong** — code treats key items (resume, scholar,
   LinkedIn, HuggingFace, GitHub) as hidden when the design says they should be
   visible item balls. The actual hidden items (Twitter, Email, 4 hidden TMs)
   are missing.
5. **Blog NPC system doesn't exist** — zero blog NPCs, the accept-blog yes/no
   flow is unimplemented.
6. **MEW and the phone number story are entirely absent** — the emotional climax
   of the game is not in the code.
7. **Live API NPCs are stubbed as static text** — Spotify/Strava/GitHub/PyPI
   integration has all the backend infrastructure (routes exist at
   `/api/spotify/now-playing`, `/api/strava/recent`, `/api/stats/github`,
   `/api/stats/pypi`, `/api/stats/huggingface`) but no NPC calls them.
8. **Badge naming mismatch** — code uses `phd/scholar/opensource/author/fullstack/explorer/devoted/champion`,
   design doc §2 uses `GYM/PUBLICATION/CONNECTED/POKEDEX/BLOGGER/ENGINEER/COMPLETIONIST/CHAMPION`.
   Must be reconciled before content writing begins.
9. **Real bugs found by edge-case audit** — `updateSave` read-modify-write race
   (silent data loss), DialogBox missing `e.repeat` guard, `DialogSystem.showDialog`
   overwriting `resolveDialog` (hung awaits), no `webglcontextlost` handler.
10. **Mobile view reported completely broken by user** — requires 5 dedicated phases
    (Day 8.1 through 8.5) for resolution audit, sizing remediation, responsiveness
    testing, and exhaustive touch button functional testing. Expected ~150+ P0 sizing
    findings across 15 viewports × 14 scenes = 210 screenshots. Every finding must
    be closed before Day 9 playthrough.

The plan below fixes all of this in **15 days** of focused work (was 10, expanded to
accommodate the mobile audit phases), with exhaustive testing at every step.

---

## PART 1 — KNOWN BUGS (must fix before content starts)

### P0 engine bugs (fix Day 0.5, before Day 1)

| # | Bug | File | Evidence | Fix |
|---|---|---|---|---|
| B1 | `updateSave` read-modify-write race — two async paths in same tick cause silent data loss | `src/game/systems/GameSave.ts:162` | Brainstorm #8 (save state) | Add in-memory cache + flush queue |
| B2 | DialogBox missing `e.repeat` guard — holding A skips dialogs before typewriter | `src/components/game/DialogBox.tsx:108` | Brainstorm #9 (edge cases) | `if (e.repeat) return;` |
| B3 | `DialogSystem.showDialog` overwrites `resolveDialog` — second call hangs first await | `src/game/systems/DialogSystem.ts:112` | Brainstorm #9 | Queue or throw on double-call |
| B4 | No `webglcontextlost` handler — black canvas permanent on GPU hiccup | — | Brainstorm #6 | Add listener + restore |
| B5 | `bgm.stop()` missing from PhaserGame unmount — BGM leaks on navigation | `src/components/game/PhaserGame.tsx:174` | Brainstorm #9 | Call `bgm.stop()` in cleanup |
| B6 | `visibilitychange` not wired to BGM pause — audio plays in background tab | — | Brainstorm #6, #9 | Add listener |
| B7 | Badge ID mismatch between code and design doc §2 | `src/game/systems/BadgeMilestones.ts` vs `explore-mode-final.md` | Brainstorm #4, #7 | Pick doc names, rename across codebase |

### P1 bugs (fix alongside content days)

- `urlsOpened` uses item display name, not id — renames break it (brainstorm #8)
- `pocketArrayKey` returns `keyof GameSave`, TypeScript can't narrow — already fixed in Phase 3 commit `ff3df2f` but verify
- No save corruption backup — corrupted save silently becomes new game (brainstorm #8)
- Multi-tab save race — no `storage` event listener (brainstorm #8)
- No safe-area-inset handling for iPhone notch in landscape (brainstorm #3)
- Ghost `devoted` badge in code that doesn't exist in design doc §2 (brainstorm #7)

---

## PART 2 — CONTENT GAPS (must fill during 10 days)

### Papers (design says 10, code has 5 generic)
- Missing: `paper_explore` (ExPLoRe ECCV), all 4 route papers (Hybrid Girvan-Newman,
  Occasionally Secure, Teaching Asst Pseudo-Labels, Koopman Transition)
- All existing 5 share one Google Scholar URL — each needs its own venue URL
- Dissertation PDF key item (given by KOSTAS on gym completion) — missing

### Gym trainers (design says 6, code has 4)
- Missing: RESEARCHER EMMA (MEDiC), RESEARCHER FRANK (ExPLoRe)
- Existing 4 have wrong names (Shawn/Vivian/Ben/Kirk vs Anna/Blake/Chen/Diana)
- Positions don't match design layout

### Pokemon (30 needed, ~31 placed but drifted coords)
- Most Route 111 Pokemon at wrong y-coordinates
- Some placed on wrong route entirely (HGG in RS: design 111, code 117)
- Descriptions are STUB one-liners — need 2-line project descriptions

### NPCs — live API (5 needed, 0 wired)
- Spotify Guy (Mauville 57,57) — needs `/api/spotify/now-playing` fetch
- Strava Nerd (Pokecenter 11,4) — needs `/api/strava/recent` fetch
- Day Care Man (Route 117 37,54) — needs `/api/stats/github` fetch
- Step Tracker (Mart 5,5) — needs localStorage step formatting
- Clerk (Mart 1,3) — needs `/api/stats/pypi` fetch
- All async infrastructure (NPCSystem.ts:413 awaits `dialogFn`) is ready

### NPCs — blog (10 needed, 0 wired)
- Zero blog NPCs exist. 10 positions spec'd in design. 1 gives launch blog, 9 "coming soon"

### TMs (20 needed, 11 defined)
- Missing: REACT, TYPESCRIPT, SUPABASE, GCP, VERCEL, REDIS, WANDB, POSTGRESQL, system_design
- Placement misconfigured — visible item balls not placed, hidden TMs not in hiddenItems.ts,
  NPC-given TMs missing NPCs

### Hidden items (design: 2 hidden key + 4 hidden TMs = 6)
- Code has 6 WRONG hidden items — treats visible key items (resume, scholar, LinkedIn,
  HuggingFace, GitHub) as hidden
- Missing: TWITTER.URL (95,55), EMAIL (63,5), all 4 hidden TMs

### KOSTAS state machine (7 priorities, only 1 stubbed)
- Priority 1 (grant next badge) — stubbed with single templated line
- Priority 2 (close to badge hint) — MISSING
- Priority 3 (new content detection) — MISSING
- Priority 4 (Research Log delivery) — MISSING
- Priority 5 (MEW/phone number reaction) — MISSING
- Priority 6 (general guidance) — MISSING
- Priority 7 (complete state) — MISSING

### Badge-specific dialogs (8 unique needed, 1 templated)
- 6 KOSTAS monologues from §5a — MISSING
- 1 gym completion speech from §4 — MISSING
- 1 CHAMPION reaction story from §12 — MISSING

### Research Log (8 design entries, 6 code entries)
- Missing entries #7 and #8
- Existing 6 need tightening (Research Log #5 "8,300 followers" is weakest per brainstorm #7)
- KOSTAS never delivers the log during gym visits

### MEW + phone number — entirely missing
- MEW sprite at (139,59): MISSING
- Pokedex entry #0 or #999: MISSING
- CHAMPION badge grant via MEW: routed through KOSTAS instead (incorrect)
- §12 emotional monologue (30 lines): MISSING
- Phone number key item reward: MISSING

### Signs (~20 needed, ~14 present)
- Missing: Blog Tower, Game Corner, Bike Shop (wording off)
- Out-of-bounds easter egg NPCs (§19): MISSING
- Phone number Pokeball (3,58 west edge alternate path): MISSING

### `{NAME}` interpolation (0 uses anywhere)
- No NPC dialog uses the player's name
- Not even KOSTAS in his badge grant monologues

### Gates + field moves (both empty)
- `GATES` array empty
- `FIELD_MOVE_AWARDS` array empty
- Decisions needed: which 2-3 gates, which badges teach which moves, which Pokemon
  learn them

---

## PART 3 — 15-DAY DAILY PLAN

Each day has:
- **Scope**: the specific deliverables
- **Files touched**: exact paths
- **Testing**: what must pass
- **Dependencies**: what must be done first
- **Risk**: what might go wrong
- **Backup plan**: what to cut if running late

### Day roster

| Day | Phase | Focus |
|---|---|---|
| 0.5 | Setup | Engine bugs + test infrastructure |
| 1 | Map | Map audit, gates, gym puzzle |
| 2 | Content | Gym trainers + 6 papers + gym-complete speech |
| 3 | Content | KOSTAS state machine (7 priorities) + Research Log rewrite |
| 4 | Content | Route trainers + 4 papers + launch blog |
| 5 | Content | Wild Pokemon ×30 + boundary blockers + MEW |
| 6 | Content | TMs ×20 + key items ×7 + hidden items |
| 7 | Content | Signs + live API NPCs + interior copy |
| 8 | Content | Audio + sprites + UI copy + analytics |
| **8.1** | **Mobile M1** | **Resolution audit across device matrix (210 screenshots)** |
| **8.2** | **Mobile M2** | **Element sizing remediation (close every P0 finding)** |
| **8.3** | **Mobile M3** | **Responsiveness + orientation + dynamic viewport tests** |
| **8.4** | **Mobile M4** | **Touch button testing part 1 (D-pad + A button, ~30 scenarios)** |
| **8.5** | **Mobile M5** | **Touch button testing part 2 + multi-touch (~60 scenarios)** |
| 9 | QA | End-to-end playthrough #1 + P0 fix list |
| 10 | Launch | P1 fix pass + deploy + smoke test

### Day 0.5 — Engine bug fixes + test infrastructure setup

**Scope (A) — Test infrastructure:** Set up everything from PART 4 infrastructure
section so every subsequent day has tests to write into.

- Install dev deps: `vitest @vitest/coverage-v8 happy-dom @axe-core/playwright pixelmatch pngjs`
- Create `vitest.config.ts`
- Rewrite `playwright.config.mjs` with 8 projects
- Create `tests/{unit,integration,e2e,visual,a11y,perf,regression,fixtures,helpers,snapshots}/` directory tree
- Create `tests/helpers/game.ts`, `viewports.ts`, `axe.ts`
- Add 3 initial save fixtures (`fresh-new-game.json`, `post-birch.json`, `100-complete.json`)
- Add query param harness to `src/pages/explore.astro` (gated by `import.meta.env.DEV` or `?test=1`)
- Add `package.json` test scripts
- Clean up 200+ stray screenshots from `/tests/` and root (move to `tests/_archive/` or delete)
- Create `scripts/generate-test-data.mjs` that dumps NPC list, Pokedex, and reachability data
  to `tests/fixtures/*.json` (used by content consistency tests)

**Scope (B) — P0 engine bugs:** Fix all 7 P0 bugs (B1-B7) from Part 1.

**Files touched:**
- `vitest.config.ts` (new)
- `playwright.config.mjs` (rewrite with projects)
- `tests/helpers/*.ts` (new)
- `tests/fixtures/saves/*.json` (3 initial)
- `scripts/generate-test-data.mjs` (new)
- `package.json` (add dev deps + scripts)
- `src/pages/explore.astro` (query param harness)
- `src/game/systems/GameSave.ts` — in-memory cache + flush queue for updateSave
- `src/components/game/DialogBox.tsx` — `e.repeat` guard
- `src/game/systems/DialogSystem.ts` — queue or throw on double showDialog
- `src/game/scenes/OverworldScene.ts` + `InteriorScene.ts` — webglcontextlost listener
- `src/components/game/PhaserGame.tsx` — `bgm.stop()` in cleanup + visibilitychange listener
- `src/game/systems/BadgeMilestones.ts` + `src/game/data/interiors.ts` — badge ID rename

**Testing:**
- `npm run test:unit` runs and passes zero tests (infrastructure works)
- `npm run test:e2e` runs a single smoke test against dev server
- `npx vitest run tests/regression/reg-tsc.test.ts` runs tsc --noEmit and passes
- Playwright: hold A for 3 seconds through Birch speech, verify no lines skipped (B2)
- Playwright: two NPCs trigger dialog in same frame, verify no hang (B3)
- Playwright: background tab for 10 seconds, return, verify BGM paused and resumed (B5, B6)
- Unit test: `updateSave` called twice in same tick does not lose data (B1)
- Manual: grep codebase for all badge IDs to verify rename (B7)
- `npx tsc --noEmit` clean
- `npm run build` clean

**Risk:** Badge rename touches many files. Missed references cause runtime errors.
Mitigation: grep for each old ID before rename, verify each replacement. Use
regression test `reg-checkbadges-collision.test.ts` to enforce post-rename.

---

### Day 1 — Map audit, gate freeze, gym puzzle freeze

**Scope:**
- Run `node scripts/map-analyzer.mjs` and review every unreachable tile
- Cross-reference every coord in design doc §4/§7/§8/§9/§10/§11/§14 against safe-tile set
- Move any rejected coords to the nearest safe tile
- Record all placement deltas in `docs/plans/placement-deltas.md`
- Freeze 2-3 gates in `src/game/data/gates.ts`
- Freeze `FIELD_MOVE_AWARDS` (badge→pokemon→move triples)
- Freeze gym puzzle in `src/game/data/gym-puzzle.ts` (6 trainer positions + aside coords from §4)

**Files touched:**
- `src/game/data/gates.ts`
- `src/game/data/fieldMoveAwards.ts`
- `src/game/data/gym-puzzle.ts`
- `docs/plans/placement-deltas.md` (scratch — delete at end)

**Testing:**
- `node scripts/map-analyzer.mjs` reports zero unreachable NPCs, zero collision-tile placements
- `node scripts/map-analyzer.mjs --test X,Y` for each proposed gate position — verify it
  doesn't disconnect any zones
- `npx tsc --noEmit` clean
- Playwright: boot game, verify no startup errors

**Dependencies:** Day 0.5 bugs fixed.

**Risk:** Gate position causes a zone to become unreachable (Tarjan articulation point).
Mitigation: use the `--test X,Y` mode of map-analyzer to simulate each gate before committing.

**Decisions needed (answer via 5-subagent brainstorm if uncertain):**
- Which badge unlocks which field move?
- Which Pokemon in the party learns each field move?
- Where exactly are the 2-3 gate tiles?

---

### Day 2 — Gym trainers + KOSTAS gym-completion + dissertation

**Scope:**
- Write 6 gym trainer entries (RESEARCHER ANNA→FRANK) in `src/game/data/interiors.ts`
  gym section. Each trainer: persona line, pre-interact dialog (2-3 lines), paper-giving
  dialog with venue + 1-line takeaway, cleared dialog
- Write 6 paper entries in `src/game/data/itemDefinitions.ts`:
  - `paper_mclc` (mCL-LC WACV 2023)
  - `paper_crossscale_mae` (Cross-Scale MAE NeurIPS 2023)
  - `paper_multiscale_rs` (Multi-Scale RS Fine-Tuning IGARSS 2024)
  - `paper_trustworthy_ai` (Trustworthy AI for Dementia CHASE 2025)
  - `paper_medic` (MEDiC CLIP Distillation arXiv 2026)
  - `paper_explore` (ExPLoRe ECCV Under Review)
- Each paper: real title, venue, arXiv/OpenReview URL, 1-2 line description
- Write KOSTAS gym-completion sequence from design §4 verbatim into KOSTAS dialogFn
- Add DISSERTATION.PDF key item to `itemDefinitions.ts` with URL (use `#` placeholder if
  defense pending)
- Add `gymCompletedFirstTalk` flag to GameSave to prevent re-firing

**Files touched:**
- `src/game/data/interiors.ts` — gym section
- `src/game/data/itemDefinitions.ts` — 6 papers + dissertation
- `src/game/systems/GameSave.ts` — `gymCompletedFirstTalk` field

**Testing (per brainstorm #2 flow scenarios):**
- Playwright: enter gym, walk gauntlet, talk to each trainer in order, verify each paper
  added to bag, verify each trainer walks to aside position
- Screenshot after each trainer interaction, read visually
- Reach KOSTAS, verify §4 monologue plays, GYM badge granted, DISSERTATION key item given
- Re-enter gym after completion, verify monologue doesn't re-fire
- Each paper URL opens a valid page (curl or Playwright request check)
- Test on desktop 1440×900, mobile landscape 852×393, mobile portrait 393×852
- Read aloud each dialog for pacing — no line should feel rushed or awkward
- KOSTAS badge dialog uses `{NAME}` for player name
- `npx tsc --noEmit` clean
- `npm run build` clean

**Dependencies:** Day 1 coords frozen.

**Risk:** Unreleased paper URLs (MEDiC arXiv 2026, ExPLoRe ECCV under review). Use `#`
placeholder with TODO note, document in `docs/plans/url-todo.md`.

**Backup plan:** If 6 trainers can't fit in gym room per §4 layout, drop to 5 and merge
ExPLoRe into another trainer's dialog.

---

### Day 3 — KOSTAS state machine (priorities 1-7) + Research Log rewrite

**Scope:**
- Implement all 7 priorities in KOSTAS's `dialogFn` as a resolver function
  `resolveKostasDialog(save): DynamicDialogResult`
- Priority 1 — unclaimed badge: find first unclaimed in canonical order, grant with
  unique monologue from §5a (6 unique texts for GYM/PUBLICATION/CONNECTED/POKEDEX/BLOGGER/ENGINEER/COMPLETIONIST)
- Priority 2 — close to badge (>80%): pick the badge closest to done (fewest items
  remaining), give a route-based hint ("One paper left. Route 111.")
- Priority 3 — new content: compare `save.lastKnownCounts` to current totals, fire
  specific delta dialog, update snapshot in afterDialog
- Priority 4 — Research Log milestone: call `shouldAwardResearchLog()`, unlock next
  entry, grant RESEARCH LOG key item on first milestone
- Priority 5 — CHAMPION first-sight: fire §12 MEW monologue verbatim, grant phone
  number key item, mark `championMonologueShown` in save
- Priority 6 — general guidance: lowest-completion category with rotating phrasings
  (pool of 3 per category, bias away from `kostasLastHintCategory`)
- Priority 7 — complete state: "You're up to date" with occasional Easter egg lines
  every 10th visit
- Rewrite 6 Research Log entries in `src/game/data/researchLog.ts` — tighten per
  brainstorm #7 recommendations:
  - #1: replace "Best decision of my life" with specific moment
  - #2: clarify which paper got rejected, add reviewer comment
  - #3: keep
  - #4: keep ("I cried a little")
  - #5: replace slogans with concrete moment (reader email)
  - #6: keep, use real April 2026 defense date
- Rewrite BLOGGER badge dialog (currently weakest) to acknowledge something specific
- Remove the "Wahahahaha!" line (off-character per brainstorm #7)
- Add `{NAME}` interpolation in every KOSTAS monologue

**Files touched:**
- `src/game/data/interiors.ts` — full KOSTAS dialogFn rewrite
- `src/game/data/researchLog.ts` — 6 entry rewrites
- `src/game/systems/GameSave.ts` — add `kostasState` substructure (lastReadLogEntry,
  championMonologueShown, kostasLastHintCategory, visitCount)

**Testing:**
- Unit tests (new, Vitest): one test per priority with fake save state, assert dialog
  output matches expected prefix
- Playwright: 7 save-state fixtures (one per priority), each visits KOSTAS, screenshot
  the dialog, read visually
- Priority 3: set lastKnownCounts to 5, add 2 items, reload, visit KOSTAS, verify
  new-content dialog fires with "2 new"
- Priority 4: accumulate 5 discoveries, visit KOSTAS, verify log unlocks and
  RESEARCH LOG item granted
- Priority 5: manually set save.badges to include champion, visit KOSTAS, verify MEW
  monologue plays, verify phone number key item in bag
- Priority 6: empty save, visit KOSTAS, verify guidance points to lowest category
- Priority 7: 100% complete save, visit KOSTAS, verify complete dialog
- Test `{NAME}` interpolation: set playerName to "ALEX", verify dialog reads "ALEX"
- Read each monologue aloud for tone check
- All tests on desktop + mobile landscape + mobile portrait
- `npx tsc --noEmit` clean

**Dependencies:** Day 2 (needs gym completion flow working for priority 1 to test).

**Risk:** Priority ordering bug — easy to write priority 6 so it masks priority 4.
Mitigation: each priority returns `null` on miss, resolver walks the array, tests
cover all 7 branches.

**Decisions needed:**
- MEW story anchor: real person or fiction? Brainstorm #7 flagged this as needing user input.
  Default: fictional framing with specific details ("We were lab partners. Bredesen, 2023.")
- Phone number format: real redacted digits, clickable `/contact` link, or obfuscated?
  Default: clickable `/contact` link presented as a key item.

---

### Day 4 — Route papers + route trainers + launch blog

**Scope:**
- 4 route trainer NPCs in `src/game/data/npcs.ts`:
  - VETERAN GEORGE (Route 117, 25,58) — Hybrid Girvan-Newman paper
  - HACKER YUKI (Route 118, 97,57) — Occasionally Secure paper
  - TUTOR MARCUS (Route 111, 62,40) — Teaching Asst Pseudo-Labels paper
  - ENGINEER SARAH (Route 110, 62,82) — Koopman Transition paper
- Each trainer: persona + yes/no paper-offer dialog + accept branch + decline branch
  + already-given branch
- 4 route paper entries in `itemDefinitions.ts`: title, venue, URL, 1-2 line description
- 1 launch blog NPC at Mauville (68,56) giving "Why I built a Pokemon game for my
  portfolio" — accept/decline/already-given branches
- 9 "coming soon" blog NPCs (positions from design §11) with identical stub dialog:
  "I'm working on a story... not ready yet! Come back soon!"
- Blog item `blog_launch_post` in `itemDefinitions.ts` with URL to the launch blog post

**Files touched:**
- `src/game/data/npcs.ts` — 4 route trainers + 10 blog NPCs
- `src/game/data/itemDefinitions.ts` — 4 route papers + 1 launch blog item

**Testing:**
- Playwright: walk to each route trainer, decline paper, talk again, accept, verify bag
- Playwright: walk to launch blog NPC, decline, accept, verify blog in bag
- Each "coming soon" blog NPC never gives an item
- Each URL opens valid page
- BLOGGER badge triggers after accepting the 1 launch blog
- Read each trainer's dialog aloud for pacing
- All tests on 3 viewports
- `npx tsc --noEmit` clean

**Dependencies:** Day 1 coords, Day 2 paper infrastructure.

**Risk:** Route trainer coords in design §9 may be in tall grass — grass is walkable
but triggers encounter effects. Verify with map-analyzer.

---

### Day 5 — Wild Pokemon × 30 + boundary blockers + MEW

**Scope:**
- 24 overworld Pokemon in `src/game/data/wild-pokemon.ts` (#7-30) — use exact coords
  from design §10 table. Each entry:
  - Pokedex number
  - Project name (MEDiC, FleetSmart, etc.)
  - Species (Latias, Kyogre, etc.)
  - Position (from design table)
  - 2-line description pulled from old repo data files (`ml-projects.json`,
    `bots-projects.json`, `misc-projects.json`) at
    `~/Insync/Gdrive/Projects/drkostas.github.io/pages/api/`
  - URL (GitHub, HuggingFace, or live project)
  - Encounter dialog
  - "Registered in Pokedex" jingle message
- Verify 6 party-preloaded Pokemon in `src/game/data/party.ts` match design §10
  (MEDiC/FleetSmart/MaskDistill/XpensAI/ShiftMD/Soma) with final descriptions
- 4 boundary blocker entries (Snorlax, Slaking, 2 Slakoth) — each registers a
  Pokedex entry
- 10 Poochyena for Magma/Aqua standoff — all register as same single Pokedex entry
  (dedupe rule)
- MEW entry #0 (or #999) in `src/game/data/pokemon.ts` + `wild-pokemon.ts` at (139,59)
  with:
  - Species: `mew`
  - Pokedex description: "A mythical project said to contain the code of every project
    in this world. Built with Astro, Phaser, and React. It is self-aware."
  - §12 encounter dialog
  - CHAMPION badge grant on interaction (NOT via KOSTAS)
  - Add MEW to `partyMemberIds` via `addToParty("mew")` on interaction

**Files touched:**
- `src/game/data/wild-pokemon.ts` — 30 entries + MEW
- `src/game/data/pokemon.ts` — Pokedex catalog including MEW
- `src/game/data/party.ts` — verify 6 + add `mew` to ALL_PARTY
- `src/game/data/npcs.ts` — boundary blocker NPC entries

**Testing:**
- Re-run map-analyzer — zero unreachable Pokemon, zero collision-tile placements
- Playwright: walk past each of the 30 Pokemon coords, assert Pokedex count hits 30
- Boundary NPCs: each registers a Pokedex entry when interacted
- Poochyena: 10 interactions result in 1 Pokedex entry (dedupe works)
- MEW interaction: sets `championMonologueShown = false`, grants CHAMPION, adds mew
  to party, shows §12 encounter dialog
- Then visit KOSTAS, verify Priority 5 fires with MEW follow-up monologue
- Read each Pokemon description aloud — each feels specific, not generic
- Test each Pokemon URL opens valid page
- All tests on 3 viewports
- `npx tsc --noEmit` clean

**Dependencies:** Day 1 coords frozen, Day 3 KOSTAS priority 5 wired.

**Risk:** Poochyena dedupe relies on `PartyDexRegistrar` logic — verify it holds,
otherwise Pokedex reads 39/30.

**Content source:** Project descriptions come from
`~/Insync/Gdrive/Projects/drkostas.github.io/pages/api/ml-projects.json` and sibling files.

---

### Day 6 — TMs (20) + key items (7) + hidden items

**Scope:**
- 3 PC-preloaded TMs (PYTHON, GIT, LINUX) — verify in `itemDefinitions.ts`
- 9 step-milestone TMs with exact thresholds from design §7:
  - 250 → TAILWIND
  - 500 → FASTAPI
  - 1000 → NEXT.JS
  - 1500 → DOCKER
  - 2000 → PYTORCH
  - 3000 → AWS
  - 4000 → KUBERNETES
  - 6000 → TERRAFORM
  - 8000 → SYSTEM DESIGN
- 2 visible TM item balls (REACT at Mauville 67,67, TYPESCRIPT at Mauville 82,67) —
  add to `npcs.ts` as pickup NPCs
- 4 hidden TMs in `src/game/data/hiddenItems.ts`:
  - SUPABASE at Mauville (58,58)
  - GCP at Route 117 (8,64)
  - VERCEL at Route 118 (120,57)
  - REDIS at Route 110 (62,95)
- 2 NPC-given TMs:
  - WANDB from Route 111 "man near rocks" NPC
  - POSTGRESQL from Route 118 "woman near water" NPC
- 7 key items:
  - 5 visible item balls: RESUME.PDF (Mauville 78,69), GITHUB.URL (Route 117 6,68),
    LINKEDIN.URL (Route 118 107,59), HUGGINGFACE.URL (Route 110 76,117),
    SCHOLAR.URL (Route 111 69,28)
  - 2 hidden: TWITTER.URL (Route 118 95,55), EMAIL (Route 111 63,5)
- Each item: final URL, pickup message, bag description
- **Remove the 6 wrong hidden items currently in `hiddenItems.ts`** (they treat key
  items as hidden when they should be visible)

**Files touched:**
- `src/game/data/itemDefinitions.ts` — 8 missing TM entries + bag descriptions
- `src/game/data/hiddenItems.ts` — delete 6 wrong entries, add 6 correct entries
- `src/game/data/npcs.ts` — 2 visible TM item balls + 2 NPC-given TMs + 5 visible
  key item balls
- `src/game/systems/PCStore.ts` or `GameSave.ts` — verify PC preload of 3 starter TMs

**Testing:**
- Playwright: walk past spawn, verify PYTHON/GIT/LINUX in PC on first boot
- Walk step milestone: walk 250 steps, verify TAILWIND available at mart shop
- Walk to each visible item ball, press A, verify pickup
- Walk to each hidden item tile, press A, verify pickup (multiple presses, verify
  idempotent)
- Talk to each TM NPC, verify TM in bag
- Walk to each key item, verify pickup
- Open every URL in bag, verify no 404s
- COMPLETIONIST badge: open all URLs, verify `urlsOpened.length` equals total openable,
  verify badge auto-awarded
- CONNECTED badge: all 7 key items in bag, verify badge condition met
- FULL STACK badge: all 20 TMs in bag, verify badge condition met
- All tests on 3 viewports

**Dependencies:** Day 1 coords, Day 2 badge naming reconciled.

**Risk:** EMAIL key item should not expose raw email to scrapers. Use `mailto:`
obfuscated or redirect via `/contact` page.

---

### Day 7 — Signs + live API NPCs + interior copy + Research Log wiring

**Scope:**
- ~20 signs in `src/game/data/npcs.ts` MAUVILLE_SIGNS / ROUTE_SIGNS:
  - Zone entry signs (Route 117/118/110/111)
  - Building front signs (Pokemon Center, Mart, Gym, Bike Shop "OPENING SOON",
    Game Corner "CLOSED FOR RENOVATION", Blog Tower "MAUVILLE BROADCAST TOWER —
    Currently off-air")
  - 3-5 flavor signs (trees/rocks/fences with Cycling Road-style jokes)
- 5 live API NPC wirings in `src/game/data/npcs.ts` + new helper files:
  - `src/game/npcs/live/spotify.ts` — fetches `/api/spotify/now-playing`, formats dialog
  - `src/game/npcs/live/strava.ts` — fetches `/api/strava/recent`
  - `src/game/npcs/live/github.ts` — fetches `/api/stats/github`
  - `src/game/npcs/live/pypi.ts` — fetches `/api/stats/pypi`
  - `src/game/npcs/live/steps.ts` — reads localStorage step count
- Each helper has:
  - 5s AbortController timeout
  - Try/catch with fallback dialog
  - Relative time formatting via `Intl.RelativeTimeFormat`
  - Number formatting via `Intl.NumberFormat`
  - Truncation helper for long track/repo names (25 char cap)
- `src/game/utils/format.ts` — shared formatters
- Interior NPCs:
  - Pokemon Center Nurse Joy (7,2) — **rotating** hints (5 hints, cycle on each visit)
  - Pokemon Center Youngster (2,7) — Pokedex hint
  - Mart Developer (2,6) — flavor + Route 118 hint
  - Mart Expert (5,4) — YAML configs flavor
- Wire `shouldAwardResearchLog()` into KOSTAS priority 4 (verify from Day 3)

**Files touched:**
- `src/game/data/npcs.ts` — signs + 5 live API NPC entries
- `src/game/data/interiors.ts` — interior NPC copy
- `src/game/npcs/live/*.ts` — 5 new helper files
- `src/game/utils/format.ts` — new file
- `src/game/types/npc.ts` — verify `dialogFn` supports `Promise<DynamicDialogResult>`

**Testing:**
- Read every sign in-game, verify text renders and doesn't overflow
- Spotify NPC: mock `/api/spotify/now-playing` to return real track data, verify dialog
  shows "♪ 'track' by artist"
- Spotify NPC fallback: mock 500 response, verify fallback dialog shows
- Spotify NPC timeout: mock 10s response, verify 5s abort + fallback
- Strava NPC: similar, with activity + YTD stats
- GitHub NPC: similar, with commits this week + most active repo
- PyPI NPC: similar, with top package + total downloads
- Step Tracker NPC: walk 100 steps, verify NPC shows "Steps: 100"
- Nurse Joy: visit 5 times, verify 5 different hints, then cycles
- Playwright with network offline: verify every live NPC shows fallback, no crash
- All tests on 3 viewports

**Dependencies:** Days 2-6 (needs state to format guidance against).

**Risk:**
- Strava refresh token rotation — verify `src/lib/strava.ts` handles it
- Unicode track/repo names may not render in pixel font — verify with test track
  containing Japanese characters

---

### Day 8 — Audio triage + sprite final pass + UI copy + analytics

**Scope:**
- Audio verify every file named in design §20:
  - `encounter_ding.ogg` (must have) — verify present in `public/game/audio/sfx/`
  - `badge_jingle.ogg` (must have) — verify
  - `phone_ring.ogg` (for OAK notification) — source or placeholder
  - `gym_music.ogg` — verify `mus_gym.ogg` present
  - `pokecenter_music.ogg` — verify
  - `mart_music.ogg` — verify
  - `research_log.ogg` (nice to have) — placeholder if missing
  - `mew_cry.ogg` — placeholder if missing
  - BGM: verify Route 117/118/110/111 each have a track assigned
- Sprite verify every NPC written Days 2-7:
  - 6 gym researchers (use `scientist_1`, `woman_3`, `maniac`, `school_kid_m`, etc.)
  - 4 route trainers (use `hiker` for veteran, `rocker` or similar for hacker,
    `rich_boy` for tutor, `school_kid_f` for engineer)
  - 10 blog NPCs (rotate through existing sprites)
  - 2 TM NPCs
  - 5 live API NPCs
  - Interior NPCs (nurse, youngster, old man, etc.)
- Each sprite references `public/game/sprites/emerald/*.png` — verify no 404s
- UI copy:
  - Dialog box strings (system messages like "Obtained X!")
  - Menu labels (verify POKeDEX, POKeMON, BAG, player name, HELP, OPTION, EXIT)
  - Objective checklist text on Trainer Card back
  - New-content OAK notification copy (§17)
- Analytics wiring — verify Umami events fire on:
  - `game-start` with {name, gender}
  - `pokedex-register` with {pokemon}
  - `paper-collected` with {paper, source: 'gym'|'route'}
  - `blog-collected` with {blog}
  - `badge-earned` with {badge}
  - `url-opened` with {type, id}
  - `champion-badge`
  - `phone-number-received`
- **Privacy note:** strip `playerName` from analytics events per brainstorm #5

**Files touched:**
- `src/game/data/npcs.ts` + `interiors.ts` — sprite assignments
- `src/game/scenes/BootScene.ts` — audio preload manifest
- `src/game/systems/Analytics.ts` — verify all events wired
- `public/game/audio/sfx/` — add missing placeholder SFX

**Testing:**
- Playwright: screenshot every scene at 480p, 768p, 1280p, 1920p
- Each NPC sprite loads without 404 (network tab check)
- Audio autoplay works on first user gesture
- Every Umami event fires (verify via network tab or local stub)
- All UI copy readable at 3 viewports

**Dependencies:** Day 7 complete.

**Risk:** Missing SFX block CHAMPION ending. Fallback: reuse `29-received-an-item.mp3`
for missing cues.

---

### Day 8.1 — Mobile Phase M1: Resolution audit across the full device matrix

**Scope:** Brutal visual audit of EVERY screen across EVERY viewport in the matrix.
Capture screenshots on all 15 viewports for each of the 14 game scenes. That's 210
screenshots minimum. Every one is read visually with the Read tool and scored.

**Viewports to test (15):**
- Desktop: 1920×1080, 1440×900, 1280×720
- Tablet landscape: 1366×1024, 1024×768
- Tablet portrait: 1024×1366, 768×1024
- Mobile landscape: 915×412 (Pixel 7), 852×393 (iPhone 14 Pro), 667×375 (iPhone SE)
- Mobile portrait: 412×915 (Pixel 7), 393×852 (iPhone 14 Pro), 375×667 (iPhone SE)
- Edge: 320×480 (refuse gracefully), 2560×1080 (ultrawide)

**Scenes to capture on each viewport (14):**
1. GameLoadingScreen
2. Title screen (Rayquaza + PRESS ENTER)
3. Main menu (CONTINUE/NEW GAME/WEBSITE)
4. Birch speech mid-dialog
5. Birch gender select menu
6. Birch name input grid
7. Overworld spawn (Mauville)
8. Pokemon Center interior
9. Mart interior
10. Gym interior (with puzzle)
11. NPC dialog mid-conversation
12. Start menu open
13. Bag menu (each pocket: papers, blogs, key items, TMs = 4 sub-screenshots)
14. Pokedex list + detail

**Method:**
- Playwright script iterates viewports × scenes via save fixtures + query params
- Each screenshot saved to `tests/snapshots/mobile-audit/<viewport>-<scene>.png`
- **Each screenshot is READ with the Read tool** — not just generated
- For each screenshot, write a one-line observation to `docs/plans/mobile-audit-findings.md`:
  - Element too small / too large / clipped / overlapping / overflowing
  - Text illegible / wrapping badly / cut off
  - Touch controls overlapping game content
  - Button not reachable by thumb
  - Any visual artifact

**Deliverables:**
- `docs/plans/mobile-audit-findings.md` — complete observation log, ~210 entries
- `tests/snapshots/mobile-audit/` — 210 labeled PNGs
- Triage: each finding classified P0 (blocks playthrough) / P1 (visible flaw) / P2 (polish)

**Testing:**
- Playwright script runs to completion with zero errors
- Every screenshot exists and is > 5KB (non-blank)
- Every finding in the log has a screenshot ref

**Dependencies:** Day 8 content mostly complete (not required to be perfect — this
audit can run against stub content as long as the LAYOUT is real).

**Risk:** Findings list is too long to fix in later days. Mitigation: strict P0/P1/P2
triage — P0 must fix Day 8.3, P1 stretch to Day 9, P2 post-launch.

---

### Day 8.2 — Mobile Phase M2: Element sizing remediation across resolutions

**Scope:** Fix every P0 and P1 sizing finding from Day 8.1. This is a focused CSS +
component layout pass across the entire codebase.

**Fix categories (prioritized from brainstorm #3, 100 sizing concerns):**

1. **Dialog box (DialogBox.tsx)**
   - 92% width at 320px = 294px, minus 48px border = 246px text width
   - Narrow screens cause "Professor Birch" to wrap awkwardly
   - Fix: scale font down on tiny viewports, use container queries (cqi units)
   - Apply `clamp(0.5, viewport-width/960, 1.75)` to `--ui-scale-x`

2. **Birch textbox (BirchTextBox.tsx)**
   - Speaker label clips at 320px wide
   - Fix: ensure speaker label position is relative to box, not absolute viewport

3. **Start menu (StartMenu.tsx)**
   - Right-aligned panel gap vanishes at 320px
   - Fix: `right: max(8px, 2%)` floor

4. **Bag menu (BagMenu.tsx)**
   - 4 pocket tabs × 80px = 320px exactly, first/last tabs clip under safe-area
   - Fix: responsive tab width with min 60px each, horizontal scroll fallback

5. **Party menu (PartyMenu.tsx)**
   - 5 stacked rows × 80px exceed viewport below 600px tall
   - Fix: compact mode on narrow screens, two-column layout on tablets

6. **Pokemon Summary (PokemonSummary.tsx)**
   - 4-panel layout breaks below 768px
   - Fix: collapse to tabs on narrow, stack on tiny

7. **Pokedex list (PokedexList.tsx)**
   - Two-column detail pane compresses to 150px on narrow screens
   - Fix: modal/drawer pattern below 768px

8. **Trainer Card (TrainerCard.tsx)**
   - Credit card aspect ratio breaks at extreme widths
   - Badge grid 4×2 → 2×4 at narrow widths, card height doubles
   - Fix: max-width cap + internal scroll

9. **Touch controls (TouchControls.tsx)**
   - D-pad at 40% vmin eats bottom half on 320×568
   - Fix: `clamp(120px, 40vmin, 200px)` ceiling
   - Ensure all buttons meet 44×44 minimum

10. **Safe-area insets**
    - No `env(safe-area-inset-*)` anywhere in codebase
    - Fix: add to touch controls, portrait banner, dialog box bottom offset

11. **Z-index scale**
    - Undocumented z-index ladder across overlays
    - Fix: define explicit scale (100 game, 200 dialog, 300 menu, 400 notification,
      500 banner, 600 touch, 700 modal, 9000 portrait banner)

12. **`--ui-scale-x` and `--ui-scale-y` mismatch**
    - Font sized with sX, line-height with sY — asymmetric at non-square aspects
    - Fix: use same scale for related properties

**Files touched:**
- `src/components/game/DialogBox.tsx`
- `src/components/game/BirchTextBox.tsx`
- `src/components/game/StartMenu.tsx`
- `src/components/game/BagMenu.tsx`
- `src/components/game/PartyMenu.tsx`
- `src/components/game/PokemonSummary.tsx`
- `src/components/game/PokedexList.tsx`
- `src/components/game/TrainerCard.tsx`
- `src/components/game/TouchControls.tsx`
- `src/components/game/PhaserGame.tsx` — `--ui-scale-x/y` with clamp()
- `src/styles/global.css` — z-index scale documentation + safe-area inset utilities

**Testing (relentless):**
- After EACH component fix, re-run Day 8.1 screenshots for that component's scene
  across all 15 viewports
- Read each screenshot visually, score against findings log
- Fix must close ALL P0s for its component before moving on
- Total: ~100 P0 findings × 5 min each = ~8 hours of iterate/screenshot/fix/re-verify
- **Do NOT move to Day 8.3 until Day 8.2 closes every P0 finding**

**Dependencies:** Day 8.1 findings list complete.

**Risk:** Deep layout rewrites may break desktop. Mitigation: visual regression
on desktop viewports after each fix.

**Backup plan:** If running out of time, cut tablet viewport support — focus only on
mobile-port-393x852 + desktop-1440x900. P1s go to Day 9.

---

### Day 8.3 — Mobile Phase M3: Responsiveness + orientation + regression

**Scope:** Dynamic behavior tests — what happens when the viewport CHANGES mid-game.

**Test scenarios:**

1. **Orientation change mid-game**
   - Start in portrait, walk 3 tiles, rotate to landscape
   - Verify player position preserved
   - Verify touch controls reposition
   - Verify canvas resizes without blanking
   - Verify camera zoom updates
   - Verify dialog box if open re-centers
   - Verify menu if open re-lays out

2. **Browser address bar show/hide (mobile)**
   - Chrome Android: address bar hides on scroll → viewport grows +56-80px
   - Safari iOS: address bar collapses → viewport grows
   - Game must re-fit canvas without corrupting player position
   - Touch controls must reposition

3. **Browser zoom (ctrl + / -)**
   - 100%, 125%, 150%, 200% zoom levels
   - Verify touch targets still meet 44×44 in CSS pixels
   - Verify pixel-perfect rendering holds

4. **Window resize (desktop)**
   - Drag window from 1920 to 320 wide
   - Verify every breakpoint triggers layout change
   - Verify touch controls appear below 768px (if `isTouchDevice()` re-evaluates)

5. **DPR variations**
   - 1x (old Android), 2x (iPhone 6-8), 2.625x (Pixel 7), 3x (iPhone X+)
   - Verify pixel art sprites render sharp at each DPR
   - Watch for bleed lines at non-integer DPR

6. **iOS Safari specific**
   - Home indicator safe area bottom
   - Dynamic Island safe area left (landscape)
   - Bottom tab bar appearing on scroll
   - Pull-to-refresh triggering when holding d-pad up

7. **Android Chrome specific**
   - Pull-to-refresh disabled via `overscroll-behavior: none` on game container
   - Back gesture from edge does not leave game mid-dialog

8. **Foldables**
   - Galaxy Z Fold folded 316×840: game refuses gracefully or reflows
   - Inner screen near-square aspect: neither landscape nor portrait assumption holds
   - Hinge crease location

9. **Split-screen (iPad Split View, Android split-screen)**
   - 1/3 width on iPad Pro (~320px) mid-game
   - Verify game still functional

**Test method:**
- Playwright with `emulateMedia({ media: 'screen' })` and `page.setViewportSize()`
- Chrome DevTools Protocol for DPR simulation
- `browser_evaluate` to trigger orientation events
- `window.resizeTo()` for mid-game resize

**Deliverables:**
- `tests/e2e/mobile-responsive.spec.ts` — new test file with ~20 dynamic scenarios
- Every test takes screenshots before + after the change and reads them visually
- Findings from this phase added to `mobile-audit-findings.md` and triaged

**Dependencies:** Day 8.2 (static sizing must be correct before testing dynamic changes).

**Risk:** Orientation handling is notoriously buggy on iOS Safari. Mitigation: test
against a real iPhone via browser_take_screenshot if Playwright emulation is unreliable.

---

### Day 8.4 — Mobile Phase M4: Touch button functional testing (part 1)

**Scope:** Test EVERY touch button (d-pad ×4 directions, A, B, START, RUN, Fullscreen)
in EVERY scenario it will be used. This phase covers scenarios 1-30.

**Scenarios to test per button:**

**D-PAD (per direction ×4):**
1. Tap once → player moves one tile in direction
2. Hold → player walks continuously
3. Slide from center to direction → movement starts
4. Release → movement stops on next tile boundary
5. Slide between directions while held → direction changes smoothly
6. Tap during dialog → blocked, player doesn't move
7. Tap during menu → menu cursor moves (via synthetic arrow key)
8. Tap during Birch speech → blocked
9. Tap during warp transition → blocked
10. Tap while running (RUN toggle on) → player runs in direction
11. Tap at wall → walk-in-place animation + bonk SFX
12. Tap at ledge → hop animation
13. Tap at NPC → blocked, player faces NPC
14. Tap at warp tile → triggers warp
15. Multi-touch: d-pad down + A button → both work

**A BUTTON:**
1. Tap during dialog (typewriter mid-reveal) → skip to end
2. Tap during dialog (text done) → advance to next page
3. Tap on last dialog page → close dialog
4. Tap facing NPC → open NPC dialog
5. Tap facing sign → open sign text
6. Tap on empty tile → no-op (with SFX?)
7. Tap on hidden item tile → pickup
8. Tap during menu → select highlighted item
9. Tap on Birch text → advance
10. Tap on gender menu → confirm selection
11. Tap on name grid cell → input letter
12. Tap on YES/NO prompt → confirm
13. Tap during Pokemon encounter → register
14. Tap on PC tile → open PC interface
15. Rapid tap 10×/second → no skipped dialogs

**Test method:**
- Playwright touch events: `page.dispatchEvent(TouchEvent)`
- `browser_evaluate` to verify `touchState` flags update
- `browser_evaluate` to verify Grid Engine player position/facing after each tap
- Screenshots before + after each interaction
- Console error check after each tap

**Deliverables:**
- `tests/e2e/mobile-touch-buttons-1.spec.ts` — d-pad + A scenarios
- ~30 test cases, each with Playwright code + screenshot verification
- Bugs logged to `mobile-audit-findings.md`

**Dependencies:** Day 8.3 responsiveness fixes done.

**Risk:** Synthetic touch events behave differently than real ones on some browsers.
Mitigation: also test on real device if Playwright emulation fails.

---

### Day 8.5 — Mobile Phase M5: Touch button functional testing (part 2) + multi-touch edge cases

**Scope:** Complete touch testing for B, START, RUN, Fullscreen buttons plus
multi-touch edge cases and stress tests. Covers scenarios 31-60.

**B BUTTON scenarios:**
1. Tap during menu → close menu to previous level
2. Tap during dialog → does NOT close dialog (correct behavior)
3. Tap during Bag → return to start menu
4. Tap during Pokedex detail → return to list
5. Tap during Party summary → return to party list
6. Tap during Trainer Card → close
7. Tap during Help → close
8. Tap during Options → close
9. Tap during Mart shop → cancel purchase
10. Tap during name confirm NO → return to name input

**START BUTTON scenarios:**
1. Tap in overworld → open start menu
2. Tap in interior → open start menu
3. Tap during dialog → blocked
4. Tap during Birch speech → blocked (must not skip intro)
5. Tap during ledge hop → blocked
6. Tap during warp → blocked
7. Tap in already-open menu → close menu
8. Tap on title screen → blocked (not gameplay)
9. Tap on main menu → blocked
10. Tap during Pokemon encounter → blocked

**RUN TOGGLE scenarios:**
1. Tap → toggle on, indicator highlights
2. Tap again → toggle off, indicator dims
3. Tap while walking → speed doubles immediately
4. Tap in dialog → no effect
5. State persists across warps
6. State persists across save/load
7. State resets on NEW GAME
8. Tap with haptic feedback (double-pulse via navigator.vibrate)
9. Visual feedback latency < 50ms

**FULLSCREEN TOGGLE scenarios:**
1. Tap on desktop → requestFullscreen called (but don't actually fullscreen in test)
2. Tap on iOS Safari → pseudo-fullscreen or graceful fallback (iOS doesn't support requestFullscreen on iPhone)
3. Tap on Android Chrome → actually enters fullscreen
4. Icon updates to "exit fullscreen" state when active
5. Press Escape (keyboard) → exits fullscreen, icon reverts
6. Rotate device in fullscreen → state maintained on Android
7. Lock screen + unlock → state behavior documented

**MULTI-TOUCH edge cases:**
1. d-pad down + A simultaneously → both register, player walks + interacts
2. Finger slide from d-pad to A without lifting → d-pad releases cleanly, A fires
3. Two fingers on d-pad at once → most recent wins (not average)
4. Palm rejection: stray large touch on game area → ignored
5. Three-finger touch (iOS accessibility zoom) → does not confuse game
6. Touch on game area outside controls → no effect (game is read-only below controls)
7. Long press on button → no context menu (touch-callout: none)
8. Pinch zoom attempt → disabled via viewport meta
9. Accidental scroll drag → overscroll-behavior: none prevents

**STRESS tests:**
1. 100 rapid A taps in 10 seconds → no dialog skipped, no hang
2. Hold d-pad for 60 seconds → continuous walk, no memory leak
3. Toggle RUN 50× quickly → state toggles correctly each time
4. Open/close menu 50× → no listener leaks (check `getEventListeners`)
5. Switch between all 7 menu options 20× → no state corruption

**Deliverables:**
- `tests/e2e/mobile-touch-buttons-2.spec.ts` — B, START, RUN, Fullscreen scenarios
- `tests/e2e/mobile-multi-touch.spec.ts` — multi-touch + stress
- ~60 test cases with Playwright code + screenshot verification
- Real-device manual test report if Playwright emulation is insufficient
- Every bug logged and fixed same day OR escalated to P0 for Day 9

**Dependencies:** Day 8.4 part 1 tests done.

**Risk:** Real mobile touch latency can't be fully simulated. Mitigation: complement
with manual test on real iPhone via browser_take_screenshot if available.

---

### Day 9 — Mobile polish + end-to-end playthrough #1 + fix list

**Scope:**
- Mobile viewport matrix audit (per brainstorm #1) — test on every listed device:
  - iPhone SE 667×375 and 375×667
  - iPhone 14 Pro 852×393 and 393×852 (safe-area-inset-left for Dynamic Island)
  - iPhone 14 Pro Max 932×430 and 430×932
  - Pixel 7 915×412 and 412×915 (non-integer DPR bleed check)
  - Galaxy S23 780×360 and 360×780
  - iPad mini 1133×744 and 744×1133
  - iPad Pro 12.9 1366×1024 and 1024×1366
  - Budget Android 640×360 and 360×640
  - Galaxy Z Fold folded 316×840 (refuse gracefully)
- UI sizing audit per brainstorm #3 — verify every element across the matrix:
  - DialogBox word-wrap, speaker label position, page indicator
  - Birch textbox, speaker name visibility
  - StartMenu right-aligned panel width
  - BagMenu 4 pocket tabs fit
  - PartyMenu 6 slot layout
  - PokemonSummary panel stacking
  - PokedexList two-column collapse
  - TrainerCard flip at 1.586:1 aspect
  - Touch controls: 44×44 minimum, transparent bg, no overlap with dialog
  - Portrait banner dismiss button accessibility
- First full playthrough from title → CHAMPION badge:
  - Time it, narrate aloud
  - Every dialog, every paper, every Pokemon, every TM, every key item, every URL
  - Check `urlsOpened.length === totalOpenableUrls` for COMPLETIONIST
  - Test save/load: quit mid-gym, reload, verify state preserved
- Every finding goes in `docs/plans/launch-bugs.md` with P0/P1/P2 triage
- Fix every P0 same day. P1s to Day 10

**Files touched:** Whatever playthrough hits. Likely touch controls tuning, dialog
sizing, sprite depth fixes.

**Testing:**
- Playwright end-to-end script replaying the full playthrough
- Mobile emulation for each viewport in the matrix
- Screenshot each major state per viewport, read visually
- Lighthouse mobile score > 85 (per brainstorm #6)
- Console: zero errors across full playthrough

**Dependencies:** Days 1-8.

**Risk:** Discovering a system bug (not content) on Day 9. Escalate to engine tracker,
don't patch content around it.

---

### Day 10 — P1 fix pass + launch prep

**Scope:**
- Burn down Day 9 P1 list — second full playthrough must succeed uninterrupted
- New-content detection (§17):
  - Flip a count in `lastKnownCounts`, reload, verify OAK notification banner fires
  - Visit KOSTAS, verify priority 3 "new content" dialog fires
- Save/load regression:
  - 10 save/load cycles across all pockets
  - `urlsOpened` persists
  - Corruption test: manually corrupt save, verify backup + restore flow
  - Private mode test: verify warning banner
  - Quota exceeded test: verify warning banner
- Analytics verification: playthrough from title to champion, verify all Umami events
  fire in dashboard or local stub
- Vercel deploy to preview URL:
  - `npm run build` clean
  - Deploy
  - Full E2E test on preview URL (not dev server)
  - Lighthouse mobile score > 85 on preview
- Cleanup:
  - Delete `placement-deltas.md`, `launch-bugs.md`, `url-todo.md` scratch docs
  - Remove dev-only `window.partySystem` / `window.grantFieldMove` in production build
  - Final commit with release notes
- Pre-launch checklist per brainstorm #6:
  - SSL active (automatic on Vercel)
  - `robots.txt` allows crawl
  - `sitemap.xml` includes `/explore`
  - `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`
  - OpenGraph meta tags on `/explore` with game screenshot
  - Twitter card summary_large_image
  - `manifest.json` for PWA (optional)

**Files touched:** Cleanup pass, `vercel.json` (add cache headers for `/game/*`),
`src/pages/explore.astro` (add meta tags).

**Testing:**
- Second full playthrough on preview URL with no interruptions
- Visual regression pass: diff all screenshots against Day 9 baselines
- `npm run build` clean
- `npx tsc --noEmit` clean
- All 12 completion criteria green in a single pass (see PART 5)

**Dependencies:** Day 9 P0 fixes complete.

**Risk:** Vercel preview behaves differently than dev (asset paths, CORS for live
NPCs). Budget 2 hours for preview debugging.

---

## PART 4 — TESTING STRATEGY (exhaustive)

### Infrastructure setup (Day 0.5, part of bugfix day)

**New dev dependencies:**
```
vitest @vitest/coverage-v8 happy-dom @axe-core/playwright pixelmatch pngjs
```

**Directory structure:**
```
tests/
  unit/               # vitest — *.test.ts, pure logic
  integration/        # vitest + happy-dom, localStorage mocked
  e2e/                # playwright specs
  visual/             # playwright visual regression (explore)
  a11y/               # axe-core accessibility tests
  perf/               # performance assertions
  regression/         # one test per fixed bug, named after commit
  fixtures/
    saves/            # JSON save states
    maps/             # map-analyzer output snapshot
    api/              # API response fixtures
    npcs.json         # generated NPC list
    pokedex.json      # generated Pokedex list
  helpers/
    game.ts           # waitForPhaser, setSave, getPhaser, getPlayerPos, advanceDialog
    viewports.ts      # named viewport matrix
    axe.ts            # runAxe wrapper
  snapshots/          # visual regression baselines
```

**`playwright.config.mjs` split into projects:**
```js
projects: [
  { name: "portfolio",       testDir: "./tests/visual",  testMatch: /portfolio\..*\.spec/ },
  { name: "explore-e2e",     testDir: "./tests/e2e",     use: { ...devices["Desktop Chrome"] } },
  { name: "explore-visual",  testDir: "./tests/visual",  testMatch: /explore\..*\.spec/ },
  { name: "explore-mobile",  testDir: "./tests/e2e",     use: { ...devices["iPhone 13"] } },
  { name: "explore-firefox", testDir: "./tests/e2e",     use: { ...devices["Desktop Firefox"] } },
  { name: "explore-webkit",  testDir: "./tests/e2e",     use: { ...devices["Desktop Safari"] } },
  { name: "a11y",            testDir: "./tests/a11y" },
  { name: "perf",            testDir: "./tests/perf" },
]
```

**`package.json` scripts:**
```
"test:unit": "vitest run",
"test:e2e": "playwright test --project=explore-e2e",
"test:visual": "playwright test --project=explore-visual",
"test:mobile": "playwright test --project=explore-mobile",
"test:a11y": "playwright test --project=a11y",
"test:all": "npm run test:unit && npm run test:e2e && npm run test:visual && npm run test:mobile && npm run test:a11y",
"test:ci": "npm run test:all -- --reporter=github"
```

Playwright config: `retries: 2` on e2e only, `trace: "retain-on-failure"`,
`video: "retain-on-failure"`, `screenshot: "only-on-failure"`, `fullyParallel: true`,
`workers: 4` locally, `workers: 2` in CI.

### Dev mode query param harness (add to explore.astro)

Gated by `import.meta.env.DEV || url.searchParams.has("test")`:

- `?save=<base64json>` — preload GameSave
- `?skip-intro=1` — bypass title + Birch speech
- `?touch=1` — force touch overlay (already implemented)
- `?scene=overworld&x=72&y=58` — spawn teleport
- `?skip-animations=1` — disable tweens, typewriter, BGM
- `?seed=<n>` — deterministic RNG for wild encounters
- `?test=1` — expose `window.__PHASER_GAME__`, `window.__TEST__` helpers, disable analytics

### Test helpers (`tests/helpers/game.ts`)

```typescript
setSave(page, name)              // writes fixture to localStorage before goto
gotoExplore(page, opts)          // goto with query params
waitForPhaser(page)              // polls window.__PHASER_GAME__.scene.isActive
getScene(page)                   // returns active scene key
getPlayerPos(page)               // { x, y, dir } from gridEngine
getSave(page)                    // reads + parses localStorage
press(page, key, n=1)            // keyboard helper with frame wait
walk(page, dir, tiles)           // press + assert new pos
advanceDialog(page)              // press A until dialog closed
expectNoConsoleErrors(page)      // attached at beforeEach
snapshot(page, name)             // toHaveScreenshot with viewport suffix
```

### Viewport matrix (`tests/helpers/viewports.ts`)

```typescript
desktop:       [1920x1080, 1440x900, 1280x720]
tablet-land:   [1366x1024, 1024x768]
tablet-port:   [1024x1366, 768x1024]
mobile-land:   [915x412, 852x393, 667x375]
mobile-port:   [412x915, 393x852, 375x667]
edge:          [320x480, 2560x1080]
```

Critical visual specs run on `desktop + mobile-port-393x852 + tablet-port-768`
by default; full matrix nightly.

### Save state fixtures (13 files in `tests/fixtures/saves/`)

1. `fresh-new-game.json` — no localStorage
2. `post-birch.json` — intro complete, spawned at (72,58), 0 badges
3. `overworld-roamed.json` — 500 steps walked, no progress
4. `badge-1-gym.json` — first gym cleared
5. `badges-3.json` — mid-game
6. `all-papers-collected.json` — every paper picked up
7. `full-pokedex-seen.json` — every wild seen
8. `full-pokedex-caught.json` — every wild caught
9. `ready-for-champion.json` — 7 badges
10. `champion-earned.json` — 8 badges + phone
11. `100-complete.json` — everything
12. `corrupt-v1.json` — old schema, tests save migration
13. `edge-full-party.json` — 6 Pokemon, 30+ bag items

Each fixture generated once by playing + dumping localStorage.

### Test categories (153 total tests planned)

1. **Unit tests** (Vitest, ~53 tests) — pure functions: badge conditions, discovery
   count, field move matching, dialog pagination, KOSTAS priority resolver, save
   migration, gate system, party system, field move awards, reachability (uses
   `game-map-data.json`), step store, pokedex, save migration, content consistency
2. **Integration tests** (~7 tests, Vitest + happy-dom) — GameSave → PartySystem,
   GateSystem ↔ PartySystem, HiddenItemSystem → PickupStore, NPCSystem → TrainerStore,
   ItemGift flow, BGMManager scene swap, NewContentDetector
3. **E2E flow tests** (~66 Playwright tests, parametrized by save fixture) — boot,
   title, main menu, Birch intro, overworld basics, interiors, menus (all 7 options),
   touch controls, session fixtures, save persistence, smoke
4. **Visual regression** (~14 scenes × 3 primary viewports = 42 snapshots, nightly
   expands to full matrix) — title, main-menu, birch-mid, overworld-spawn, pokecenter,
   mart, gym, start-menu, bag-each-pocket, pokedex-list/detail, party-list/summary,
   trainer-card-front/back, dialog-box, touch-overlay, notification-banner
5. **Performance** (6 tests) — FPS > 55, memory < 300MB, FCP < 3s on 4G, bundle < 5MB,
   dialog latency < 100ms, scene transition < 500ms
6. **Accessibility** (7 tests) — zero critical axe violations, contrast > 4.5:1, aria
   labels, tab order, prefers-reduced-motion, role=application, focus-visible
7. **Cross-browser** — smoke/boot/overworld/menus/save across Chromium/Firefox/WebKit
8. **Regression pinning** — one test per fixed bug, named after commit/issue:
   - `reg-birch-gender-flash.spec.ts` (B4 fix)
   - `reg-checkbadges-collision.test.ts` (H1 fix — static grep)
   - `reg-updatesave-race.test.ts` (B1 fix)
   - `reg-dialogbox-repeat.test.ts` (B2 fix)
   - `reg-dialogsystem-overwrite.test.ts` (B3 fix)
   - `reg-foreground-depth.spec.ts` (visual diff at plant tile)
   - `reg-tsc.test.ts` (spawns `tsc --noEmit`, expects exit 0)

### Viewport matrix (from brainstorm #1)

Every flow test runs on:
- Desktop: 1440×900, 1920×1080
- Tablet landscape: 1024×768, 1366×1024
- Tablet portrait: 768×1024, 1024×1366
- Mobile landscape: 667×375, 852×393, 915×412
- Mobile portrait: 375×667, 393×852, 412×915
- Tiny: 320×480 (refuse gracefully)

### Save fixtures (from brainstorm #11)

Pre-built save states for fast test setup:
- `fresh-new-game.json`
- `birch-started.json`
- `overworld-no-progress.json`
- `gym-cleared-1-badge.json`
- `all-papers.json`
- `all-pokedex.json`
- `7-badges-ready-for-champion.json`
- `champion-phone-received.json`
- `100-percent-complete.json`

Each fixture is loaded into localStorage before the test runs.

### Flow tests (from brainstorm #2, 139 scenarios)

Abbreviated by category — see brainstorm #2 output for the full 139:
1. Loading → title (7 scenarios)
2. Title screen (6 scenarios)
3. Main menu (7 scenarios)
4. Birch speech (11 scenarios)
5. Overworld movement (12 scenarios)
6. Interactions (6 scenarios)
7. Interiors (7 scenarios)
8. Start menu (9 scenarios)
9. Pokedex (4 scenarios)
10. Party menu (5 scenarios)
11. Bag (5 scenarios)
12. Trainer Card (3 scenarios)
13. Options (4 scenarios)
14. Help (2 scenarios)
15. Mart Shop (4 scenarios)
16. Research Log (2 scenarios)
17. Dialog box (5 scenarios)
18. Notification banner (4 scenarios)
19. Gym puzzle (4 scenarios)
20. Save / Load (5 scenarios)
21. Badges (3 scenarios)
22. MEW / secret (3 scenarios)
23. First-time vs returning (5 scenarios)
24. Flow intersections (14 scenarios)
25. Cross-system state verification (9 stores)

### Touch-specific tests (from brainstorm #1)

- D-pad touchstart each direction → player moves
- D-pad touchmove (slide from up to right) → direction transitions smoothly
- Multi-touch: d-pad + A simultaneously
- Finger slide from d-pad to A (fingers crossing)
- A/B/START/RUN/Fullscreen each fire expected behavior
- Safe-area-inset-left on iPhone landscape (Dynamic Island clear)
- Pinch-zoom disabled
- Pull-to-refresh disabled when holding d-pad up

### UI sizing assertions (from brainstorm #3, 100 concerns)

Per component, per viewport:
- Dialog box min-width readable (60+ chars)
- Touch target min 44×44
- Contrast ratio > 4.5:1 for body, > 3:1 for large
- No horizontal scroll at any viewport
- No element overlaps game content
- Speaker name label not clipped

### Performance assertions (from brainstorm #6)

- FPS > 55 during overworld movement
- Memory < 300MB after 5 minutes of play
- Initial asset load < 5s on simulated 3G
- Dialog advance latency < 100ms
- Lighthouse mobile performance > 85
- Lighthouse accessibility > 95

### Content consistency tests (from brainstorm #4)

- Every item in `ITEM_DEFINITIONS` has non-empty name + description + url (or
  justified null)
- Every NPC in `npcs.ts` has non-empty dialog array
- Every badge condition is boolean-returnable
- Every Pokemon in `pokemon.ts` has species match in `wild-pokemon.ts` or `party.ts`
- Every warp has valid source + target
- Every gate has valid `requiredMove` that exists in at least one `FIELD_MOVE_AWARDS` entry
- Every `FIELD_MOVE_AWARDS` entry has valid badge + pokemon id
- Every paper URL resolves to 200 OK (or is `#` placeholder with TODO)
- Every Pokemon URL resolves to 200 OK

### Edge case tests (from brainstorm #9)

- Spam A 100× in 1s → no dialog skip
- Two dialogs in same frame → no hung await
- Tab backgrounded → BGM pauses, resumes on return
- Reload mid-dialog → clean state
- Rotate phone mid-game → canvas resizes, touch controls reposition
- Save corruption → backup + restore flow
- Private mode → warning banner
- Quota exceeded → warning banner
- WebGL context lost → recovery attempt
- Multi-tab → storage event handles

---

## PART 4.5 — CI / CD INTEGRATION

### GitHub Actions workflow (`.github/workflows/test.yml`)

```yaml
jobs:
  unit:
    runs: vitest run --coverage
  typecheck:
    runs: npx tsc --noEmit && npx astro check
  e2e:
    runs: playwright test --project=explore-e2e
  visual:
    runs: playwright test --project=explore-visual
  mobile:
    runs: playwright test --project=explore-mobile
  a11y:
    runs: playwright test --project=a11y
  perf:
    runs: playwright test --project=perf
    schedule: nightly only
```

- Cache `~/.cache/ms-playwright` and `node_modules`
- Upload `test-results/`, `playwright-report/`, visual diff snapshots on failure
- PR comment with visual diff thumbnails via `playwright-report-action`
- Run against Vercel preview deployment URL:
  `PLAYWRIGHT_BASE_URL=${{ github.event.deployment_status.target_url }}`

### Failure diagnosis artifacts

On every Playwright failure, auto-attach:
- Video (via `video: "retain-on-failure"`)
- Trace file (via `trace: "retain-on-failure"`)
- Active scene key: `window.__PHASER_GAME__.scene.getScenes(true).map(s => s.scene.key)`
- Full save state dumped to `test-results/<test>/save.json`
- Console log tail via `page.on("console")`

### Speed optimizations

- Vitest: native parallelism, ~100 unit tests in < 2s
- Playwright: `fullyParallel: true`, `workers: 4` locally, `workers: 2` in CI
- `?skip-animations=1` + `?skip-intro=1` default in e2e harness
- Shared `beforeAll` boots Phaser, each test `gotoExplore` with fresh fixture

---

## PART 5 — TWELVE COMPLETION CRITERIA

The plan is not done until ALL twelve are green IN A SINGLE COHERENT VERIFICATION
PASS (not at different times):

1. Every task checkbox in this plan is checked with evidence attached (screenshot,
   commit hash, test log)
2. Every test in the Playwright suite passes on desktop + mobile landscape + mobile portrait
3. Zero console errors on `/explore` across the full user flow on all 3 viewport categories
4. TypeScript compiles clean (`npx tsc --noEmit` silent except pre-existing baseUrl
   deprecation warning)
5. Production build succeeds (`npm run build`)
6. Vercel deployment is live and the deployed URL passes a full end-to-end test
   suite against real network conditions
7. Every NPC dialog is written, not stubbed, not placeholder
8. Every Pokemon, paper, TM, key item, blog post, sign, and Research Log entry has
   real content that reads like a human wrote it
9. KOSTAS state machine handles all 7 priorities and has been tested with save
   fixtures for each priority branch
10. All 5 API-powered NPCs actually fetch live data and fall back gracefully on failure
11. The game has been screen-recorded from title screen through CHAMPION badge as a
    continuous playthrough without a single bug surfacing
12. Lighthouse mobile score ≥ 85 on `/explore` with touch mode forced

---

## PART 6 — OUT OF SCOPE (explicit post-launch backlog)

Per brainstorm #10, these are explicitly cut to fit 10 days:

- Blog posts 2-10 (stay "coming soon" NPCs — BLOGGER badge requires only launch blog)
- Research Log entries 7-8 (stay slotted but empty — priority 4 gracefully handles)
- Live NPCs beyond the 5 core (HuggingFace, Umami, Cloudflare, Docker Hub, npm, etc.)
- Out-of-bounds easter egg NPCs (§19)
- Phone number Pokeball alternate path (3,58)
- Game Corner / Bike Shop / Blog Tower interior maps
- PWA manifest + service worker for offline play
- Accessibility "text adventure" mode for screen readers
- `prefers-reduced-motion` full support
- Cloud save sync
- Multiple save slots
- Export/import save as JSON
- Gamepad API (physical controllers)
- Bun/Rust runtime migration
- Gate system runtime collision mutation (currently uses Grid Engine characters)
- Multi-tile NPC footprint in the map analyzer

---

## PART 7 — DECISION LEDGER

Decisions needed before starting. If unsure, spin up 5 subagents for independent
opinions. Document the decision in commit messages.

1. **Badge naming** — adopt design doc §2 names (GYM/PUBLICATION/CONNECTED/POKEDEX/
   BLOGGER/ENGINEER/COMPLETIONIST/CHAMPION) or keep code names (phd/scholar/opensource/
   author/fullstack/explorer/devoted/champion)? **Default: doc names.** Ghost
   `devoted` badge is dropped either way.
2. **MEW story anchor** — real person (Kostas's actual friend) or fictional? **Default:
   fictional with specific details** so nobody gets embarrassed.
3. **Phone number reward format** — real redacted digits, clickable `/contact` link,
   or obfuscated? **Default: clickable `/contact` link as a key item.**
4. **Gate locations** — which 2-3 tiles? **Default: Snorlax gate (68,9) + R111 tinted
   tree (66,20) + one more TBD.**
5. **Which badges teach which field moves to which Pokemon?** **Default: POKEDEX badge
   teaches KYOGRE "FORCE PUSH" (for Snorlax); PUBLICATION badge teaches ABSOL "CUT"
   (for tree).**
6. **Email key item format** — mailto, `/contact`, or obfuscated? **Default:
   `/contact` redirect.**
7. **Pokemon descriptions source** — write fresh or pull from old repo? **Default:
   pull from `~/Insync/Gdrive/Projects/drkostas.github.io/pages/api/*.json` and
   tighten to 2 lines each.**
8. **Unreleased paper URLs** — use `#` placeholder, use arXiv pre-print, or delay
   content until defense? **Default: `#` placeholder with TODO, pre-print if
   available.**

---

## PART 8 — FILE INVENTORY (everything that will change)

**New files:**
- `src/game/npcs/live/spotify.ts`
- `src/game/npcs/live/strava.ts`
- `src/game/npcs/live/github.ts`
- `src/game/npcs/live/pypi.ts`
- `src/game/npcs/live/steps.ts`
- `src/game/utils/format.ts`
- `tests/explore-mode.spec.mjs` (new Playwright suite)
- `tests/fixtures/saves/*.json` (9 save fixtures)
- `tests/fixtures/api/*.json` (API response fixtures)

**Modified files:**
- `src/game/systems/GameSave.ts` (cache + kostasState + privacy fields)
- `src/game/systems/BadgeMilestones.ts` (badge rename)
- `src/game/systems/DialogSystem.ts` (double-call guard)
- `src/game/data/gates.ts` (2-3 gate entries)
- `src/game/data/fieldMoveAwards.ts` (badge→pokemon→move triples)
- `src/game/data/gym-puzzle.ts` (6 trainer positions)
- `src/game/data/interiors.ts` (KOSTAS state machine, gym trainers, interior NPCs)
- `src/game/data/npcs.ts` (4 route trainers, 10 blog NPCs, 5 live API NPCs, signs,
  boundary blockers, 2 TM item balls, 5 key item balls, 2 TM NPCs)
- `src/game/data/itemDefinitions.ts` (10 papers, 8 missing TMs, DISSERTATION,
  phone number, 1 launch blog)
- `src/game/data/pokemon.ts` (MEW Pokedex entry)
- `src/game/data/wild-pokemon.ts` (30 + boundary blockers + MEW)
- `src/game/data/party.ts` (MEW addition to ALL_PARTY)
- `src/game/data/hiddenItems.ts` (delete 6 wrong, add 6 correct)
- `src/game/data/researchLog.ts` (6 entry rewrites)
- `src/components/game/DialogBox.tsx` (`e.repeat` guard)
- `src/components/game/PhaserGame.tsx` (bgm.stop in cleanup, visibilitychange)
- `src/pages/explore.astro` (meta tags, OpenGraph, Twitter card)
- `vercel.json` (cache headers for `/game/*`)
- `playwright.config.mjs` (add explore-mode suite)

**Deleted files:**
- `docs/plans/placement-deltas.md` (Day 1 scratch, delete at end)
- `docs/plans/launch-bugs.md` (Day 9 scratch, delete at end)
- `docs/plans/url-todo.md` (ongoing, delete or retain for post-launch)

---

## PART 9 — RISK REGISTER

| Risk | Mitigation | Owner |
|---|---|---|
| Paper URL missing for unreleased work (MEDiC, ExPLoRe) | `#` placeholder + TODO | Day 2 |
| Strava refresh token rotation not handled | Audit `src/lib/strava.ts` before Day 7 | Day 7 |
| Pixel font can't render Unicode track names | Test early with Japanese track, fallback to transliteration | Day 7 |
| Gate position creates articulation point | `map-analyzer --test X,Y` before committing | Day 1 |
| MEW story feels inauthentic | User decision on anchor (real/fictional) | Day 3 |
| Phone number privacy concerns | Redirect via `/contact`, no raw digits | Day 6 |
| `updateSave` race condition causes playthrough data loss | Day 0.5 bugfix B1 | Day 0.5 |
| Dialog spam skips Birch speech | Day 0.5 bugfix B2 | Day 0.5 |
| Live NPC fetch hangs dialog | 5s AbortController timeout | Day 7 |
| Mobile controls overlap dialog at iPhone SE | UI sizing audit Day 9 | Day 9 |
| Vercel preview breaks due to CORS | Budget 2h on Day 10 | Day 10 |
| Lighthouse mobile score < 85 | Bundle split Phaser to /explore chunk, add cache headers | Day 10 |
| Content creep beyond 10 days | Explicit OUT OF SCOPE list in PART 6 | Always |

---

## PART 10 — DAILY SUCCESS CHECKLIST (for the ralph loop)

Each day ends with:
- [ ] All files from "Files touched" committed
- [ ] All tests from "Testing" pass on 3 viewports
- [ ] Screenshots captured and read visually
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` clean
- [ ] Commit message references the day number ("Day N: …")
- [ ] Scratch docs updated
- [ ] No P0 bugs carried over

If any checklist item is not green, the day is not done and continues into the next
iteration of the ralph loop. No partial credit.

---

## Provenance

This plan was synthesized from 10 parallel brainstorming subagents dispatched on
2026-04-12:

1. Mobile device matrix coverage → 70 concrete mobile test cases
2. Game flow state coverage → 139 flow scenarios
3. UI sizing and responsive audit → 100 sizing concerns
4. Content completeness audit → priority-ordered gap list with 20 items
5. API integration audit → 5 NPCs ready to wire, infrastructure present
6. Performance and accessibility audit → 64 concerns with top-10 priorities
7. KOSTAS state machine and story → full priority analysis with dialog rewrites
8. Save state persistence edge cases → 69 concerns with top-5 priorities
9. Edge cases and error handling → 50+ scenarios with real bugs identified
10. Content production 10-day plan → day-by-day linear plan with parallelization notes

The 11th planned subagent (automated testing infrastructure) can still be dispatched
if more test planning depth is needed; this plan currently integrates its scope into
PART 4 via the other brainstorms.
