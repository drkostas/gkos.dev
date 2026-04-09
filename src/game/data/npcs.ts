import { Direction } from "grid-engine";
import { MovementBehavior, type NPCDefinition, type SignDefinition } from "@/game/types/npc";

/**
 * NPC definitions sourced from the original Mauville City events.json,
 * with dialog replaced by portfolio content for Kostas Georgiou.
 *
 * Positions, sprites, and movement types match Pokemon Emerald exactly.
 * Hidden-flag NPCs (Wally, Uncle, Wattson, Scott) are omitted for now.
 */
export const MAUVILLE_NPCS: NPCDefinition[] = [
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
      "Did you know KOSTAS has 8,300",
      "followers on GitHub?",
      "That's more than most trainers!",
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

  // NPC 4: Woman at (18,6), looks around
  {
    id: "npc_woman_4",
    spriteKey: "woman_4",
    position: { x: 18, y: 6 },
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
      "I heard KOSTAS has published 10",
      "papers. Even one at NeurIPS!",
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
 * Sign definitions sourced from the original bg_events in events.json,
 * with text replaced by portfolio-themed content.
 */
export const MAUVILLE_SIGNS: SignDefinition[] = [
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
  // Pokemon Center signs at (23,5) and (24,5)
  {
    position: { x: 23, y: 5 },
    text: ["POKEMON CENTER"],
  },
  {
    position: { x: 24, y: 5 },
    text: ["POKEMON CENTER"],
  },
  // Poke Mart signs at (24,14) and (25,14)
  {
    position: { x: 24, y: 14 },
    text: ["POKE MART"],
  },
  {
    position: { x: 25, y: 14 },
    text: ["POKE MART"],
  },
  // Bike Shop sign at (33,6)
  {
    position: { x: 33, y: 6 },
    text: ["RYDEL'S CYCLES"],
  },
  // Game Corner sign at (11,15)
  {
    position: { x: 11, y: 15 },
    text: ["GAME CORNER"],
  },
];
