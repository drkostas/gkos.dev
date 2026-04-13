# Editor Data Manager — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full Data Manager panel to the Pokemon World Designer IDE that provides CRUD for all game data types — items, TMs, Pokedex entries, party Pokemon, badges, research log, field moves — with rich dropdown selectors replacing raw ID text inputs throughout the editor.

**Architecture:** A new "Data" tab in the left panel (alongside Entities/Sprites/Tiles) containing a tabbed sub-panel for each data type. Each data tab renders a searchable list + inline editor. All data types are loaded from `editor-data.json` (extending the export script) and saved via the existing `/api/editor/save` endpoint (extended with new patch types). Dropdown selectors throughout the properties panel are wired to the data catalog so any field referencing an item/pokemon/badge shows a rich picker instead of a text input.

**Tech Stack:** React (existing EditorApp), regex TS patching (existing save endpoint), `editor-data-export.mjs` (extended)

---

## Data Model — 9 Editable Types

| Type | Source File | Count | Key Fields |
|------|-----------|-------|-----------|
| Items | `itemDefinitions.ts` | 38 | id, name, pocket, description, url, icon |
| TMs (Step Milestones) | `StepMilestones.ts` | 16 | steps, itemId, tm, description |
| Pokedex | `pokemon.ts` | 35 | number, name, level, types, status, description, url, pokemon |
| Party Pokemon | `party.ts` | 6 | id, nickname, species, level, moves[], description, url |
| Badges | `BadgeMilestones.ts` | 8 | id, name, hint (condition is read-only) |
| Field Move Awards | `fieldMoveAwards.ts` | 2 | badgeId, pokemonId, moveName, learnMessage |
| Research Log | `researchLog.ts` | 8 | number, title, threshold, text[] |
| Hidden Items | `hiddenItems.ts` | 11 | id, map, x, y, itemId, difficulty, placement |
| Gates | `gates.ts` | 2 | id, description, type, requiredMove, clearMessage |

## Relationship Graph

```
NPC.autoGive.itemId ──→ ITEM_DEFINITIONS
NPC.pickup.itemId ────→ ITEM_DEFINITIONS
NPC.pokemon.pokedexNumber → POKEDEX
HIDDEN_ITEMS.itemId ──→ ITEM_DEFINITIONS
STEP_MILESTONES.itemId → ITEM_DEFINITIONS
WILD_POKEMON.pokedexNum → POKEDEX
FIELD_MOVE_AWARDS.badgeId → BADGES
FIELD_MOVE_AWARDS.pokemonId → ALL_PARTY
GATES.requiredMove ───→ FIELD_MOVE_AWARDS.moveName
BADGES.condition ─────→ ITEM_DEFINITIONS (pocket counts), POKEDEX (length)
```

---

## Phase D0: Export All Data Types (infrastructure)

### Task D0-01: Extend editor-data-export.mjs to export all 9 data types

**Files:**
- Modify: `scripts/editor-data-export.mjs`

Currently exports: entities, itemDefinitions (partial), pokedex (partial), badges (id/name/hint only), zones, researchLog, sprites.

**Add full exports for:**

```javascript
// New extractors needed:
data.stepMilestones = extractStepMilestones(stepMilestonesText);  // from StepMilestones.ts
data.party = extractParty(partyText);                              // from party.ts
data.fieldMoveAwards = extractFieldMoveAwards(fmaText);           // from fieldMoveAwards.ts
data.gates = extractGates(gatesText);                              // already partial, make full

// Enhance existing extractors:
data.itemDefinitions = extractFullItemDefs(itemDefsText);          // add url, icon fields
data.pokedex = extractFullPokedex(pokemonText);                    // add url, types, pokemon fields
data.badges = extractFullBadges(badgeMilestonesText);              // add hint field
data.researchLog = extractFullResearchLog(researchLogText);        // add text[] arrays
```

**Verification:** `node scripts/editor-data-export.mjs` outputs all 9 types with correct counts. JSON includes `stepMilestones` (16 entries), `party` (6 entries), `fieldMoveAwards` (2 entries).

---

## Phase D1: Data Tab Shell & Item Manager

### Task D1-01: Add "Data" tab to LeftPanel

**Files:**
- Modify: `src/components/editor/EditorApp.tsx` (LeftPanel component)

Add a 4th tab "Data" alongside Entities/Sprites/Tiles. When active, renders `<DataManager />` component. Tab shows total data entry count.

**Verification:** 4 tabs visible, clicking "Data" shows empty data manager shell.

### Task D1-02: Create DataManager component with sub-tabs

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

Nested tab bar within the Data tab:
- **Items** (38) — ITEM_DEFINITIONS
- **TMs** (16) — Step milestones / TM catalog
- **Pokedex** (35) — Pokemon entries
- **Party** (6) — Party members
- **Badges** (8) — Badge definitions (mostly read-only)
- **Log** (8) — Research log entries
- **Moves** (2) — Field move awards

Each sub-tab renders a searchable list + inline editor for that data type.

**Verification:** All 7 sub-tabs visible and switchable.

### Task D1-03: Item Definition Editor

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

**List view:** Scrollable list of all items, grouped by pocket (Papers, Blogs, Key Items, TMs). Each row: colored pocket badge + name + id.

**Inline editor (click to expand):**
- ID: text input (read-only for existing, editable for new)
- Name: text input
- Pocket: dropdown (papers, blogs, keyItems, tms)
- Description: textarea
- URL: text input (optional)
- Icon: text input (optional, shows preview from `/game/ui/bag/`)

**Actions:** Edit existing, Add New (bottom button), Delete (with confirmation).

**Verification:** All 38 items visible, grouped by pocket. Editing a name updates in the data list.

### Task D1-04: Wire item data into editor state

**Files:**
- Modify: `src/components/editor/state/editorTypes.ts`
- Modify: `src/components/editor/state/editorReducer.ts`
- Modify: `src/components/editor/state/EditorContext.tsx`

Add to EditorState:
```typescript
itemDefinitions: Record<string, ItemDef>;
stepMilestones: StepMilestone[];
pokedex: PokedexEntry[];
party: PartyMember[];
badges: BadgeDef[];
fieldMoveAwards: FieldMoveAward[];
researchLog: LogEntry[];
```

Add actions: `LOAD_CATALOG_DATA`, `UPDATE_ITEM`, `ADD_ITEM`, `DELETE_ITEM` (with undo support).

**Verification:** Data loaded into state on mount, accessible via `useEditorState()`.

---

## Phase D2: TM & Pokedex Editors

### Task D2-01: TM / Step Milestone Editor

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

**List view:** Sorted by step cost (ascending). Each row: step price + TM name + linked item name.

**Inline editor:**
- Steps: number input (the price)
- Item ID: **dropdown** populated from ITEM_DEFINITIONS filtered to pocket=tms
- TM Name: text input
- Description: textarea

**Add/Delete TMs** with undo.

**Verification:** All 16 TMs listed with correct prices. Changing a price updates the display.

### Task D2-02: Pokedex Entry Editor

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

**List view:** Grid of Pokedex entries with icon sprite (32x32 from `/game/sprites/pokemon/icons/`), number, name, project name. Sorted by dex number.

**Inline editor:**
- Number: number input (1-35)
- Name: text input (project name)
- Level: number input
- Types: two dropdowns (Normal, Fire, Water, Grass, Electric, Ice, Fighting, Poison, Ground, Flying, Psychic, Bug, Rock, Ghost, Dragon, Dark, Steel, Fairy)
- Status: dropdown (caught, seen, unseen)
- Species: text input (Pokemon name for sprite lookup)
- Description: textarea (project description)
- URL: text input (project URL)

**Verification:** All 35 entries visible with icons. Editing species updates the icon preview.

### Task D2-03: Party Pokemon Editor

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

**List view:** 6 party members with species sprite + nickname + level.

**Inline editor:**
- ID: read-only
- Nickname: text input
- Species: dropdown (from POKEDEX species list)
- Level: number input
- HP / Max HP: number inputs
- Project Name: text input
- URL: text input
- Description: textarea
- Moves (up to 4): each move has name, type (dropdown), PP, description

**Verification:** All 6 party members editable. Moves expandable inline.

---

## Phase D3: Rich Dropdown Selectors

### Task D3-01: Create ItemPicker component

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

Reusable dropdown component that replaces raw text inputs for item IDs everywhere:

```tsx
function ItemPicker({ value, onChange, filterPocket }: {
  value: string;
  onChange: (itemId: string) => void;
  filterPocket?: string; // optional: only show items from this pocket
}) {
  // Renders a select dropdown with:
  //   - Items grouped by pocket (optgroup)
  //   - Each option: "📄 ExPLoRe — Research paper on..." 
  //   - Search/filter input
  //   - "Create New Item" option at bottom
}
```

**Wire into:**
- `RightPanel > AUTO-GIVE > Item` field (replace text input)
- `RightPanel > PICKUP > Item` field (replace text input)
- `RightPanel > HIDDEN ITEM > Item` field (replace text input)

**Verification:** Clicking the Item field in autoGive shows a dropdown with all 38 items grouped by pocket. Selecting one updates the entity.

### Task D3-02: Create PokedexPicker component

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

Dropdown for selecting Pokedex entries (used in Pokemon section of properties panel):

```tsx
function PokedexPicker({ value, onChange }: {
  value: number;  // pokedex number
  onChange: (dexNumber: number) => void;
}) {
  // Renders dropdown with:
  //   - Pokemon icon sprite (32x32) + #NNN + Project Name
  //   - Search by name/species
}
```

**Wire into:**
- `RightPanel > POKEMON > Dex #` field
- Wild Pokemon entity creation flow

**Verification:** Pokemon section shows dropdown with icons and project names instead of plain number input.

### Task D3-03: Create BadgePicker and PartyPicker components

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

`BadgePicker` — dropdown of 8 badges (used in Field Move Awards editor).
`PartyPicker` — dropdown of 6 party members (used in Field Move Awards editor, joinsParty).

**Verification:** Field Move Awards editor shows dropdowns for badge and party member.

---

## Phase D4: Save Endpoint Extensions

### Task D4-01: Extend save endpoint for item definition CRUD

**Files:**
- Modify: `src/pages/api/editor/save.ts`

Add new change types:
```typescript
type DataChange =
  | { type: "update_item"; itemId: string; field: string; value: any }
  | { type: "add_item"; item: ItemDef }
  | { type: "delete_item"; itemId: string }
  | { type: "update_milestone"; index: number; field: string; value: any }
  | { type: "update_pokedex"; dexNumber: number; field: string; value: any }
  | { type: "update_party"; memberId: string; field: string; value: any }
  | { type: "update_log"; entryNumber: number; field: string; value: any }
```

**Regex patching strategy for ITEM_DEFINITIONS:**
- Find item block by `id: "paper_explore"` pattern
- Replace field value within the block (same approach as NPC patching)

**Verification:** Edit an item name in the editor, save, verify `itemDefinitions.ts` changed on disk.

### Task D4-02: Extend save endpoint for Pokedex and Party

**Files:**
- Modify: `src/pages/api/editor/save.ts`

Regex patching for `POKEDEX` array entries (find by `number: N`) and `ALL_PARTY` array entries (find by `id: "memberId"`).

**Verification:** Edit a Pokedex description, save, verify `pokemon.ts` changed.

### Task D4-03: Extend save endpoint for StepMilestones, ResearchLog, FieldMoveAwards

**Files:**
- Modify: `src/pages/api/editor/save.ts`

Same regex patching approach for each array type.

**Verification:** Change a TM step price, save, verify `StepMilestones.ts` changed.

---

## Phase D5: Remaining Data Editors & Polish

### Task D5-01: Badge Editor (read-mostly)

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

**List view:** 8 badges with name + hint + earned/not indicator.

**Inline editor:**
- Name: text input
- Hint: textarea
- Condition: read-only badge ("Complex logic — edit in source")
- Auto: checkbox

**Verification:** Badge hints editable, condition shown as read-only.

### Task D5-02: Research Log Editor

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

**List view:** 8 entries sorted by number. Each row: "#N — Title (threshold: X discoveries)".

**Inline editor:**
- Number: number input
- Title: text input
- Threshold: number input
- Text: multi-line textarea (one line per array entry, Enter separates lines)

**Verification:** All 8 entries editable. Text array renders correctly.

### Task D5-03: Field Move Awards Editor

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

**List view:** 2 entries. Each row: "Badge → Pokemon learns MOVE".

**Inline editor:**
- Badge: BadgePicker dropdown
- Pokemon: PartyPicker dropdown
- Move Name: text input
- Learn Message: textarea

**Verification:** Both entries editable with dropdowns.

### Task D5-04: Gate Editor (enhanced)

**Files:**
- Modify: `src/components/editor/EditorApp.tsx`

Move gate editing from the entity properties panel into the Data manager. Show:
- Gate type (npc / terrain)
- NPC ID (dropdown of all NPCs)
- Required Move (dropdown from field move awards)
- Clear/Locked messages

**Verification:** Gates editable with NPC and move dropdowns.

---

## Phase D6: Cross-Reference Validation

### Task D6-01: Add cross-reference validation rules

**Files:**
- Modify: `src/components/editor/EditorApp.tsx` (BottomPanel/ProblemsPanel)

New validation rules that check data consistency:
- `item-orphan`: Item in ITEM_DEFINITIONS not referenced by any NPC, hidden item, or milestone
- `milestone-missing-item`: StepMilestone references nonexistent item
- `npc-missing-item`: NPC autoGive/pickup references nonexistent item
- `hidden-item-missing`: Hidden item references nonexistent item
- `pokemon-dex-gap`: Gap in Pokedex numbering
- `party-missing-species`: Party member species not in Pokedex
- `badge-threshold-impossible`: Badge requires more items than exist in that pocket

**Verification:** Deliberately break a reference (typo an itemId), see validation error.

---

## Completion Criteria

1. All 9 data types have list view + inline editor in the Data tab
2. All ID reference fields use rich dropdown pickers (items, pokedex, badges, party)
3. Changes to data types are saveable via Ctrl+S (regex patches to TS source files)
4. Cross-reference validation catches broken references
5. Undo/redo works for all data edits
6. Export script produces all data types in editor-data.json
7. No regressions — existing entity editing still works

---

## Task Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| D0 | 1 | Export all data types from TS sources |
| D1 | 4 | Data tab shell, Item editor, state management |
| D2 | 3 | TM editor, Pokedex editor, Party editor |
| D3 | 3 | Rich dropdown selectors (ItemPicker, PokedexPicker, etc.) |
| D4 | 3 | Save endpoint extensions for all data types |
| D5 | 4 | Badge, Research Log, Field Move, Gate editors |
| D6 | 1 | Cross-reference validation |
| **Total** | **19 tasks** | |
