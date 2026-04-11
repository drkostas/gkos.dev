# Explore Mode — TODO List

---

## PART 1: YOU BUILD (engine features)

### Priority 1 — Core Systems
```
□ 1.  Opening Screen
      - Tutorial text auto-advancing during asset loading
      - Text input field (player name)
      - Boy/Girl choice buttons  
      - Persist name + gender to localStorage
      - Skip if save exists → "Welcome back [NAME]!"
      - Mobile detection → "desktop only" message

□ 2.  Unified GameSave Manager
      - Single localStorage key: gkos:explore:save
      - Interface with all fields (see design doc §18)
      - Migrate existing PickupStore data on first load
      - Auto-persist every second (replaces SAVE button)

□ 3.  Hidden Items System
      - Data map: tile coordinate → item definition (name, pocket, url)
      - A-press priority: NPC facing > sign facing > hidden item standing on
      - Pickup dialog → item to correct bag pocket → mark collected in save
      - No visual on tile (truly hidden)
      - Placement types: rocks (easy), flowers (medium), ground between grass (hard)

□ 4.  Pokemon Encounter Flash + Pokedex Registration
      - On interacting with overworld Pokemon NPC:
        a. Screen flash white (0.2s overlay)
        b. Encounter sound plays
        c. Dialog shows species name + project description
        d. Auto-add ID to save.pokedexSeen[]
        e. "Registered in POKéDEX!" notification text
      - Only triggers ONCE per Pokemon (check save)
      - Second interaction → different dialog

□ 5.  Step Counter
      - Hook into Grid Engine positionChangeFinished for player
      - Increment save.steps by 1 per tile move
      - Autosave handles persistence

□ 6.  Play Time Tracker
      - Interval incrementing save.playTimeSeconds every second
      - Pauses when game is not focused (optional)
      - Display on Trainer Card
```

### Priority 2 — Item & Badge Systems
```
□ 7.  Item Goes to Specific Bag Pocket
      - Each item definition has a "pocket" field: papers | blogs | keyItems | tms
      - When item given (auto or yes/no), routes to correct pocket
      - Bag UI reads from save state per pocket

□ 8.  NPC Auto-Gives Item + Moves Aside
      - For gym trainers: dialog → item auto-added → trainer moves to
        "aside" position (or collision disabled)
      - Mark trainer as cleared in save.gymTrainersCleared[]
      - On subsequent visits: trainer already aside, different dialog

□ 9.  Step Milestone Check
      - After each step: check save.steps against milestone thresholds
      - If new milestone reached → auto-give TM to bag → notification
      - Milestone list defined in data array (I fill values)

□ 10. Badge Milestone Detection
      - After EVERY collection event check ALL badge conditions:
        PhD: gymTrainersCleared.length === 6
        SCHOLAR: papersCollected.length === totalPapers
        OPEN SOURCE: pokedexSeen.length === totalPokedex
        AUTHOR: blogsCollected.length === totalBlogs
        FULL STACK: tmsCollected.length === totalTMs
        EXPLORER: zonesVisited.length === 5
        DEVOTED: urlsOpened.length === totalUrls
        CHAMPION: all key items collected (including phone number)
      - If new badge completable → fire notification

□ 11. Notification Banner (non-blocking)
      - Slide-in from top, different visual from zone popup
      - Text customizable
      - Stays 3 seconds → slides out
      - Does NOT pause game or block input
```

### Priority 3 — NPC Types
```
□ 12. Dynamic NPC Dialog (state-based)
      - NPC whose dialog is a FUNCTION, not static string[]
      - Function receives save state → returns dialog lines
      - Template/example I can replicate for KOSTAS and others

□ 13. NPC State Memory
      - NPC checks save to decide dialog:
        "Has player collected my item?" → post-collection dialog
        "Has player completed gym?" → updated dialog
        "First visit vs returning?" → different greeting
      - NPC dialog definition supports: { firstDialog, afterDialog } or function

□ 14. Async NPC Dialog (API-powered)
      - Talk to NPC → brief "..." or "Loading..." → fetch URL →
        format response into dialog lines → display
      - Template/example for Strava/Spotify/GitHub/PyPI NPCs

□ 15. Conditional NPC Spawning
      - NPC definitions have optional condition: () => boolean
      - If condition returns false, NPC is not created in the scene
      - For blog NPCs: condition = () => blogData.length >= npcIndex
      - For guard NPCs: condition = () => !buildingOpen
```

### Priority 4 — UI
```
□ 16. HELP Sub-Screen (replaces SAVE in start menu)
      - Shows game objectives with current progress (from save)
      - Shows controls reminder
      - Shows hints for each badge/objective type
      - Navigable with arrows, exit with B

□ 17. Trainer Card Back Side
      - Flip card → progress display:
        Papers: N/M, Blogs: N/M, Pokemon: N/M,
        TMs: N/M, Key Items: N/M, URLs Opened: N/M,
        Research Log: #N, Badges: N/8
      - Reads from save state

□ 18. Trainer Card Color
      - Card background changes by badge count:
        0-1: Gray, 2-3: Green, 4-5: Blue, 6-7: Gold, 8: Red

□ 19. URL Open + Track
      - Bag: select item → "USE" → "Open [URL]?" Yes/No →
        window.open() → add to save.urlsOpened[]
      - Pokedex: select entry → "VIEW PROJECT" → same flow
      - ✓ mark on items whose URL has been opened

□ 20. Locked Door Message
      - Specific door tiles: A-press while facing → shows custom text
      - Same as sign system but for doors
      - Data-defined (I fill in which tiles + messages)
```

### Priority 5 — Late Game
```
□ 21. Research Log Key Item
      - Key item given to player when they collect it
      - "USE" from bag → opens reader showing unlocked entries
      - Entries unlock every 5 total discoveries
      - Log text defined in data (I write stories)

□ 22. Special Pokemon Interaction (MEW)
      - Same as regular Pokemon encounter (#4) BUT also:
        a. Gives KEY ITEM (phone number)
        b. Awards CHAMPION badge
        c. Unique dialog (not generic registration)
      - Needs to support: one interaction → multiple rewards

□ 23. New Content Detection
      - On game boot: compare save.lastKnownCounts vs current data lengths
      - If mismatch → show "New discoveries!" on loading screen
      - Update lastKnownCounts after notification

□ 24. New Game / Reset
      - In HELP or Options menu
      - "Clear all progress?" → Yes/No
      - Clears localStorage → reloads → Oak screen plays

□ 25. Party Pokemon Auto-Register
      - On game init (first spawn): add party Pokemon IDs to
        save.pokedexSeen[] automatically
```

---

## PART 2: HIDDEN ITEMS I NEED FROM YOU

After you build feature #3 (hidden items system), I need locations. Here's what I'll place:

### Easy (on rocks) — 2 items
```
□ TM:GCP — somewhere on Route 117 rocks
□ TM:WANDB — somewhere on Route 111 rocks
```

### Medium (on flowers) — 3 items
```
□ TM:SUPABASE — flowers in Mauville
□ TM:VERCEL — flowers on Route 118
□ TWITTER.URL — flowers on Route 118
```

### Hard (ground between grass blocks) — 3 items
```
□ TM:REDIS — ground between grass on Route 110
□ EMAIL contact — ground between grass on Route 111
□ TM:POSTGRESQL — ground between grass on Route 118
```

**Total: 8 hidden items** (4 TMs + 2 contacts + 2 TMs)

Give me the exact coordinates for:
- 2 rock tiles (easy)
- 3 flower tiles (medium)  
- 3 ground-between-grass tiles (hard)

And I'll assign items to each.

---

## PART 3: I DO AFTER YOU (content/customization)

Once all 25 engine features have working examples, I customize everything:

### NPCs — Placement & Dialog
```
□ Place all 6 gym PhD paper trainers (exact positions, auto-give dialog)
□ Place KOSTAS in gym (dynamic dialog with 7-priority state machine)
□ Place Gym Guide (state-aware dialog: before/after completion)
□ Place 4 route paper trainers (yes/no dialog, exact coords)
□ Place all blog NPCs (conditional spawn, yes/no dialog)
□ Place Spotify guy (57,57) with async Spotify dialog
□ Place Day Care Man (37,54) with async GitHub dialog
□ Place Strava Nerd in Pokecenter (11,4) with async Strava dialog
□ Place Step Tracker in Mart (5,5) with step milestone dialog
□ Place guard NPCs outside locked buildings
□ Rewrite ALL existing NPC dialogs to match design doc
□ Add NPC hints about nearby hidden items (vague, not explicit)
□ Rewrite Magma/Aqua dialog (ML scaling debate)
```

### Pokemon — Placement & Pokedex
```
□ Place all 24 overworld Pokemon at exact coordinates
□ Create Pokedex entries for all 30 (6 party auto + 24 overworld)
□ Each entry: species, project name, description, URL, types
□ Place interior Pokemon (Lairon in Mart, Delcatty in Pokecenter)
```

### Items — Placement
```
□ Place 5 visible contact Pokeballs (RESUME, GITHUB, LINKEDIN, HF, SCHOLAR)
□ Place 2 visible TM item balls in Mauville (REACT, TYPESCRIPT)
□ Assign 8 hidden items to coordinates you provide (see Part 2)
□ Place MEW at eastern boundary (139,59 or your chosen coord)
□ Place phone number Pokeball at western boundary
```

### Signs
```
□ Verify all sign positions against collision data (must be BLOCKED tiles)
□ Write all sign text per design doc
□ Add locked door messages (Game Corner, Bike Shop, Blog Tower)
□ Add route signs with closure messages
```

### TMs
```
□ Define all 20 TMs with names, descriptions, acquisition method
□ Set step milestone thresholds (250, 500, 1000, 1500, 2000, 3000, 4000, 6000, 8000)
□ Define which 3 TMs are pre-loaded in PC
□ Write Pokemart questionnaire questions + correct answers + TM rewards
```

### Bag
```
□ Define all 4 pocket contents and empty messages
□ Define item descriptions for every collectible
□ Set URLs for every item that has one
```

### Badges
```
□ Define exact conditions for all 8 badges
□ Write KOSTAS dialog for each badge claim
□ Define badge icons/visuals for Trainer Card
□ Wire CHAMPION badge quest chain (all contacts + phone from MEW)
```

### KOSTAS State Machine
```
□ Write all 7 priority dialog branches
□ Write guidance text for each incomplete objective
□ Write partial-progress encouragement ("You have 8/10 papers...")
□ Write CHAMPION emotional MEW story
□ Write post-phone-number subsequent visit dialog
```

### Research Log
```
□ Write 8+ log entry stories
□ Define discovery milestones (every 5)
□ Write KOSTAS dialog for each log unlock
```

### Trainer Card
```
□ Customize front: fields, layout, ID number
□ Customize back: progress categories, formatting
□ Define card color thresholds
```

### HELP Screen
```
□ Write objective descriptions for each badge
□ Write hints/tips per objective type
□ Write controls reference text
```

### Loading Screen
```
□ Write Oak tutorial text (8-10 lines, timed to loading progress)
□ Write returning player messages
□ Write new content notification text
```

### Blog
```
□ Write blog post #1: "Why I built a Pokemon game for my portfolio"
□ Place in src/content/blog/ so the game's blog NPC has content
```

### Easter Eggs
```
□ Place 3+ out-of-bounds NPCs with "how did you get here" dialog
□ Write MEW interaction dialog + phone number reveal
□ Write KOSTAS Champion badge emotional story
```

### Sounds
```
□ Source/create: encounter_ding.ogg
□ Source/create: badge_jingle.ogg
□ Source/create: phone_ring.ogg (OAK notification)
□ Source/create: mew_cry.ogg
□ Source/create: research_log.ogg
□ Source/find: gym BGM, pokecenter BGM, mart BGM
```

### Analytics
```
□ Wire Umami events for all game interactions
□ Track: game-start, pokedex-register, paper-collected, blog-collected,
  tm-earned, badge-earned, url-opened, research-log, champion-badge,
  phone-number-received, easter-egg
```

---

## DEPENDENCY CHAIN

```
YOU build engine features (Part 1)
         ↓
YOU give me hidden item coordinates (Part 2)
         ↓
I customize everything (Part 3)
         ↓
YOU review + adjust + polish
         ↓
SHIP
```
