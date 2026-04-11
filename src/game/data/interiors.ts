/**
 * Interior map definitions — metadata for each building interior
 * including tilemap paths, dimensions, music, exit warps, and NPCs.
 */

import { getSave, awardBadge, type GameSave } from "@/game/systems/GameSave";
import type { DynamicDialogResult } from "@/game/types/npc";
import { sfx } from "@/game/systems/SoundManager";

export interface InteriorNPC {
  id: string;
  spriteKey: string;
  position: { x: number; y: number };
  facingDirection: "up" | "down" | "left" | "right";
  dialog: string[];
  speakerName: string;
  /**
   * Dynamic dialog — if provided, called instead of static `dialog`.
   * Receives the current GameSave so dialog varies by player state.
   */
  dialogFn?: (save: GameSave) => DynamicDialogResult | Promise<DynamicDialogResult>;
}

/**
 * A letter/questionnaire pickup object placed on a tile. Interacting with
 * it opens the questionnaire UI. If `iconUrl` is provided, the icon is
 * rendered as a small sprite on the tile.
 */
export interface QuestionnaireTile {
  x: number;
  y: number;
  /** Unique id for pickup tracking. */
  id: string;
  /** Optional icon rendered at the tile. */
  iconUrl?: string;
  /** Pixel offset applied to the icon sprite (default 0). */
  iconOffsetX?: number;
  iconOffsetY?: number;
}

export interface InteriorDef {
  key: string;
  displayName: string;
  mapJson: string;
  tilesetBottom: string;
  tilesetTop: string;
  width: number;
  height: number;
  music: string;
  exitWarpTiles: { x: number; y: number }[];
  pcTiles?: { x: number; y: number }[];
  questionnaireTiles?: QuestionnaireTile[];
  npcs: InteriorNPC[];
}

export const INTERIORS: Record<string, InteriorDef> = {
  pokecenter: {
    key: "pokecenter",
    displayName: "POKeMON CENTER",
    mapJson: "/game/maps/pokecenter.json",
    tilesetBottom: "/game/tilesets/pokecenter_bottom.png",
    tilesetTop: "/game/tilesets/pokecenter_top.png",
    width: 14,
    height: 9,
    music: "pokecenter",
    exitWarpTiles: [{ x: 6, y: 8 }, { x: 7, y: 8 }],
    pcTiles: [{ x: 10, y: 1 }],
    npcs: [
      {
        id: "pc_nurse",
        spriteKey: "nurse",
        position: { x: 7, y: 2 },
        facingDirection: "down",
        speakerName: "NURSE JOY",
        dialog: [
          "Welcome to the POKeMON CENTER!",
          "Let me take a look at your projects...",
          "All 6 of your repos are looking healthy!",
          "Come back anytime you need a code review!",
        ],
      },
      {
        id: "pc_oldman",
        spriteKey: "fat_man",
        position: { x: 2, y: 3 },
        facingDirection: "left",
        speakerName: "OLD MAN",
        dialog: [
          "Did you know KOSTAS defended his PhD at UTK?",
          "His advisor Dr. Qi trained him well in the ways of machine learning.",
          "A PhD is like evolving a POKeMON... it takes patience!",
        ],
      },
      {
        id: "pc_woman1",
        spriteKey: "woman_1",
        position: { x: 8, y: 6 },
        facingDirection: "down",
        speakerName: "RESEARCHER",
        dialog: [
          "I heard KOSTAS published at NeurIPS!",
          "MEDiC uses CLIP distillation for medical imaging.",
          "That's like teaching a POKeMON a TM move!",
        ],
      },
      {
        id: "pc_trainer",
        spriteKey: "rich_boy",
        position: { x: 11, y: 4 },
        facingDirection: "left",
        speakerName: "RICH BOY",
        dialog: [
          "Whoa! KOSTAS has over 8,300 GitHub followers!",
          "That's more fans than most GYM LEADERS have!",
        ],
      },
      {
        id: "pc_youngster",
        spriteKey: "school_kid_m",
        position: { x: 2, y: 8 },
        facingDirection: "up",
        speakerName: "YOUNGSTER",
        dialog: [
          "Have you checked out HuggingFace?",
          "KOSTAS has datasets there for training POKeMON... I mean, AI models!",
        ],
      },
    ],
  },

  mart: {
    key: "mart",
    displayName: "POKeMART",
    mapJson: "/game/maps/mart.json",
    tilesetBottom: "/game/tilesets/mart_bottom.png",
    tilesetTop: "/game/tilesets/mart_top.png",
    width: 11,
    height: 8,
    music: "mart",
    exitWarpTiles: [{ x: 3, y: 7 }, { x: 4, y: 7 }],
    // A letter sits on the counter at (2, 4). The player can interact
    // with it by standing at (3, 4) and facing LEFT.
    questionnaireTiles: [
      {
        x: 2,
        y: 4,
        id: "mart_letter",
        iconUrl: "/game/ui/bag/letter.png",
      },
    ],
    npcs: [
      {
        id: "mart_clerk",
        spriteKey: "school_kid_m",
        position: { x: 1, y: 3 },
        facingDirection: "right",
        speakerName: "CLERK",
        dialog: [
          "Welcome to the POKeMART!",
          "We stock the finest PyPI packages!",
          "yaml-config-wrapper, termcolor-logger, fancy-emailer...",
          "All crafted by KOSTAS himself!",
        ],
      },
      {
        id: "mart_expert",
        spriteKey: "maniac",
        position: { x: 5, y: 4 },
        facingDirection: "right",
        speakerName: "EXPERT",
        dialog: [
          "I always use YAML configs for my projects.",
          "KOSTAS made a PyPI package that wraps it all up nicely.",
          "Configuration management is an underrated skill!",
        ],
      },
      {
        id: "mart_man",
        spriteKey: "boy_3",
        position: { x: 5, y: 5 },
        facingDirection: "right",
        speakerName: "DEVELOPER",
        dialog: [
          "I just deployed my app to the cloud!",
          "KOSTAS has a Cloud-DevOps toolkit that makes it easy.",
          "High availability, auto-scaling... the works!",
        ],
      },
    ],
  },

  gym: {
    key: "gym",
    displayName: "MAUVILLE GYM",
    mapJson: "/game/maps/gym.json",
    tilesetBottom: "/game/tilesets/gym_bottom.png",
    tilesetTop: "/game/tilesets/gym_top.png",
    width: 10,
    height: 21,
    music: "gym",
    exitWarpTiles: [{ x: 4, y: 20 }, { x: 5, y: 20 }],
    npcs: [
      {
        id: "gym_kostas",
        spriteKey: "boy_3",
        position: { x: 5, y: 2 },
        facingDirection: "down",
        speakerName: "KOSTAS",
        dialog: [
          "Welcome to my GYM!",
        ],
        dialogFn: (save: GameSave): DynamicDialogResult => {
          const BADGE_ORDER = [
            { id: "phd",       name: "PhD" },
            { id: "scholar",   name: "SCHOLAR" },
            { id: "opensource", name: "OPEN SOURCE" },
            { id: "author",    name: "AUTHOR" },
            { id: "fullstack", name: "FULL STACK" },
            { id: "explorer",  name: "EXPLORER" },
            { id: "devoted",   name: "DEVOTED" },
            { id: "champion",  name: "CHAMPION" },
          ];
          // Find the first unearned badge
          const nextIndex = BADGE_ORDER.findIndex((b) => !save.badges.includes(b.id));
          const next = nextIndex >= 0 ? BADGE_ORDER[nextIndex] : undefined;
          if (next) {
            return {
              lines: [
                `You've been working hard!`,
                `Take the ${next.name} BADGE`,
                `as proof of your skills!`,
              ],
              afterDialog: async ({ dialogSystem }) => {
                // Pick jingle + matching async variant by badge rank:
                //  - CHAMPION (8th)  → battle-symbol fanfare
                //  - DEVOTED  (7th)  → "Received BP!" variant
                //  - otherwise       → standard badge jingle
                const jinglePromise =
                  next.id === "champion"
                    ? sfx.badgeChampionAsync()
                    : nextIndex === BADGE_ORDER.length - 2
                      ? sfx.badgeFinalGymAsync()
                      : sfx.badgeGetAsync();
                // Show the "Received" confirmation dialog in parallel
                // with the jingle. Promise.all waits for BOTH the
                // sound to finish AND the player to dismiss, so the
                // conversation can't close until the jingle ends —
                // matching OG Pokemon behavior.
                await Promise.all([
                  jinglePromise,
                  dialogSystem.showDialog({
                    lines: [
                      `KOSTAS handed over`,
                      `the ${next.name} BADGE!`,
                    ],
                  }),
                ]);
                awardBadge(next.id);
              },
            };
          }
          // All 8 badges earned
          return {
            lines: [
              "Wahahahaha! You've collected",
              "all 8 badges! You're a true",
              "CHAMPION of ML Engineering!",
            ],
          };
        },
      },
      {
        id: "gym_guide",
        spriteKey: "boy_3",
        position: { x: 7, y: 20 },
        facingDirection: "left",
        speakerName: "GYM GUIDE",
        dialog: [
          "Hey! This GYM tests ML Engineering skills!",
          "KOSTAS is an Applied Scientist L5 at Amazon.",
          "You'll need to master DevOps, Cloud, and Full-Stack to win!",
        ],
      },
      {
        id: "gym_shawn",
        spriteKey: "maniac",
        position: { x: 7, y: 8 },
        facingDirection: "down",
        speakerName: "TRAINER SHAWN",
        dialog: [
          "I train in the ways of DevOps!",
          "Docker, Kubernetes, CI/CD pipelines...",
          "KOSTAS built the Cloud-DevOps toolkit!",
        ],
      },
      {
        id: "gym_vivian",
        spriteKey: "woman_4",
        position: { x: 1, y: 16 },
        facingDirection: "up",
        speakerName: "TRAINER VIVIAN",
        dialog: [
          "Data Science is my specialty!",
          "KOSTAS teaches machines to see with computer vision.",
          "His remote sensing papers are groundbreaking!",
        ],
      },
      {
        id: "gym_ben",
        spriteKey: "school_kid_m",
        position: { x: 5, y: 10 },
        facingDirection: "left",
        speakerName: "TRAINER BEN",
        dialog: [
          "I'm all about Full-Stack development!",
          "React, Astro, Node.js, Python...",
          "This very portfolio is built with Astro + Phaser!",
        ],
      },
      {
        id: "gym_kirk",
        spriteKey: "rich_boy",
        position: { x: 1, y: 13 },
        facingDirection: "down",
        speakerName: "TRAINER KIRK",
        dialog: [
          "Cloud computing is the future!",
          "AWS, GCP, Terraform, Kubernetes...",
          "KOSTAS deploys models at scale for Amazon!",
        ],
      },
    ],
  },
};
