import { Direction } from "grid-engine";
import { MovementBehavior, type NPCDefinition, type SignDefinition } from "@/game/types/npc";
import { WILD_POKEMON } from "@/game/data/wild-pokemon";
import { getGithubDialog, GITHUB_FALLBACK_LINES } from "@/game/npcs/live/github";
import { getSpotifyDialog, SPOTIFY_FALLBACK_LINES } from "@/game/npcs/live/spotify";
import { getStravaDialog, STRAVA_FALLBACK_LINES } from "@/game/npcs/live/strava";

/**
 * Offset applied to all Mauville positions to account for the stitched
 * route map. Mauville sits at (50, 50) in the 140x120 stitched map:
 *   50 cols of Route 117 to the west, 50 cols of Route 118 to the east,
 *   50 rows of Route 111 to the north, 50 rows of Route 110 to the south.
 *
 * Positions below are the ORIGINAL Mauville coordinates from events.json.
 * We apply the offset when building the actual NPC/sign lists.
 */
export const MAUVILLE_ORIGIN = { x: 50, y: 50 };

function offsetPos(p: { x: number; y: number }) {
  return { x: p.x + MAUVILLE_ORIGIN.x, y: p.y + MAUVILLE_ORIGIN.y };
}

/**
 * Shared Pokedex data for the 10 Poochyena NPCs in the Aqua/Magma
 * standoff. All 10 reference the same entry so that talking to the
 * first one registers the species, and all subsequent talks — on any
 * of the 10 — fall into the repeat-dialog path in NPCSystem.
 */
const POOCHYENA_DEX: NonNullable<NPCDefinition["pokemon"]> = {
  pokedexNumber: 35,
  speciesName: "POOCHYENA",
  projectName: "Log Hounds",
  projectDescription: "Distributed log monitoring\nagents.",
  repeatDialog: [
    "The POOCHYENA snarls.",
    "Grrrr...!",
  ],
};

/**
 * Raw NPC definitions sourced from Pokemon Emerald's Mauville events.json,
 * with dialog replaced by portfolio content for Kostas Georgiou.
 * Positions are in ORIGINAL Mauville coordinates; offsets are applied below.
 */
const MAUVILLE_NPCS_RAW: NPCDefinition[] = [
  // LIVE NPC #2 — Spotify Guy, stationed in front of the Game
  // Corner (Mauville Casino). Casino door is at (8, 13), NPC sits
  // one tile below at (8, 14). Pulls current / most-recent track
  // from /api/spotify/now-playing and reports it in a dialog like:
  //   "KOSTAS is listening to..."
  //   "Hakuna Matata"
  //   "by Timon & Pumbaa"
  // Casino theme → music → Spotify. Static fallback lines when the
  // Spotify API is rate-limited / offline.
  {
    id: "npc_mauville_spotify",
    spriteKey: "boy_3",
    position: { x: 8, y: 14 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: SPOTIFY_FALLBACK_LINES,
    dialogFn: async () => {
      const lines = await getSpotifyDialog();
      return { lines };
    },
    speakerName: "MUSIC FAN",
    animated: true,
  },

  // LIVE NPC #3 — Strava Nerd, stationed outside the Bike Shop.
  // Bike Shop door is at (35, 5), NPC sits one tile below at
  // (35, 6). Bike Shop → cycling / running → Strava. Pulls the
  // most recent allowed activity from /api/strava/recent (filtered
  // to Run/TrailRun/Snowboard/Kitesurf) and reports distance + pace.
  // Falls back to a "KOSTAS runs marathons" static line on API
  // failure.
  {
    id: "npc_mauville_strava",
    spriteKey: "school_kid_m",
    position: { x: 35, y: 6 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: STRAVA_FALLBACK_LINES,
    dialogFn: async () => {
      const lines = await getStravaDialog();
      return { lines };
    },
    speakerName: "STRAVA NERD",
    animated: true,
  },

  // NPC 1: Boy at (29,16), wanders left-right, range 1x1.
  // BLOG GIVER #3 — "Ray Tune Tips" post on HPO tricks (this NPC
  // is literally the one "waiting for KOSTAS to share tricks").
  {
    id: "npc_boy_3",
    spriteKey: "boy_3",
    position: { x: 29, y: 16 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.WANDER_LEFT_RIGHT,
    movementRangeX: 1,
    movementRangeY: 1,
    dialog: [
      "KOSTAS just dropped a post full",
      "of Ray Tune HPO tricks — game",
      "changer for my training runs.",
      "Here, share a copy!",
    ],
    autoGive: {
      itemId: "blog_ray_tune_tips",
      asidePosition: { x: 29, y: 17 },
      clearedDialog: [
        "I'm rewriting all my sweeps",
        "with those Ray Tune patterns.",
      ],
    },
    speakerName: "Boy",
    animated: true,
  },

  // NPC 2: Rich Boy at (24,10), wanders left-right, range 1x0.
  // BLOG GIVER #4 — "Amazon L5" post (Rich Boy + Amazon = fit).
  {
    id: "npc_rich_boy",
    spriteKey: "rich_boy",
    position: { x: 24, y: 10 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.WANDER_LEFT_RIGHT,
    movementRangeX: 1,
    movementRangeY: 0,
    dialog: [
      "KOSTAS's Amazon L5 reflection post",
      "finally answered my question about",
      "year-one Applied Scientist ramp.",
      "Take a copy — pass it along!",
    ],
    autoGive: {
      itemId: "blog_amazon_l5",
      asidePosition: { x: 25, y: 10 },
      clearedDialog: [
        "Applied Scientist L5 is the",
        "dream job for a lot of us.",
      ],
    },
    speakerName: "Rich Boy",
    animated: true,
  },

  // NPC 3: Maniac at (14,11), faces right.
  // BLOG GIVER #5 — "MAE Across Scales" post (remote-sensing nerd
  // matches the maniac vibe).
  {
    id: "npc_maniac",
    spriteKey: "maniac",
    position: { x: 14, y: 11 },
    facingDirection: Direction.RIGHT,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "KOSTAS wrote about MAE training",
      "across remote-sensing scales!",
      "It unlocked how I think about",
      "pre-training objectives. Here!",
    ],
    autoGive: {
      itemId: "blog_mae_scale",
      asidePosition: { x: 15, y: 11 },
      clearedDialog: [
        "Multi-scale features are all",
        "you need for RS backbones.",
      ],
    },
    speakerName: "Maniac",
    animated: true,
  },

  // NPC 4: Woman at (18,8), looks around — moved from (18,6) which was inside building
  {
    // BLOG GIVER #2 — hands the player KOSTAS's first blog post.
    // Thematically the "tutorial about CLIP distillation" matches
    // the launch "Hello World" post about getting started.
    id: "npc_woman_4",
    spriteKey: "woman_4",
    position: { x: 18, y: 8 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.LOOK_AROUND,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "Did you read KOSTAS's first",
      "Hello World post? It's a great",
      "intro to his writing style.",
      "Here, take a copy!",
    ],
    autoGive: {
      itemId: "blog_first_post",
      asidePosition: { x: 17, y: 8 },
      clearedDialog: [
        "That blog post is a classic —",
        "I read it every time I start",
        "a new project.",
      ],
    },
    speakerName: "Woman",
    animated: true,
  },

  // NPC 5: School Kid at (17,14), faces down.
  // BLOG GIVER #1 — hands the player KOSTAS's PhD journey post.
  // Wired via autoGive so the first interaction plays the dialog,
  // drops the blog into the BLOGS pocket, and the NPC then steps
  // aside so subsequent talks show the `clearedDialog`.
  {
    id: "npc_school_kid_m",
    spriteKey: "school_kid_m",
    position: { x: 17, y: 14 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "KOSTAS just posted about his",
      "PhD journey at UTK!",
      "Here — share the blog post",
      "with your friends!",
    ],
    autoGive: {
      itemId: "blog_phd_journey",
      asidePosition: { x: 16, y: 14 },
      clearedDialog: [
        "That blog post really hits home.",
        "Hope he keeps writing!",
      ],
    },
    speakerName: "School Kid",
    animated: true,
  },

  // NPC 6: Fat Man / Rollout Tutor at (13,7), faces left.
  // BLOG GIVER #6 — "Jupyter → Prod" post (tutor vibe matches the
  // "moving research to real systems" essay).
  {
    id: "npc_fat_man",
    spriteKey: "fat_man",
    position: { x: 13, y: 7 },
    facingDirection: Direction.LEFT,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "Wahaha! KOSTAS just wrote an",
      "essay on moving ML research",
      "from Jupyter notebooks to real",
      "production systems. Required",
      "reading — take a copy!",
    ],
    autoGive: {
      itemId: "blog_jupyter_to_prod",
      asidePosition: { x: 12, y: 7 },
      clearedDialog: [
        "Notebooks are a starting point,",
        "not a destination. Wahaha!",
      ],
    },
    speakerName: "Tutor",
    animated: true,
  },

  // NPC 7: Item Ball at (28,19) — easter egg resume pickup.
  // Uses the itemId path so the drop registers in GameSave's
  // keyItemsCollected and contributes to the CONNECTED badge.
  {
    id: "npc_item_ball",
    spriteKey: "item_ball",
    position: { x: 28, y: 19 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "You found RESUME.PDF!",
      "KOSTAS's CV has been added to",
      "your KEY ITEMS!",
    ],
    animated: false,
    pickup: {
      itemId: "key_resume",
    },
  },
];

/**
 * NPCs on the connecting routes. Positions are in FINAL STITCHED-MAP
 * coordinates (not offset at build time like MAUVILLE_NPCS_RAW above),
 * because route NPCs come from routes, not Mauville.
 *
 * To go from pret route-local coord (rx, ry) to stitched coord:
 *   Route 117 (W): stitched = (rx - 10,       50 + ry)    // took cols 10-59
 *   Route 118 (E): stitched = (rx + 90,       50 + ry)    // took cols 0-49
 *   Route 110 (S): stitched = (rx + 50,       ry + 70)    // took rows 0-49
 *   Route 111 (N): stitched = (rx + 50,       ry - 90)    // took rows 90-139
 */
const ROUTE_NPCS: NPCDefinition[] = [
  // ── Route 117 (west): 3 NPCs ──────────────────────────────
  // Maniac at Route117 (17,12) -> stitched (7, 62).
  // PAPER GIVER — "Teach. Asst." (semi-supervised OD with better
  // pseudo-labels). OBSESSED-with-research persona is a natural fit.
  {
    id: "npc_r117_maniac",
    spriteKey: "maniac",
    position: { x: 7, y: 62 },
    facingDirection: Direction.UP,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "I'm OBSESSED with KOSTAS's paper",
      "on teaching assistants for better",
      "pseudo-labels! Semi-supervised OD",
      "is so underrated. Here — read it!",
    ],
    autoGive: {
      itemId: "paper_teaching_asst",
      asidePosition: { x: 8, y: 62 },
      clearedDialog: [
        "Semi-supervised object detection",
        "is the future of labeling!",
      ],
    },
    speakerName: "Route Maniac",
    animated: true,
  },
  // Boy (was little_boy but that sprite is 144x16 and breaks rendering)
  // at Route117 (25,5) -> stitched (15, 55)
  {
    id: "npc_r117_little_boy",
    spriteKey: "rich_boy",
    position: { x: 15, y: 55 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.LOOK_AROUND,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "When I grow up I wanna be",
      "an Applied Scientist at",
      "a big company like KOSTAS!",
    ],
    speakerName: "Rich Boy",
    animated: true,
  },
  // Lass at Route117 (43,6) -> stitched (33, 56).
  // BLOG GIVER #7 — "CLIP Distill" post companion to the MEDiC
  // paper at the gym. Her publication-heavy dialog maps naturally
  // to a deep-dive explainer.
  {
    id: "npc_r117_lass",
    spriteKey: "lass",
    position: { x: 33, y: 56 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "KOSTAS's CLIP Distill explainer",
      "finally made the MEDiC paper",
      "click for me — here, take a",
      "copy of the blog post!",
    ],
    autoGive: {
      itemId: "blog_clip_distill",
      asidePosition: { x: 34, y: 56 },
      clearedDialog: [
        "Distilling vision-language models",
        "is harder than it looks!",
      ],
    },
    speakerName: "Lass",
    animated: true,
  },

  // ── Route 118 (east): 3 NPCs ──────────────────────────────
  // Fisherman at Route118 (28,8) -> stitched (118, 58).
  // PAPER GIVER — "Koopman KTD" (satellite imagery transition
  // detection). The "cast a training run and wait" fishing
  // metaphor maps beautifully to the paper's patient Koopman
  // decomposition method.
  {
    id: "npc_r118_fisherman",
    spriteKey: "fisherman",
    position: { x: 118, y: 58 },
    facingDirection: Direction.LEFT,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "I was reading KOSTAS's Koopman",
      "paper — transition detection in",
      "satellite imagery. Patient work,",
      "like fishing. Here, take a copy!",
    ],
    autoGive: {
      itemId: "paper_koopman_igarss",
      asidePosition: { x: 119, y: 58 },
      clearedDialog: [
        "Koopman operators decompose",
        "dynamics from satellite video!",
      ],
    },
    speakerName: "Fisherman",
    animated: true,
  },
  // Woman_2 at Route118 (7,12) -> stitched (97, 62).
  // BLOG GIVER #8 — "Maritime AI" post. Her existing FleetSmart.ai
  // dialog is the perfect lead-in to the origin-story essay.
  {
    id: "npc_r118_woman_2",
    spriteKey: "woman_2",
    position: { x: 97, y: 62 },
    facingDirection: Direction.UP,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "I read KOSTAS's essay on how",
      "FleetSmart.ai grew from a dorm",
      "room to 40+ enterprise vessels.",
      "Here — take a copy!",
    ],
    autoGive: {
      itemId: "blog_maritime_ai",
      asidePosition: { x: 98, y: 62 },
      clearedDialog: [
        "Building a startup during a PhD",
        "is not for the faint of heart!",
      ],
    },
    speakerName: "Woman",
    animated: true,
  },
  // Youngster at Route118 (7,7) -> stitched (97, 57)
  {
    id: "npc_r118_youngster",
    spriteKey: "youngster",
    position: { x: 97, y: 57 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.WANDER_LEFT_RIGHT,
    movementRangeX: 1,
    movementRangeY: 0,
    dialog: [
      "I heard KOSTAS has 8,300+",
      "followers on GitHub!",
      "His MaskDistill-PyTorch got",
      "STARS on its first day!",
    ],
    speakerName: "Youngster",
    animated: true,
  },

  // ── Route 110 (south): 3 NPCs ─────────────────────────────
  // Boy_3 at Route110 (15,7) -> stitched (65, 77)
  {
    id: "npc_r110_boy_3",
    spriteKey: "boy_3",
    position: { x: 65, y: 77 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.WANDER_LEFT_RIGHT,
    movementRangeX: 1,
    movementRangeY: 0,
    dialog: [
      "Cycling Road is closed but did",
      "you know KOSTAS built XpensAI?",
      "It's an expense management app",
      "powered by AI!",
    ],
    speakerName: "Boy",
    animated: true,
  },
  // Fisherman at Route110 (10,19) -> stitched (60, 89).
  // PAPER GIVER — "LLM Security" (code-gen LLMs comparative
  // analysis). The "I used to write my own ML code" line maps
  // to the paper's point that LLMs auto-generate insecure code.
  {
    id: "npc_r110_fisherman",
    spriteKey: "fisherman",
    position: { x: 60, y: 89 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "I used to write my own code...",
      "Now I let LLMs do it. But did",
      "you read KOSTAS's paper on how",
      "code-gen LLMs are occasionally",
      "secure at best? Scary stuff —",
      "here, take a copy!",
    ],
    autoGive: {
      itemId: "paper_occasionally_secure",
      asidePosition: { x: 61, y: 89 },
      clearedDialog: [
        "Always review LLM-generated code.",
        "Trust but verify!",
      ],
    },
    speakerName: "Fisherman",
    animated: true,
  },
  // Girl_2 — BLOG GIVER #9 — "ShiftMD Story" post. Her nurse-mom
  // dialog already references the shift scheduler; adding the
  // origin-story blog makes the narrative complete.
  {
    id: "npc_r110_girl_2",
    spriteKey: "girl_2",
    position: { x: 60, y: 78 },
    facingDirection: Direction.LEFT,
    movementBehavior: MovementBehavior.LOOK_AROUND,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "My mom's nurse roster uses",
      "ShiftMD! KOSTAS even wrote up",
      "the whole constraint-programming",
      "story — take a copy of the post!",
    ],
    autoGive: {
      itemId: "blog_shiftmd_story",
      asidePosition: { x: 61, y: 78 },
      clearedDialog: [
        "Constraint programming sounds",
        "scary but ShiftMD makes it easy.",
      ],
    },
    speakerName: "Girl",
    animated: true,
  },

  // ── Route 111 (north): 3 NPCs ─────────────────────────────
  // Man_1 at Route111 (13,114) -> stitched (63, 24).
  // PAPER GIVER — "Community" (distributed hybrid community
  // detection). This NPC already name-drops Dr. Qi and UTK,
  // which ties perfectly to KOSTAS's earliest publication.
  {
    id: "npc_r111_man_1",
    spriteKey: "man_1",
    position: { x: 63, y: 24 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "KOSTAS did his PhD at UTK under",
      "Dr. Qi. Did you know his FIRST",
      "paper was on community detection",
      "in social networks? Here — his",
      "earliest work!",
    ],
    autoGive: {
      itemId: "paper_community_detection",
      asidePosition: { x: 62, y: 24 },
      clearedDialog: [
        "Distributed graph algorithms",
        "are where KOSTAS started!",
      ],
    },
    speakerName: "Man",
    animated: true,
  },
  // Fat_man at Route111 (19,101) -> stitched (69, 11).
  // BLOG GIVER #10 — "Why I Blog" meta essay. The scholar
  // persona who geeks out over NeurIPS is the right fit for the
  // "writing is how I figure out what I believe" post.
  {
    id: "npc_r111_fat_man",
    spriteKey: "fat_man",
    position: { x: 69, y: 11 },
    facingDirection: Direction.UP,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "KOSTAS just wrote a meta essay",
      "on why he blogs at all. Writing",
      "is how you figure out what you",
      "actually believe. Pure fire —",
      "here, take a copy!",
    ],
    autoGive: {
      itemId: "blog_why_i_blog",
      asidePosition: { x: 68, y: 11 },
      clearedDialog: [
        "Writing in public changed how",
        "I think about my own research.",
      ],
    },
    speakerName: "Scholar",
    animated: true,
  },
  // Pokefan_f at Route111 (13,113) -> stitched (63, 23).
  // Original (62, 23) was inside a building wall — moved to (60, 18).
  {
    id: "npc_r111_pokefan_f",
    spriteKey: "pokefan_f",
    position: { x: 60, y: 18 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "Did you know KOSTAS maintains",
      "7 PyPi packages? He loves",
      "sharing tools with the community!",
    ],
    speakerName: "Pokemon Fan",
    animated: true,
  },

  // ── Pickup item balls in routes ───────────────────────────
  // Route 117 item ball at (16,18) -> stitched (6, 68) — GitHub link
  {
    id: "npc_r117_item_ball",
    spriteKey: "item_ball",
    position: { x: 6, y: 68 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "You found GITHUB.URL!",
      "A link to KOSTAS's 8,300-follower",
      "GitHub has been added to",
      "your KEY ITEMS!",
    ],
    animated: false,
    pickup: {
      itemId: "key_github",
    },
  },
  // Route 118 item ball at a walkable tile -> LinkedIn
  // Was at (112, 62) which is water — moved to (107, 59).
  {
    id: "npc_r118_item_ball",
    spriteKey: "item_ball",
    position: { x: 107, y: 59 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "You found LINKEDIN.URL!",
      "KOSTAS's professional profile",
      "has been added to your",
      "KEY ITEMS!",
    ],
    animated: false,
    pickup: {
      itemId: "key_linkedin",
    },
  },
  // Route 110 item ball at (26,47) -> stitched (76, 117) — HuggingFace
  {
    id: "npc_r110_item_ball",
    spriteKey: "item_ball",
    position: { x: 76, y: 117 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "You found HUGGINGFACE.URL!",
      "KOSTAS's HuggingFace profile",
      "with his models and datasets",
      "has been added to KEY ITEMS!",
    ],
    animated: false,
    pickup: {
      itemId: "key_huggingface",
    },
  },
  // Route 111 item ball at (19,118) -> stitched (69, 28) — Google Scholar
  {
    id: "npc_r111_item_ball",
    spriteKey: "item_ball",
    position: { x: 69, y: 28 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "You found SCHOLAR.URL!",
      "KOSTAS's Google Scholar page",
      "with all 10 publications has",
      "been added to KEY ITEMS!",
    ],
    animated: false,
    pickup: {
      itemId: "key_scholar",
    },
  },
  // MEW / endgame phone-number pickup. The original design spec
  // had MEW at (139, 59) — a water-boundary tile, unreachable
  // without the water field move. With FIELD_MOVE_AWARDS still
  // empty, we keep the ball on land for now at (130, 62) in the
  // east route 118 area so the player can still complete the
  // CHAMPION badge via normal play. Remove the `spawnCondition`
  // guard once 6 KOSTAS badges is the only gate we trust.
  {
    id: "npc_r118_mew_phone",
    spriteKey: "item_ball",
    position: { x: 130, y: 62 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "A shimmering Pokeball sits here.",
      "It feels like MEW is inside.",
      "You received PHONE.NUMBER!",
      "KOSTAS's personal line — use it",
      "only when you're ready to be",
      "in touch.",
    ],
    animated: false,
    pickup: {
      itemId: "key_phone_number",
    },
  },

  // Snorlax blocker — sits on a 32x32 sprite in Route 111 rocky area.
  // Classic Kanto-style path blocker. Non-animated, not a pickup.
  // First encounter registers in Pokedex as a Boundary Pokemon.
  {
    id: "npc_snorlax",
    spriteKey: "snorlax",
    position: { x: 68, y: 9 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "A huge SNORLAX is blocking",
      "the path!",
      "...",
      "Zzz... Zzz...",
      "",
      "It's dreaming of KOSTAS's",
      "PyTorch training runs.",
      "You can't wake it up.",
    ],
    speakerName: "???",
    animated: false,
    pokemon: {
      pokedexNumber: 32,
      speciesName: "SNORLAX",
      projectName: "LLM Trainer",
      projectDescription: "Long-running deep learning\ntraining infrastructure.",
      repeatDialog: [
        "SNORLAX is still sleeping,",
        "dreaming of PyTorch runs...",
        "Zzz... Zzz...",
      ],
    },
  },

  // ── Magma vs Aqua standoff on Route 117 ─────────────────────
  // Col 14: Aqua grunts facing right | Col 15: Aqua Poochyena facing right
  // Col 16: Magma Poochyena facing left | Col 17: Magma grunts facing left
  // Uses OG overworld Poochyena sprite (both teams use them in-game).
  //
  // All 10 Poochyena share the same Pokedex entry (#35). The first one
  // the player talks to registers; subsequent talks — on ANY of them —
  // show the repeat dialog automatically (NPCSystem checks the shared
  // pokedexNumber).

  // Row 57
  { id: "npc_aqua_grunt_1", spriteKey: "aqua_member_m", position: { x: 14, y: 57 }, facingDirection: Direction.RIGHT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Team Aqua will expand the sea!", "For all water Pokemon!"], speakerName: "Aqua Grunt", animated: true },
  { id: "npc_aqua_pooch_1", spriteKey: "poochyena_ow", position: { x: 15, y: 57 }, facingDirection: Direction.RIGHT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Grrrr...!"], speakerName: "POOCHYENA", animated: true, pokemon: POOCHYENA_DEX },
  { id: "npc_magma_pooch_1", spriteKey: "poochyena_ow", position: { x: 16, y: 57 }, facingDirection: Direction.LEFT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Grrrowl...!"], speakerName: "POOCHYENA", animated: true, pokemon: POOCHYENA_DEX },
  { id: "npc_magma_grunt_1", spriteKey: "magma_member_m", position: { x: 17, y: 57 }, facingDirection: Direction.LEFT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Team Magma will expand the land!", "For all ground Pokemon!"], speakerName: "Magma Grunt", animated: true },

  // Row 58
  { id: "npc_aqua_grunt_2", spriteKey: "aqua_member_f", position: { x: 14, y: 58 }, facingDirection: Direction.RIGHT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["You can't stop us!", "The ocean will swallow everything!"], speakerName: "Aqua Grunt", animated: true },
  { id: "npc_aqua_pooch_2", spriteKey: "poochyena_ow", position: { x: 15, y: 58 }, facingDirection: Direction.RIGHT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Bark bark!"], speakerName: "POOCHYENA", animated: true, pokemon: POOCHYENA_DEX },
  { id: "npc_magma_pooch_2", spriteKey: "poochyena_ow", position: { x: 16, y: 58 }, facingDirection: Direction.LEFT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Rrruff!"], speakerName: "POOCHYENA", animated: true, pokemon: POOCHYENA_DEX },
  { id: "npc_magma_grunt_2", spriteKey: "magma_member_f", position: { x: 17, y: 58 }, facingDirection: Direction.LEFT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["More land means more room", "for Pokemon to live!"], speakerName: "Magma Grunt", animated: true },

  // Row 59
  { id: "npc_aqua_grunt_3", spriteKey: "aqua_member_m", position: { x: 14, y: 59 }, facingDirection: Direction.RIGHT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Our leader ARCHIE will", "awaken KYOGRE!"], speakerName: "Aqua Grunt", animated: true },
  { id: "npc_aqua_pooch_3", spriteKey: "poochyena_ow", position: { x: 15, y: 59 }, facingDirection: Direction.RIGHT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Grrrr...!"], speakerName: "POOCHYENA", animated: true, pokemon: POOCHYENA_DEX },
  { id: "npc_magma_pooch_3", spriteKey: "poochyena_ow", position: { x: 16, y: 59 }, facingDirection: Direction.LEFT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Grrrowl...!"], speakerName: "POOCHYENA", animated: true, pokemon: POOCHYENA_DEX },
  { id: "npc_magma_grunt_3", spriteKey: "magma_member_m", position: { x: 17, y: 59 }, facingDirection: Direction.LEFT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["MAXIE will awaken GROUDON!", "Just you wait!"], speakerName: "Magma Grunt", animated: true },

  // Row 60
  { id: "npc_aqua_grunt_4", spriteKey: "aqua_member_f", position: { x: 14, y: 60 }, facingDirection: Direction.RIGHT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Get out of our way, kid!", "This is Team Aqua territory!"], speakerName: "Aqua Grunt", animated: true },
  { id: "npc_aqua_pooch_4", spriteKey: "poochyena_ow", position: { x: 15, y: 60 }, facingDirection: Direction.RIGHT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Bark bark!"], speakerName: "POOCHYENA", animated: true, pokemon: POOCHYENA_DEX },
  { id: "npc_magma_pooch_4", spriteKey: "poochyena_ow", position: { x: 16, y: 60 }, facingDirection: Direction.LEFT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Rrruff!"], speakerName: "POOCHYENA", animated: true, pokemon: POOCHYENA_DEX },
  { id: "npc_magma_grunt_4", spriteKey: "magma_member_f", position: { x: 17, y: 60 }, facingDirection: Direction.LEFT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Scram! This is a Magma", "operation!"], speakerName: "Magma Grunt", animated: true },

  // Row 61
  { id: "npc_aqua_grunt_5", spriteKey: "aqua_member_m", position: { x: 14, y: 61 }, facingDirection: Direction.RIGHT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Heh... you think you can", "take on all of Team Aqua?"], speakerName: "Aqua Grunt", animated: true },
  { id: "npc_aqua_pooch_5", spriteKey: "poochyena_ow", position: { x: 15, y: 61 }, facingDirection: Direction.RIGHT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Grrrr...!"], speakerName: "POOCHYENA", animated: true, pokemon: POOCHYENA_DEX },
  { id: "npc_magma_pooch_5", spriteKey: "poochyena_ow", position: { x: 16, y: 61 }, facingDirection: Direction.LEFT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["Grrrowl...!"], speakerName: "POOCHYENA", animated: true, pokemon: POOCHYENA_DEX },
  { id: "npc_magma_grunt_5", spriteKey: "magma_member_m", position: { x: 17, y: 61 }, facingDirection: Direction.LEFT, movementBehavior: MovementBehavior.STATIONARY, movementRangeX: 0, movementRangeY: 0, dialog: ["We won't lose to you", "sea-loving fools!"], speakerName: "Magma Grunt", animated: true },

  // ── Sleepy Pokemon trio on Route 110 ─────────────────────────
  // Slakoth above, Slaking in the middle, Slakoth below — all sleeping.
  // Both Slakoth share the same Pokedex entry (first talk registers,
  // subsequent talks — on either Slakoth — show repeatDialog).
  {
    id: "npc_slakoth_top",
    spriteKey: "slakoth",
    position: { x: 59, y: 109 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "A SLAKOTH is curled up,",
      "sleeping soundly...",
      "Zzz...",
    ],
    speakerName: "???",
    animated: false,
    pokemon: {
      pokedexNumber: 34,
      speciesName: "SLAKOTH",
      projectName: "Notebook Lab",
      projectDescription: "Research sandbox for\nJupyter experiments.",
      repeatDialog: [
        "The SLAKOTH yawns slowly.",
        "Zzz...",
      ],
    },
  },
  {
    id: "npc_slaking",
    spriteKey: "slaking",
    position: { x: 59, y: 110 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "A SLAKING is sprawled across",
      "the path, fast asleep!",
      "...",
      "Zzz... Zzz...",
      "",
      "It won't budge. Typical SLAKING.",
    ],
    speakerName: "???",
    animated: false,
    pokemon: {
      pokedexNumber: 33,
      speciesName: "SLAKING",
      projectName: "Data Lake",
      projectDescription: "Large-scale data processing\nand ETL pipeline.",
      repeatDialog: [
        "SLAKING hasn't moved an inch.",
        "Typical SLAKING.",
      ],
    },
  },
  {
    id: "npc_slakoth_bottom",
    spriteKey: "slakoth",
    position: { x: 59, y: 111 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "Another SLAKOTH... also asleep.",
      "These Pokemon really live up",
      "to their name.",
      "Zzz...",
    ],
    speakerName: "???",
    animated: false,
    pokemon: {
      pokedexNumber: 34,
      speciesName: "SLAKOTH",
      projectName: "Notebook Lab",
      projectDescription: "Research sandbox for\nJupyter experiments.",
      repeatDialog: [
        "The SLAKOTH yawns slowly.",
        "Zzz...",
      ],
    },
  },

  // Daycare Man (Old Man) at Route117 (47,4) -> stitched (37, 54)
  // Uses old_man sprite which is 48x32 (3 frames of 16x32). BootScene
  // loads him as a 3-frame spritesheet specifically to avoid the row
  // duplication bug that broke little_boy.
  //
  // LIVE NPC #1 — pulls GitHub follower / star count from the in-site
  // `/api/stats/github` endpoint each time the player talks to him.
  // `dialog` here is the static fallback in case the fetch fails or
  // returns malformed JSON; `dialogFn` is the live path. NPCSystem
  // awaits dialogFn so the fetch doesn't block the game loop.
  {
    id: "npc_r117_daycare",
    spriteKey: "old_man",
    position: { x: 37, y: 54 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: GITHUB_FALLBACK_LINES,
    dialogFn: async () => {
      const lines = await getGithubDialog();
      return { lines };
    },
    speakerName: "Day Care Man",
    animated: false,  // 3-frame sprite, Grid Engine can't use walkingAnimationMapping
  },
];

/**
 * Public NPC list combining the Mauville-city NPCs (with offsets applied)
 * and the route NPCs (already in stitched-map coords).
 */
export const MAUVILLE_NPCS: NPCDefinition[] = [
  ...MAUVILLE_NPCS_RAW.map((npc) => ({
    ...npc,
    position: offsetPos(npc.position),
  })),
  ...ROUTE_NPCS,
  ...WILD_POKEMON,
];

/**
 * Raw sign definitions from the original bg_events in events.json.
 * Positions are in ORIGINAL Mauville coordinates.
 */
const MAUVILLE_SIGNS_RAW: SignDefinition[] = [
  // City sign at (19,7) — original: MauvilleCity_EventScript_CitySign
  {
    position: { x: 19, y: 7 },
    text: [
      "MAUVILLE CITY",
      "Where ML meets adventure!",
    ],
  },
  // Gym sign at (11,6) — original: MauvilleCity_EventScript_GymSign
  {
    position: { x: 11, y: 6 },
    text: [
      "MAUVILLE GYM",
      "Leader: KOSTAS",
      "The Shocking ML Engineer",
    ],
  },
  // Pokemon Center sign at (24,5). The original OG layout had signs
  // at (23,5) and (24,5); (23,5) is the RIGHT half of the PC's double
  // warp door, so any sign placed there is permanently shadowed by
  // the warp trigger. Kept a single sign on the non-warp tile.
  {
    position: { x: 24, y: 5 },
    text: ["POKEMON CENTER"],
  },
  // Poke Mart sign at (25,14). Same story — (24,14) is the RIGHT
  // half of the Mart's double warp door and was dropped.
  {
    position: { x: 25, y: 14 },
    text: ["POKE MART"],
  },
  // Bike Shop sign at (33,6) — Rydel's is closed for maintenance.
  // (Pre-merge there were two additional sign entries here at (11,6)
  // and (33,6) with stale "locked door" text — the (11,6) entry had
  // the wrong position (gym tile) and the (33,6) entry duplicated
  // the storefront sign. They were merged into this single entry.)
  {
    position: { x: 33, y: 6 },
    text: [
      "RYDEL'S CYCLES",
      "Closed for maintenance.",
      "Check back later!",
    ],
  },
  // Game Corner sign at (11,15). The OG had this as a generic
  // "GAME CORNER" — replaced with a full blurb that points at the
  // in-game Game Corner content (Spotify link NPC inside).
  {
    position: { x: 11, y: 15 },
    text: [
      "GAME CORNER",
      "Slots, coins, and the best",
      "Spotify playlist in town.",
    ],
  },

  // Blog Tower sign at (8,18). The Blog Tower is an (imagined)
  // building that hosts KOSTAS's writing — referenced by NPCs and
  // the papers-Pokemon storyline.
  {
    position: { x: 8, y: 18 },
    text: [
      "BLOG TOWER",
      "Where every draft eventually",
      "becomes a published post.",
    ],
  },
  // Observatory (north of Mauville) at (28,4) — ties into Research
  // Log's "8,300 followers" and Cross-Scale MAE papers.
  {
    position: { x: 28, y: 4 },
    text: [
      "MAUVILLE OBSERVATORY",
      "Home of the Cross-Scale MAE.",
      "Telescope currently pointed at",
      "GitHub commit graphs.",
    ],
  },
  // Welcome arch at the south gate (17,26)
  {
    position: { x: 17, y: 26 },
    text: [
      "WELCOME TO MAUVILLE",
      "Population: 8,300 followers",
      "and counting.",
    ],
  },

  // ── Locked door messages ──────────────────────────────
  // Houses — press A on the door tile to read.
  {
    position: { x: 0, y: 6 },
    text: [
      "The door is locked.",
      "Nobody seems to be home.",
    ],
  },
  // Second locked-door easter egg — the west-edge researcher's
  // house is "always in a meeting with Dr. Qi".
  {
    position: { x: 2, y: 20 },
    text: [
      "The door is locked.",
      "Post-It: 'In a meeting with",
      "Dr. Hairong Qi — back soon.'",
    ],
  },
];

/**
 * Route signs — positions already in stitched-map coordinates, same
 * transformation convention as ROUTE_NPCS above.
 */
const ROUTE_SIGNS: SignDefinition[] = [
  // ── Route 117 (west) ───────────────────────────────
  // Verdanturf route sign at Route117 (16, 6) -> (6, 56)
  {
    position: { x: 6, y: 56 },
    text: [
      "ROUTE 117",
      "West: Verdanturf Town",
      "(Closed for construction)",
    ],
  },
  // Day Care sign at Route117 (49, 5) -> (39, 55)
  {
    position: { x: 39, y: 55 },
    text: [
      "ML MODEL DAY CARE",
      "Leave your models with us",
      "and we'll train them for you!",
    ],
  },
  // Mauville route sign at Route117 (49, 12) -> (39, 62)
  {
    position: { x: 39, y: 62 },
    text: [
      "ROUTE 117",
      "East: Mauville City",
      "Home of KOSTAS",
    ],
  },

  // ── Route 118 (east) ───────────────────────────────
  // Mauville sign at Route118 (13, 6) -> (103, 56)
  {
    position: { x: 103, y: 56 },
    text: [
      "ROUTE 118",
      "West: Mauville City",
      "Home of KOSTAS",
    ],
  },

  // ── Route 110 (south) ──────────────────────────────
  // Mauville sign at Route110 (3, 17) -> (53, 87)
  {
    position: { x: 53, y: 87 },
    text: [
      "ROUTE 110",
      "North: Mauville City",
    ],
  },
  // Cycling Road sign at Route110 (13, 16) -> (63, 86)
  {
    position: { x: 63, y: 86 },
    text: [
      "CYCLING ROAD",
      "Currently used as a test track",
      "for KOSTAS's FleetSmart.ai",
      "autonomous vehicle experiments!",
    ],
  },
  // Vandalized sign at Route110 (15, 25) -> (65, 95)
  {
    position: { x: 65, y: 95 },
    text: [
      "THIS SIGN HAS BEEN HACKED",
      "> KOSTAS OWNZ THIS ROUTE",
      "> PWNT BY THE GITHUB KING",
    ],
  },

  // ── Route 111 (north) ──────────────────────────────
  // Winstrate house sign at Route111 (16, 114) -> (66, 24)
  {
    position: { x: 66, y: 24 },
    text: [
      "THE RESEARCHER'S HOUSE",
      "Inside: a family that reads",
      "KOSTAS's papers every Sunday.",
    ],
  },
  // Trainer Hill sign at Route111 (24, 116) -> (74, 26)
  {
    position: { x: 74, y: 26 },
    text: [
      "ML TRAINING HILL",
      "Climb 100 floors of GPU hours!",
      "Record holder: KOSTAS",
      "Top floor: 8xH100 cluster",
    ],
  },
  // Mauville sign at Route111 (24, 126) -> (74, 36)
  {
    position: { x: 74, y: 36 },
    text: [
      "ROUTE 111",
      "South: Mauville City",
    ],
  },
];

/**
 * Public sign list: Mauville signs (offset applied) + route signs.
 */
export const MAUVILLE_SIGNS: SignDefinition[] = [
  ...MAUVILLE_SIGNS_RAW.map((s) => ({
    ...s,
    position: offsetPos(s.position),
  })),
  ...ROUTE_SIGNS,
];
