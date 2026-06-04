import { Direction } from "grid-engine";
import { MovementBehavior, type NPCDefinition, type SignDefinition } from "@/game/types/npc";
import { WILD_POKEMON } from "@/game/data/wild-pokemon";

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
  // NPC 1: Boy at (29,16), wanders left-right, range 1x1
  {
    id: "npc_boy_3",
    spriteKey: "boy_3",
    position: { x: 29, y: 16 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.WANDER_LEFT_RIGHT,
    movementRangeX: 1,
    movementRangeY: 1,
    dialog: [
      "I'm waiting for KOSTAS to share his",
      "thoughts on ML training tricks!",
    ],
    speakerName: "Boy",
    animated: true,
  },

  // NPC 2: Rich Boy at (24,10), wanders left-right, range 1x0
  {
    id: "npc_rich_boy",
    spriteKey: "rich_boy",
    position: { x: 24, y: 10 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.WANDER_LEFT_RIGHT,
    movementRangeX: 1,
    movementRangeY: 0,
    dialog: [
      "Did you know KOSTAS ships a lot",
      "of stuff to GitHub?",
      "He just keeps building things.",
    ],
    speakerName: "Rich Boy",
    animated: true,
  },

  // NPC 3: Maniac at (14,11), faces right
  {
    id: "npc_maniac",
    spriteKey: "maniac",
    position: { x: 14, y: 11 },
    facingDirection: Direction.RIGHT,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "KOSTAS came all the way from Greece",
      "to study Machine Learning in America!",
    ],
    speakerName: "Maniac",
    animated: true,
  },

  // NPC 4: Woman at (18,8), looks around — moved from (18,6) which was inside building
  {
    id: "npc_woman_4",
    spriteKey: "woman_4",
    position: { x: 18, y: 8 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.LOOK_AROUND,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "Soon I'll have an amazing tutorial",
      "about CLIP distillation to tell",
      "you about!",
    ],
    speakerName: "Woman",
    animated: true,
  },

  // NPC 5: School Kid at (17,14), faces down
  {
    id: "npc_school_kid_m",
    spriteKey: "school_kid_m",
    position: { x: 17, y: 14 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "KOSTAS promised me a blog post about",
      "his PhD journey. Can't wait!",
    ],
    speakerName: "School Kid",
    animated: true,
  },

  // NPC 6: Fat Man / Rollout Tutor at (13,7), faces left
  {
    id: "npc_fat_man",
    spriteKey: "fat_man",
    position: { x: 13, y: 7 },
    facingDirection: Direction.LEFT,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "I heard KOSTAS has published",
      "a few papers. Even one at NeurIPS!",
      "Wahaha!",
    ],
    speakerName: "Tutor",
    animated: true,
  },

  // NPC 7: Item Ball at (28,19) — easter egg resume pickup
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
      itemName: "RESUME.PDF",
      itemUrl: "/resume.pdf",
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
  // Maniac at Route117 (17,12) -> stitched (7, 62)
  {
    id: "npc_r117_maniac",
    spriteKey: "maniac",
    position: { x: 7, y: 62 },
    facingDirection: Direction.UP,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "I'm OBSESSED with KOSTAS's",
      "research on CLIP distillation!",
      "MEDiC made medical VLMs way",
      "smaller without losing accuracy!",
    ],
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
      "a researcher and builder",
      "like KOSTAS!",
    ],
    speakerName: "Rich Boy",
    animated: true,
  },
  // Lass at Route117 (43,6) -> stitched (33, 56)
  {
    id: "npc_r117_lass",
    spriteKey: "lass",
    position: { x: 33, y: 56 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "KOSTAS published his first paper",
      "during his Master's. And kept",
      "writing them ever since.",
    ],
    speakerName: "Lass",
    animated: true,
  },

  // ── Route 118 (east): 3 NPCs ──────────────────────────────
  // Fisherman at Route118 (28,8) -> stitched (118, 58)
  {
    id: "npc_r118_fisherman",
    spriteKey: "fisherman",
    position: { x: 118, y: 58 },
    facingDirection: Direction.LEFT,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "Writing ML code is like fishing...",
      "You cast a training run,",
      "wait patiently, and hope the",
      "loss curve is biting today!",
    ],
    speakerName: "Fisherman",
    animated: true,
  },
  // Woman_2 at Route118 (7,12) -> stitched (97, 62)
  {
    id: "npc_r118_woman_2",
    spriteKey: "woman_2",
    position: { x: 97, y: 62 },
    facingDirection: Direction.UP,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "KOSTAS built FleetSmart.ai —",
      "the AI maritime platform that",
      "optimizes global shipping!",
      "Over 40 enterprise vessels use it!",
    ],
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
      "I heard KOSTAS ships a lot of",
      "open source on GitHub!",
      "His MaskDistill-PyTorch picked",
      "up some traction quickly.",
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
  // Fisherman at Route110 (10,19) -> stitched (60, 89)
  {
    id: "npc_r110_fisherman",
    spriteKey: "fisherman",
    position: { x: 60, y: 89 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "I used to write my own ML code...",
      "Now I just subscribe to KOSTAS's",
      "blog and learn his PyTorch tricks!",
    ],
    speakerName: "Fisherman",
    animated: true,
  },
  // Girl_2 — ShiftMD mention
  {
    id: "npc_r110_girl_2",
    spriteKey: "girl_2",
    position: { x: 60, y: 78 },
    facingDirection: Direction.LEFT,
    movementBehavior: MovementBehavior.LOOK_AROUND,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "My mom uses ShiftMD to schedule",
      "her nurse shifts. KOSTAS built",
      "it to automate tedious rostering!",
    ],
    speakerName: "Girl",
    animated: true,
  },

  // ── Route 111 (north): 3 NPCs ─────────────────────────────
  // Man_1 at Route111 (13,114) -> stitched (63, 24)
  {
    id: "npc_r111_man_1",
    spriteKey: "man_1",
    position: { x: 63, y: 24 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "KOSTAS did his PhD at UTK",
      "Bredesen Center under Dr. Hairong Qi.",
      "Defending in April 2026!",
    ],
    speakerName: "Man",
    animated: true,
  },
  // Fat_man at Route111 (19,101) -> stitched (69, 11)
  {
    id: "npc_r111_fat_man",
    spriteKey: "fat_man",
    position: { x: 69, y: 11 },
    facingDirection: Direction.UP,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "KOSTAS's paper on knowledge",
      "distillation got accepted at",
      "NeurIPS! That's like a gym",
      "badge from Professor Oak!",
    ],
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
      "A link to KOSTAS's GitHub",
      "has been added to",
      "your KEY ITEMS!",
    ],
    animated: false,
    pickup: {
      itemName: "GITHUB.URL",
      itemUrl: "https://github.com/drkostas",
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
      itemName: "LINKEDIN.URL",
      itemUrl: "https://linkedin.com/in/drkostas",
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
      itemName: "HUGGINGFACE.URL",
      itemUrl: "https://huggingface.co/drkostas",
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
      itemName: "SCHOLAR.URL",
      itemUrl: "https://scholar.google.com/citations?user=drkostas",
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
  {
    id: "npc_r117_daycare",
    spriteKey: "old_man",
    position: { x: 37, y: 54 },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [
      "Welcome to the ML MODEL DAY CARE!",
      "We train your models while you",
      "work on other projects.",
      "KOSTAS is our top trainer!",
      "His training pipelines have",
      "earned him some fans.",
    ],
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
  // Game Corner sign at (11,15)
  {
    position: { x: 11, y: 15 },
    text: ["GAME CORNER"],
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
