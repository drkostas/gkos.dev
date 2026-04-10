# Explore Mode — Placement Map

> Exact coordinates for every NPC, item, Pokemon, sign, and warp.
> All coordinates are in the stitched 140×120 tilemap.
> Mauville origin = (50,50). Route NPCs use absolute coordinates.

---

## MAUVILLE CITY (x:50-89, y:50-69)

```
     0123456789012345678901234567890123456789
     50        60        70        80
 50| ##..........#.......####################
 51| ##..........#.......#.##################
 52| #....######.#.......####################
 53| ##..#######.#.......#########.##########   TOWER
 54| #############.......#########.##########   (locked)
 55| #......###...........#####.......#######
 56| #..S.S..DD.#......4...D..........#.....#
 57| ......J......F.....#....................   J=Spotify guy
 58| .......................H................   H=hidden TM:SUPABASE
 59| ........................................   (player spawns ~72,58)
 60| ........................R...............
 61| #....#######..M.........................
 62| #....#######..############.....#########
 63| #....###.###..#...########.....#########   BIKE SHOP
 64| #######.......#..K########.....#########   (locked)
 65| ##....#....#..#........DD...........####
 66| #####.#.......#..............B.....###..
 67| #######.......#.......T.........V.###..   T=TM:REACT V=TM:TYPESCRIPT
 68| ###############....##############..#####
 69| #########.##.......########.i.....###~~~
```

### Mauville NPCs — FINAL ASSIGNMENTS

| Coord | Sprite | ID | Role | Dialog summary |
|---|---|---|---|---|
| **(68,56)** | woman_4 | npc_woman_4 | **Blog NPC #1** | Offers first blog post (yes/no) |
| **(63,57)** | fat_man | npc_fat_man | **Flavor + hint** | Talks about Greece → hints at hidden item near flowers on R117 |
| **(74,60)** | rich_boy | npc_rich_boy | **Flavor** | Brags about GitHub followers, hints at Pokedex in grass |
| **(64,61)** | maniac | npc_maniac | **Flavor + hint** | Talks about digging for embeddings, hints at hidden TM at (58,58) |
| **(67,64)** | school_kid_m | npc_school_kid | **Blog NPC #2** | Offers second blog post |
| **(79,66)** | boy_3 | npc_boy_3 | **Flavor** | Excited about the Gym, hints you need to talk to all trainers |
| **(57,57)** | *(new)* girl_3 | npc_spotify | **Spotify guy** | Shows current track, mentions Soma project nearby |
| **(78,69)** | item_ball | npc_item_resume | **Pickup: RESUME.PDF** | Visible item ball |
| **(67,67)** | item_ball | npc_tm_react | **Pickup: TM:REACT** | Visible item ball |
| **(82,67)** | item_ball | npc_tm_typescript | **Pickup: TM:TYPESCRIPT** | Visible item ball |
| **(58,58)** | *(hidden)* | hidden_supabase | **Hidden: TM:SUPABASE** | Walk over + press A |

### Mauville Signs — FINAL

| Coord | Sign text |
|---|---|
| (69,55) | "MAUVILLE CITY — Where ML meets adventure!" |
| (61,55) | "MAUVILLE GYM — Leader: KOSTAS — Specialty: COMPUTER VISION" |
| (73,55) | "POKéMON CENTER" |
| (74,55) | "POKéMON CENTER" |
| (73,64) | "POKéMART" |
| (74,64) | "POKéMART" |
| (83,55) | "RYDEL'S PIPELINES — OPENING SOON" |
| (61,62) | "GAME CORNER — CLOSED FOR RENOVATION" |
| (79,53) | "MAUVILLE BROADCAST TOWER — Currently off-air" |

### Mauville Warps

| Overworld tile | Target | Interior spawn |
|---|---|---|
| (58,56), (59,56) | Gym | (4,19) and (5,19) |
| (72,56) | Pokemon Center | (7,7) |
| (73,65), (74,65) | Poke Mart | (3,6) and (4,6) |

---

## GYM INTERIOR (10×21)

```
     0123456789
  0| ##########
  1| ##########
  2| ####.K####   K = KOSTAS (Gym Leader, gives badges + dissertation)
  3| ####..####
  4| ###.6..###   6 = Trainer 6: ExPLoRe (ECCV Under Review)
  5| ###....###
  6| ####.5####   5 = Trainer 5: MEDiC (arXiv 2026)
  7| ##########
  8| ####..#...
  9| ..4...#...   4 = Trainer 4: Trustworthy AI (CHASE 2025)
 10| ......#...
 11| ####..#..#
 12| ..........
 13| .3.....###   3 = Trainer 3: Multi-Scale RS Fine-Tuning (IGARSS 2024)
 14| ...#######
 15| ..........
 16| .2........   2 = Trainer 2: Cross-Scale MAE (NeurIPS 2023)
 17| ##......##
 18| ##.#..#.##
 19| ##..1...##   1 = Trainer 1: mCL-LC (WACV 2023)
 20| ##.....G##   G = Gym Guide (tips about the gym)
```

### Gym NPCs — FINAL ASSIGNMENTS

| Pos | ID | Sprite | Paper | Dialog |
|---|---|---|---|---|
| **(5,2)** | gym_kostas | rival sprite | Gym Leader | Dynamic dialog based on badges (see design doc §8) |
| **(4,4)** | gym_tr6 | woman_4 | ExPLoRe (ECCV) | "My latest work captures LONG-RANGE dependencies in SATELLITE imagery. Under review at ECCV! Want the paper?" |
| **(5,6)** | gym_tr5 | maniac | MEDiC (arXiv 2026) | "I DISTILLED CLIP into a tiny model for MEDICAL imaging. It's called MEDiC! Paper?" |
| **(2,9)** | gym_tr4 | school_kid_m | Trustworthy AI (CHASE 2025) | "Can we make AI TRUSTWORTHY for DEMENTIA detection? I wrote a paper about it!" |
| **(1,13)** | gym_tr3 | rich_boy | Multi-Scale RS (IGARSS 2024) | "Fine-tuning SELF-SUPERVISED models for REMOTE SENSING... I figured it out!" |
| **(1,16)** | gym_tr2 | boy_3 | Cross-Scale MAE (NeurIPS 2023) | "MASKED AUTOENCODERS at MULTIPLE SCALES! Accepted at NEURIPS!" |
| **(3,19)** | gym_tr1 | lass | mCL-LC (WACV 2023) | "CONTRASTIVE LEARNING for aerial image SEGMENTATION! My first big paper!" |
| **(7,20)** | gym_guide | boy_3 | Gym Guide | "This GYM holds KOSTAS's PhD research! Talk to each trainer to collect papers!" |

---

## POKéMON CENTER INTERIOR (14×9)

```
      0 1 2 3 4 5 6 7 8 9 A B C D
  0|  # # # # # # # # # # # # # #
  1|  # # # # # # # # # # # # # #
  2|  . .PC . # # # N . # . . . .   N=Nurse Joy, PC=Computer
  3|  . . . . # # # # # # . . . .
  4|  . . . . . . . . . . . S . .   S=Strava nerd (was rich_boy)
  5|  . . . . . . . . . . . . . .
  6|  # . . . . . . . . . . # # .
  7|  . .Y . . . . . . . . # # .   Y=Youngster (flavor, Pokedex hint)
  8|  # . . . . . . . . . . . . #
```

### Pokémon Center NPCs — FINAL

| Pos | ID | Sprite | Role | Dialog |
|---|---|---|---|---|
| **(7,2)** | pc_nurse | woman_4 | **Nurse Joy** | "Your POKéMON are healthy!" + rotating gameplay hints (see design doc §4b) |
| **(1,2)** | pc_computer | *(interact tile)* | **PC** | "KOSTAS's PC booted up!" → SKILL STORAGE view of collected TMs |
| **(11,4)** | pc_strava | rich_boy | **Strava nerd** | Shows last 3 activities + YTD stats (live from /api/strava) |
| **(2,7)** | pc_youngster | school_kid_m | **Flavor** | "Have you checked the POKéDEX? Walk through GRASS to find PROJECTS!" |

---

## POKéMART INTERIOR (11×8)

```
      0 1 2 3 4 5 6 7 8 9 A
  0|  # # # # # # # # # # #
  1|  # # # # # # # # # # #
  2|  . . # . . . . . . . .
  3|  . C # . . . . . . . #   C=Clerk (PyPI packages)
  4|  # # # . . . # # . . #
  5|  . . . . . S # # . . #   S=Step tracker guy
  6|  . .D . . . # # . . #   D=Developer (flavor, cloud hint)
  7|  . . . . . . . . . . .
```

### Mart NPCs — FINAL

| Pos | ID | Sprite | Role | Dialog |
|---|---|---|---|---|
| **(1,3)** | mart_clerk | school_kid_m | **Clerk** | "Welcome! We stock PyPI packages!" + lists packages with download counts |
| **(5,5)** | mart_steps | maniac | **Step Tracker** | Shows step count + TM milestones (see design doc §6) |
| **(2,6)** | mart_dev | boy_3 | **Flavor** | "I deploy to the cloud! KOSTAS has a Cloud-DevOps toolkit!" |

---

## ROUTE 117 WEST (x:0-49, y:44-69)

```
Key area (y:54-68, x:0-49):

     0         10        20        30        40
     0123456789012345678901234567890123456789012345678
 54| ....#.......##############..~.~#.....O..####.....
 55| ....#..........R#####################.###########
 56| ....#.#.........#####............L................
 57| ...##.........AppX###.............................
 58| ..............AppX......N1.........................
 59| ..............AppX...........########.............
 60| ..........###.AppX...........########.............
 61| ..........####AppX..........##########............
 62| .......M..######............##########.#..........
 63| #...###.~~######............##.###.##...........##
 64| ......#~~~########.~~~......##.....##........#####
 65| ......#~~~########~~~~~....................#######
 66| ......#~~~########~~~~~~....P1...........#######
 67| ##################~~~~~~~.................########
 68| ......i###.######.##~~~~~................#########
```

### Route 117 NPCs — FINAL

| Coord | Sprite | ID | Role | Dialog |
|---|---|---|---|---|
| **(7,62)** | maniac | npc_r117_maniac | **Flavor + hint** | "Digging for RARE EMBEDDINGS!" → hints at hidden TM:GCP at (8,64) |
| **(15,55)** | rich_boy | npc_r117_rich_boy | **Flavor** | "Wanna be Applied Scientist like KOSTAS!" |
| **(33,56)** | lass | npc_r117_lass | **Blog NPC #3** | Offers blog post (yes/no), then hints about item near flowers |
| **(37,54)** | old_man | npc_r117_daycare | **Day Care Man** | GitHub commit activity (live from /api/stats/github) |
| **(25,58)** | *(new)* woman_1 | npc_r117_paper | **Paper trainer: Hybrid Girvan-Newman (2019)** | "COMMUNITY DETECTION in social networks! My oldest paper!" |
| **(30,66)** | *(new)* girl_2 | npc_r117_blog4 | **Blog NPC #4** | Offers blog post |
| **(6,68)** | item_ball | npc_r117_item_github | **Pickup: GITHUB.URL** | Visible |
| **(8,64)** | *(hidden)* | hidden_gcp | **Hidden: TM:GCP** | Walk over + press A |
| **(14-17, 57-61)** | aqua+magma+poochyena | standoff | **Boundary blocker** | Magma vs Aqua dialog (ML scaling debate) |

### Route 117 Overworld Pokemon (in grass)

| Coord | Pokemon | Project mapping |
|---|---|---|
| **(30,50)** | Trapinch | Py Template |
| **(40,51)** | Seviper | YAML Configs |
| **(4,52)** | Torkoal | Termcolor Logger |

---

## ROUTE 118 EAST (x:90-139, y:50-69)

```
Key area (y:55-65, x:90-130):

     90        100       110       120       130
     0123456789012345678901234567890123456789012
 55| ###...############.####~~~~~~###.###.######
 56| #.....########.###~###~~~~~~#...#.##....###
 57| .......Y.........####~~~~~~##...#..#.......
 58| .................####~~~~~~#F.......#......
 59| .................i#~~~~~~~~#........##.....
 60| ..................#~~~~~~~~####....###.....
 61| ..................#~~~~~~~~~~#.....###.....
 62| .####..W........###~~~~~~~~~~#......#...###
 63| #####..##.......#~~~~~~~~~~~~~##...........
 64| .....#####..#...#~~~~~~~~~~~~~####.........
 65| ####....#.#..####~~~~~~~~~~~~~~N2~~~~~.....
```

### Route 118 NPCs — FINAL

| Coord | Sprite | ID | Role | Dialog |
|---|---|---|---|---|
| **(118,58)** | fisherman | npc_r118_fisherman | **Flavor** | "ML is like fishing... cast a training run, wait patiently!" |
| **(97,62)** | woman_2 | npc_r118_woman | **Blog NPC #5** | Offers blog post about FleetSmart |
| **(97,57)** | youngster | npc_r118_youngster | **Paper trainer: Occasionally Secure (arXiv 2024)** | "Code generation with LLMs... is it SECURE?" |
| **(107,59)** | item_ball | npc_r118_item_linkedin | **Pickup: LINKEDIN.URL** | Visible |
| **(105,65)** | *(new)* woman_1 | npc_r118_blog6 | **Blog NPC #6** | Offers blog post |
| **(120,57)** | *(hidden)* | hidden_vercel | **Hidden: TM:VERCEL** | Walk over + press A |
| **(95,55)** | *(hidden)* | hidden_twitter | **Hidden: TWITTER.URL** | Walk over + press A |

### Route 118 Overworld Pokemon

| Coord | Pokemon | Project mapping |
|---|---|---|
| **(110,56)** | Flygon | HF Datasets |
| **(93,60)** | Pelipper | CloudStore |
| **(128,58)** | Wailord *(visible in water edge)* | Cross-Fetch |

---

## ROUTE 111 NORTH (x:55-85, y:0-49)

```
Key area (y:0-30, x:55-75):

     55        65        75
     5678901234567890123456789
  0| ##........##~#~###..##...
  3| ...........####~~~####...
  5| ####.........##~##~~####.
  8| ######~##.....#########~#
  9| ~#~########..Z.#####~~###   Z=SNORLAX (boundary blocker)
 10| ~~~##~~######..######~###
 11| ##~~~########.F...###~~##
 14| #######.....##.....#~#~##
 18| #####P...###......########
 20| ################.....#####
 24| ########M####.....###.....
 28| ..#######.....i#.......##~
 30| ##.......###.........######
 38| #############..#.....#..#.
 42| ###...###...............#.
 44| #.####..............##...#
 48| .......#.......#...######
```

### Route 111 NPCs — FINAL

| Coord | Sprite | ID | Role | Dialog |
|---|---|---|---|---|
| **(63,24)** | man_1 | npc_r111_man | **Flavor** | "KOSTAS did his PhD at UTK Bredesen Center!" |
| **(69,11)** | fat_man | npc_r111_fat_man | **Paper trainer: Cross-Scale MAE extra mention** | "NeurIPS! Like a gym badge from Professor Oak!" |
| **(60,18)** | pokefan_f | npc_r111_pokefan | **Blog NPC #7** | Offers blog post about PhD journey |
| **(68,9)** | snorlax | npc_snorlax | **Boundary blocker + Pokedex** | "SNORLAX is blocking..." (registers in Pokedex on talk) |
| **(69,28)** | item_ball | npc_r111_item_scholar | **Pickup: SCHOLAR.URL** | Visible |
| **(62,40)** | *(new)* boy_3 | npc_r111_paper2 | **Paper trainer: Teaching Asst Pseudo-Labels (2025)** | "Improving pseudo-labels for semi-supervised detection!" |
| **(58,30)** | *(hidden)* | hidden_wandb | **Hidden: TM:WANDB** | Walk over + press A |
| **(63,5)** | *(hidden)* | hidden_email | **Hidden: EMAIL contact** | Walk over + press A |

### Route 111 Overworld Pokemon

| Coord | Pokemon | Project mapping |
|---|---|---|
| **(65,42)** | Camerupt | HGG in RS |
| **(60,33)** | Solrock | DSE 512 |
| **(58,15)** | Glalie | ACUTE |

---

## ROUTE 110 SOUTH (x:55-90, y:70-119)

```
Key area (y:70-119, x:55-85):

     55        65        75        85
     567890123456789012345678901234567
 70| #######.......#########.########
 75| ######......#####################
 77| #####.....B.##..............#####
 80| #####.......####..###...#####.###
 85| .........#.##.#..............####
 87| ...........G#.....###...##..####
 89| ...##F#...###########...########
 95| .##~~~~#####~~~~~#...##~###.####
100| ~##........................######
105| ~#####...###################~~~~~
109| ....z.......~~.~.~..~~.~.~~~#~.~
110| ~~~~Z.........~..~~~~.~.~.~~~~~~
111| ~~~~z......~.~..~~~.~~~~~~~~~~~~
115| ##~~~#...##~##~~~~~~~~~~~~~##~~~~
117| #~~~~#...##~~##~~~~#.i.#~##~~~~~
```

### Route 110 NPCs — FINAL

| Coord | Sprite | ID | Role | Dialog |
|---|---|---|---|---|
| **(65,77)** | boy_3 | npc_r110_boy | **Flavor** | "Cycling Road is closed! But KOSTAS built XpensAI!" |
| **(60,89)** | fisherman | npc_r110_fisherman | **Blog NPC #8** | Offers blog post about PyTorch tricks |
| **(66,87)** | girl_2 | npc_r110_girl | **Blog NPC #9** | Offers blog post about ShiftMD |
| **(76,117)** | item_ball | npc_r110_item_hf | **Pickup: HUGGINGFACE.URL** | Visible |
| **(59,109)** | slakoth | npc_slakoth_top | **Boundary blocker + Pokedex** | "SLAKOTH is sleeping..." |
| **(59,110)** | slaking | npc_slaking | **Boundary blocker + Pokedex** | "SLAKING won't budge!" |
| **(59,111)** | slakoth | npc_slakoth_bot | **Boundary blocker + Pokedex** | "Another SLAKOTH... also asleep." |
| **(62,82)** | *(new)* woman_2 | npc_r110_paper3 | **Paper trainer: Koopman Transition (IGARSS 2024)** | "CONSTRUCTION PHASES from satellite imagery!" |
| **(63,100)** | *(new)* youngster | npc_r110_blog10 | **Blog NPC #10** | Offers blog post |
| **(62,95)** | *(hidden)* | hidden_fastapi_extra | **Hidden: TM:REDIS** | Walk over + press A |

### Route 110 Overworld Pokemon (in grass/overworld)

| Coord | Pokemon | Project mapping |
|---|---|---|
| **(65,109)** | Mawile | Accident Bot |
| **(70,110)** | Sableye | Insta Bot |
| **(75,111)** | Shedinja | Onoma Bot |
| **(62,75)** | Manectric | XpensAI |
| **(63,85)** | Breloom | ShiftMD |

---

## EASTER EGGS — BEYOND BOUNDARIES

### Left edge (x=0-2, beyond Magma/Aqua standoff)
Visible Pokeball at **(3, 58)** — player can see it but can't reach it due to standoff.
If hacked to:
```
"You found PHONE.NUMBER!"
"KOSTAS's personal number: [number]"
"Tell him you found the easter egg."
```

### Right edge (x=137-139, beyond water)
MEW sprite floating at **(139, 59)** — visible on the water edge but unreachable.
If hacked to:
```
[MEW cry]
"MEW appeared!"
→ Registered in POKéDEX
→ CHAMPION BADGE earned!
```

MEW's Pokedex entry: "The rarest find. Only those who push past every boundary discover what's really possible."

### Out-of-bounds NPCs (scattered beyond map edges)
Multiple NPCs at impossible coordinates for hackers:

| Coord | Dialog |
|---|---|
| **(5, 2)** (beyond north rocks) | "...How did you get here? Email kostas@gkos.dev" |
| **(135, 57)** (beyond east water) | "Wait. This area doesn't exist. I'm impressed." |
| **(55, 118)** (beyond south grass) | "You broke the boundary. KOSTAS would love to know how." |

---

## STEP COUNTER TM MILESTONES

| Steps | TM | Skill |
|---|---|---|
| 500 | TM04 | REACT |
| 1,000 | TM05 | FASTAPI |
| 2,000 | TM06 | DOCKER |
| 3,000 | TM07 | NEXT.JS |
| 3,500 | TM08 | AWS |
| 4,000 | TM09 | PYTORCH |
| 5,000 | TM10 | KUBERNETES |
| 7,500 | TM11 | TERRAFORM |
| 10,000 | TM12 | SYSTEM DESIGN |

Pre-loaded in PC: TM01 PYTHON, TM02 GIT, TM03 LINUX

Found as visible item balls: TM:REACT (67,67), TM:TYPESCRIPT (82,67)

Found as hidden items: TM:SUPABASE (58,58), TM:GCP (8,64), TM:VERCEL (120,57), TM:WANDB (58,30), TM:REDIS (62,95)

Given by NPCs: TM:TAILWIND (from NPC near Bike Shop), TM:POSTGRESQL (from NPC on R118)

**Total: 20 TMs** (3 pre-loaded + 9 step milestones + 2 visible + 5 hidden + 2 NPC-given - 1 overlap = 20)

---

## FULL ITEM CHECKLIST

### Key Items (7 visible + 2 hidden + 1 easter egg)
- [ ] RESUME.PDF — Mauville (78,69)
- [ ] GITHUB.URL — Route 117 (6,68)
- [ ] LINKEDIN.URL — Route 118 (107,59)
- [ ] HUGGINGFACE.URL — Route 110 (76,117)
- [ ] SCHOLAR.URL — Route 111 (69,28)
- [ ] TWITTER.URL — Route 118 (95,55) *hidden*
- [ ] EMAIL — Route 111 (63,5) *hidden*
- [ ] PHONE.NUMBER — Left edge (3,58) *easter egg*

### Papers (6 gym + 4 route = 10)
Gym: mCL-LC, Cross-Scale MAE, Multi-Scale RS, Trustworthy AI, MEDiC, ExPLoRe
Route: Hybrid Girvan-Newman (R117), Occasionally Secure (R118), Teaching Asst (R111), Koopman (R110)

### Blog Posts (10 NPCs, scales with content)
Mauville: #1 (68,56), #2 (67,64)
Route 117: #3 (33,56), #4 (30,66)
Route 118: #5 (97,62), #6 (105,65)
Route 111: #7 (60,18)
Route 110: #8 (60,89), #9 (66,87), #10 (63,100)

### Overworld Pokemon (11 placed + Snorlax + Slaking family + Poochyena = ~25 Pokedex)
See individual route sections above.

### TMs (20 total)
See step counter section above.
