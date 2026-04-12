# Game Completion Plan — Make It Winnable

> **For Claude:** REQUIRED: Use the ralph loop prompt at the bottom of this document.

**Goal:** Fix every bug preventing badge completion, relocate all unreachable entities, add movement life to the world, and verify the game is playable from title screen to CHAMPION badge.

**Key tool:** `node scripts/map-analyzer.mjs` — run after EVERY placement change. Zero unreachable entities is a hard gate on every commit. Use `--test X,Y` to validate individual positions before committing.

**Map data:** `game-map-data.json` contains `safePlacementTiles` (1,406 tiles) and `safePlacementByZone`. Use these as the source of truth for valid positions.

---

## Phase 1: Critical Fixes (make badges earnable)

### 1.1 Fix gymComplete setter
- [ ] In `src/game/scenes/InteriorScene.ts`, after each `markTrainerCleared()` call in the gym autoGive flow, check if ALL 6 gym trainers are cleared
- [ ] If all cleared, call `updateSave({ gymComplete: true })`
- [ ] The 6 trainer IDs to check: `gym_shawn`, `gym_vivian`, `gym_ben`, `gym_kirk`, `gym_amber`, `gym_jenna`
- [ ] Write a unit test: seed save with all 6 trainers cleared, verify gymComplete becomes true
- [ ] Write a unit test: seed save with 5/6 cleared, verify gymComplete stays false
- [ ] Verify via map-analyzer: `node scripts/map-analyzer.mjs` — zero new warnings
- [ ] TSC clean, vitest pass, build clean

### 1.2 Relocate 17 unreachable wild Pokemon
For each Pokemon below, use `game-map-data.json → safePlacementTiles` filtered by zone to pick a new position. Validate with `node scripts/map-analyzer.mjs --test X,Y`.

- [ ] #1 MEDiC/Latias (3,52) → new position in Route 117 safe tiles
- [ ] #3 ShiftMD/Breloom (67,109) → new position in Route 110 safe tiles
- [ ] #5 MaskDistill/Absol (66,21) → new position in Route 111 safe tiles
- [ ] #8 Dementia/Camerupt (30,53) → new position in Route 117 safe tiles
- [ ] #12 YAML/Seviper (8,65) → new position in Route 117 safe tiles
- [ ] #14 Cross-Fetch/Wailord (130,59) → new position in Route 118 safe tiles
- [ ] #16 CloudStore/Pelipper (108,55) → new position in Route 118 safe tiles
- [ ] #17 MySQL/Lairon (14,53) → new position in Route 117 safe tiles
- [ ] #19 AccidentBot/Mawile (78,95) → new position in Route 110 safe tiles
- [ ] #20 InstaBot/Sableye (62,105) → new position in Route 110 safe tiles
- [ ] #21 OnomaBot/Shedinja (118,57) → new position in Route 118 safe tiles
- [ ] #22 HFDatasets/Flygon (40,51) → new position in Route 117 safe tiles
- [ ] #26 RLGrid/Plusle (72,97) → new position in Route 110 safe tiles
- [ ] #27 StereoDepth/Vibrava (75,25) → new position in Route 111 safe tiles
- [ ] #28 iOSMovieDB/Volbeat (57,107) → new position in Route 110 safe tiles
- [ ] #29 EyeInSky/Altaria (125,55) → new position in Route 118 safe tiles
- [ ] #30 FaceDetector/Kirlia (64,35) → new position in Route 111 safe tiles
- [ ] Run `node scripts/map-analyzer.mjs` — ZERO unreachable Pokemon warnings
- [ ] TSC clean, vitest pass

### 1.3 Relocate MEW phone ball
- [ ] Move `npc_r118_mew_phone` from (130,62) to a reachable Route 118 safe tile
- [ ] Validate with `--test X,Y`
- [ ] Run full map-analyzer — zero warnings for this entity

### 1.4 Relocate unreachable item balls + hidden items
- [ ] `npc_r117_item_ball` (GitHub) from (6,68) → Route 117 safe tile
- [ ] `npc_r110_item_ball` (HuggingFace) from (76,117) → Route 110 safe tile
- [ ] `ow_flower_linkedin` hidden item from (55,35) → Route 111 safe tile (reachable)
- [ ] `ow_flower_huggingface` hidden item from (20,28) → Route 111 safe tile (reachable)
- [ ] Run full map-analyzer — zero unreachable item/hidden-item warnings

### 1.5 Fix CONNECTED badge threshold
- [ ] In `BadgeMilestones.ts`, change CONNECTED condition to exclude `key_phone_number` OR hardcode threshold to 7
- [ ] Verify with unit test: save with 7 key items (excluding phone) → CONNECTED fires
- [ ] Verify: save with 6 key items → CONNECTED does NOT fire
- [ ] Existing BadgeMilestones tests still pass

### 1.6 Fix gym_jenna collision tile
- [ ] Move `gym_jenna` from (8,13) to nearest non-collision tile in the gym interior
- [ ] Verify gym interior map-analyzer shows no placement warnings

### Phase 1 Gate
- [ ] `node scripts/map-analyzer.mjs` reports ZERO unreachable entities (NPCs + Pokemon + items + hidden items)
- [ ] `npx tsc --noEmit` clean
- [ ] `npx vitest run` — all pass
- [ ] `npm run build` clean
- [ ] Commit + push, verify production deployment

---

## Phase 2: Gates & Field Moves

### 2.1 Add Snorlax gate definition
- [ ] In `src/game/data/gates.ts`, add gate: `{ id: "snorlax_gate", type: "npc", npcId: "npc_snorlax", map: "overworld", requiredMove: "FORCE PUSH", clearMessage: "{POKEMON} used FORCE PUSH! SNORLAX woke up and moved!", lockedMessage: "..." }`
- [ ] Add `spawnCondition: () => !isGateCleared("snorlax_gate")` to `npc_snorlax` in npcs.ts
- [ ] Verify: before POKEDEX badge, Snorlax blocks path. After badge + FORCE PUSH, Snorlax gone.

### 2.2 Add tinted tree gate definition
- [ ] Add terrain gate: `{ id: "tree_gate", type: "terrain", map: "overworld", tiles: [{x:66, y:20}], requiredMove: "CUT", clearMessage: "{POKEMON} used CUT!", lockedMessage: "This tree can be cut down." }`
- [ ] Validate tree position with `--test 66,20`
- [ ] Verify: before PUBLICATION badge, tree blocks path. After badge + CUT, tree gone.

### 2.3 Unit tests for gates
- [ ] Test: gate with required move + party Pokemon that knows it → gate clears
- [ ] Test: gate without required move → gate stays locked
- [ ] TSC clean, vitest pass, build clean
- [ ] Commit + push

---

## Phase 3: Movement & Life

### 3.1 Assign movement behaviors to wild Pokemon
For each of the 31 wild Pokemon, change from `STATIONARY` to one of:
- `LOOK_AROUND` (rotate in place — works with `animated: false`)
- Keep `STATIONARY` only for "sleeping" or "guarding" Pokemon

- [ ] Update the `wild()` helper in `wild-pokemon.ts` to default to `LOOK_AROUND` instead of `STATIONARY`
- [ ] Override specific Pokemon that should stay still (sleeping ones, boundary blockers)
- [ ] Verify in runtime: wild Pokemon rotate to face random directions on a timer
- [ ] Run map-analyzer — no new warnings (LOOK_AROUND doesn't move tiles)

### 3.2 Diversify NPC movement patterns
Currently only WANDER_LEFT_RIGHT (4) and LOOK_AROUND (3) used. Add variety:

- [ ] Route 117 maniac → LOOK_AROUND (obsessive researcher scanning)
- [ ] Route 118 fisherman → LOOK_AROUND (watching the water)
- [ ] Route 110 fisherman → LOOK_AROUND (same vibe)
- [ ] Route 111 man → WANDER_UP_DOWN with range 1 (pacing near house)
- [ ] Route 111 pokefan_f → LOOK_AROUND (looking for Pokemon)
- [ ] At least 2 Mauville NPCs → WANDER_AREA with range 1x1 (city life)
- [ ] Verify no movement causes new unreachable entities (NPCs that wander INTO blocked tiles)

### 3.3 Add 1 ephemeral Pokemon showcase
- [ ] Pick 1 wild Pokemon (suggestion: #31 Portfolio v2 / Blaziken in Mauville)
- [ ] Add `ephemeral: { spawnPoints: [{x,y}, {x2,y2}], visibleDuration: 15, hiddenDuration: 10, visibleBehavior: "hop" }`
- [ ] Verify the spawn/despawn/hop cycle works in runtime
- [ ] Commit

---

## Phase 4: Content Polish

### 4.1 Phone number update
- [ ] Change `key_phone_number` description in itemDefinitions.ts to: `"KOSTAS's personal line.\n+865 978 9244\nCall when you're ready."`
- [ ] Verify in Bag UI: item shows the number

### 4.2 MEW encounter upgrade (stretch — skip if time-constrained)
- [ ] Add MEW to POKEDEX as entry #0 or #36 (special "???" entry)
- [ ] Add a MEW PartyMember to `ALL_PARTY` with `joinsParty: "mew"`
- [ ] Replace the static item_ball with a proper Pokemon NPC that:
  - Shows encounter flash on first interaction
  - Plays 5-8 lines of emotional dialog
  - Grants `key_phone_number` via afterDialog callback
  - Registers in Pokedex
  - Joins party (if party < 6 after starter reduction) OR just registers
- [ ] Alternatively: keep the item_ball but add a multi-line dialog instead of generic text

### 4.3 Bug fixes
- [ ] Add React error boundary wrapping ExploreApp (catch-all for UI crashes)
- [ ] Fix double step counting: remove the second `incrementStep()` call on grass tiles in OverworldScene update()
- [ ] Remove `console.log` spam from OverworldScene line ~1276 (foreground sprite count)
- [ ] Fix Trainer Card: "Z to flip" → "A to flip · B to close"
- [ ] TSC clean, vitest pass, build clean
- [ ] Commit + push

---

## Phase 5: Final Verification

### 5.1 Map analyzer clean run
- [ ] `node scripts/map-analyzer.mjs` → ZERO placement warnings
- [ ] Screenshot the clean output as evidence

### 5.2 Full test suite
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx vitest run` → all pass (target: 175+)
- [ ] `npx playwright test` → 40+ pass (all viewports)
- [ ] `npm run build` → clean

### 5.3 Production verification
- [ ] `git push origin main`
- [ ] Wait for Vercel deploy
- [ ] Playwright browser_evaluate: fetch all 4 API endpoints → 200
- [ ] Walk through title → NEW GAME → Birch → overworld on desktop 1440x900
- [ ] Walk to 3 different wild Pokemon, verify encounter dialog fires
- [ ] Enter gym, verify puzzle works (press switch, barrier toggles)
- [ ] Talk to KOSTAS, verify {NAME} interpolation
- [ ] Test on mobile landscape 852x393
- [ ] Test on mobile portrait 393x852
- [ ] Check console: 0 errors

### 5.4 Badge pipeline test (manual on production)
- [ ] Seed a save with all conditions met via browser_evaluate
- [ ] Visit KOSTAS: verify GYM badge awards (gymComplete = true)
- [ ] Verify PUBLICATION, CONNECTED, POKEDEX, BLOGGER, ENGINEER badges all fireable
- [ ] Verify COMPLETIONIST auto-fires when last URL opened
- [ ] Verify CHAMPION auto-fires when phone_number collected

---

## Success Criteria

All of the following must be TRUE simultaneously in a single verification pass:

1. `node scripts/map-analyzer.mjs` → ZERO unreachable entities
2. All 31 wild Pokemon on reachable tiles (verified by analyzer)
3. All item balls and hidden items on reachable tiles
4. gymComplete setter works (unit tested)
5. GATES has 2 entries (Snorlax + tree), both functional
6. All 8 badges earnable through normal play
7. MEW/phone ball reachable on production
8. At least 50% of NPCs/Pokemon have non-STATIONARY movement behavior
9. `npx tsc --noEmit` → 0 errors
10. `npx vitest run` → all pass
11. `npx playwright test` → all pass on 3 viewports
12. `npm run build` → clean
13. Production URL returns 200 on all API endpoints
14. Zero console errors on production across full user flow
15. Phone number item shows +865 978 9244

---

## Entity Count Targets

| Category | Current | Target | Notes |
|----------|---------|--------|-------|
| Wild Pokemon (reachable) | 14/31 | 31/31 | Relocate 17 |
| NPCs (reachable) | ~35/51 | 51/51 | Relocate unreachable, fix Aqua/Magma |
| Item balls (reachable) | 3/6 | 6/6 | Relocate 3 |
| Hidden items (reachable) | 8/10 | 10/10 | Relocate 2 |
| Movement: non-STATIONARY | 7/100 (7%) | 50+/100 (50%+) | Add LOOK_AROUND to wild Pokemon |
| Gates defined | 0 | 2 | Snorlax + tree |
| Badges earnable | 3/8 | 8/8 | Fix gymComplete + reachability + threshold |
