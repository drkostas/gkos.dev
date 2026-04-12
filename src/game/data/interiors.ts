/**
 * Interior map definitions — metadata for each building interior
 * including tilemap paths, dimensions, music, exit warps, and NPCs.
 */

import { getSave, awardBadge, type GameSave } from "@/game/systems/GameSave";
import { teachFieldMove } from "@/game/systems/PartySystem";
import { FIELD_MOVE_AWARDS } from "@/game/data/fieldMoveAwards";
import type { DynamicDialogResult } from "@/game/types/npc";
import { sfx } from "@/game/systems/SoundManager";
import { BADGES } from "@/game/systems/BadgeMilestones";

/**
 * KOSTAS state machine — 7 priority branches, each corresponding to a
 * badge the player may be eligible to claim. Used by the `gym_kostas`
 * NPC's `dialogFn` to decide what KOSTAS says and does on each
 * interaction.
 *
 *   priority 1: GYM badge — `save.gymComplete === true`
 *   priority 2: PUBLICATION — `save.papersCollected.length >= 10`
 *   priority 3: CONNECTED — `save.keyItemsCollected.length >= 7`
 *   priority 4: POKEDEX — `save.pokedexSeen.length >= 30`
 *   priority 5: BLOGGER — `save.blogsCollected.length >= allBlogs`
 *   priority 6: ENGINEER — `save.tmsCollected.length >= 20`
 *   priority 7 (fallback): no badge eligible — show the hint for the
 *     NEXT unearned badge ("keep working toward X!") so the player
 *     knows what to do next.
 *
 * CHAMPION and COMPLETIONIST are auto-awarded — they don't go through
 * KOSTAS. They're filtered out of the iteration order below.
 */
export type KostasPriority =
  | { kind: "award"; badgeId: string; badgeName: string }
  | { kind: "hint"; nextBadgeId: string; nextBadgeName: string; nextHint: string }
  | { kind: "champion" };

export function resolveKostasPriority(save: GameSave): KostasPriority {
  // KOSTAS only awards non-auto badges.
  const kostasBadges = BADGES.filter((b) => !b.auto);

  // If all KOSTAS badges AND the champion badge are earned, play the
  // final "you're a true champion" line.
  const allKostasEarned = kostasBadges.every((b) =>
    save.badges.includes(b.id),
  );
  if (allKostasEarned && save.badges.includes("champion")) {
    return { kind: "champion" };
  }

  // Priority scan: first KOSTAS badge whose condition is met but not
  // yet earned. Priorities 1..6 in the order above (same as BADGES
  // array order, with auto badges filtered out).
  for (const badge of kostasBadges) {
    if (save.badges.includes(badge.id)) continue;
    if (badge.condition(save)) {
      return { kind: "award", badgeId: badge.id, badgeName: badge.name };
    }
  }

  // Priority 7 — fallback hint. Find the first KOSTAS badge the
  // player hasn't earned yet and use its `hint` copy.
  const nextBadge = kostasBadges.find((b) => !save.badges.includes(b.id));
  if (nextBadge) {
    return {
      kind: "hint",
      nextBadgeId: nextBadge.id,
      nextBadgeName: nextBadge.name,
      nextHint: nextBadge.hint,
    };
  }

  // All KOSTAS badges earned but champion not yet → treat as hint
  // for CHAMPION.
  return {
    kind: "hint",
    nextBadgeId: "champion",
    nextBadgeName: "CHAMPION",
    nextHint: "Find MEW beyond the water boundary",
  };
}

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
  /**
   * If true, interacting with this NPC opens the Pokemart TM shop
   * instead of showing dialog. Steps are the shop currency.
   */
  shopMenu?: boolean;
  /**
   * Gym-trainer "auto-gift" flow. When set, the first interaction
   * plays the trainer's dialog, then automatically gives the named
   * item (looked up in ITEM_DEFINITIONS) and walks the NPC to the
   * aside position so they clear the path. Persisted via TrainerStore
   * so the NPC spawns at the aside position on future scene loads.
   *
   * After clearing, subsequent interactions show `clearedDialog`
   * (with a generic fallback if omitted).
   */
  autoGive?: {
    /** Item id from ITEM_DEFINITIONS (e.g. "paper_multiscale_igarss"). */
    itemId: string;
    /** Tile the NPC walks to after giving the item. */
    asidePosition: { x: number; y: number };
    /** Dialog shown on 2nd+ interactions. Falls back to a generic line. */
    clearedDialog?: string[];
  };
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
    // The counter-edge tile (0, 4) is the questionnaire marker —
    // interacting with it opens the letter from KOSTAS. No custom
    // icon sprite; the trigger is the tile itself.
    questionnaireTiles: [
      {
        x: 0,
        y: 4,
        id: "mart_letter",
      },
    ],
    npcs: [
      {
        id: "mart_clerk",
        spriteKey: "school_kid_m",
        position: { x: 1, y: 3 },
        facingDirection: "right",
        speakerName: "CLERK",
        shopMenu: true,
        dialog: [
          "Welcome to the POKeMART!",
          "How may I help you?",
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
          const priority = resolveKostasPriority(save);

          if (priority.kind === "champion") {
            // Priority 0 (endgame): all 8 badges earned
            return {
              lines: [
                "Wahahahaha! You've collected",
                "all 8 badges! You're a true",
                "CHAMPION of ML Engineering!",
              ],
            };
          }

          if (priority.kind === "hint") {
            // Priority 7 (fallback): no badge condition met yet
            return {
              lines: [
                `Not yet, TRAINER.`,
                `Try to ${priority.nextHint}`,
                `then come see me!`,
              ],
            };
          }

          // Priorities 1..6: award the eligible badge
          const { badgeId, badgeName } = priority;
          return {
            lines: [
              `You've been working hard!`,
              `Take the ${badgeName} BADGE`,
              `as proof of your skills!`,
            ],
            afterDialog: async ({ dialogSystem }) => {
              // Pick jingle by badge identity:
              //  - CHAMPION       → battle-symbol fanfare
              //  - ENGINEER (last KOSTAS badge) → final gym variant
              //  - otherwise                    → standard badge jingle
              const jinglePromise =
                badgeId === "champion"
                  ? sfx.badgeChampionAsync()
                  : badgeId === "engineer"
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
                    `the ${badgeName} BADGE!`,
                  ],
                }),
              ]);
              awardBadge(badgeId);
              // Field-move side effect: if a FIELD_MOVE_AWARDS
              // entry maps this badge to a party member, teach
              // the move. Content phase surfaces `learnMessage`
              // as a follow-up dialog line; the engine only
              // mutates save state here.
              const fieldAward = FIELD_MOVE_AWARDS.find(
                (f) => f.badgeId === badgeId,
              );
              if (fieldAward) {
                teachFieldMove(fieldAward.pokemonId, fieldAward.moveName);
              }
            },
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
          "Here, take MEDiC — his CLIP",
          "distillation paper for medical AI!",
        ],
        autoGive: {
          itemId: "paper_medic",
          asidePosition: { x: 8, y: 8 },
          clearedDialog: [
            "Good luck with the rest",
            "of the GYM!",
          ],
        },
      },
      {
        id: "gym_vivian",
        spriteKey: "woman_4",
        position: { x: 1, y: 16 },
        facingDirection: "up",
        speakerName: "TRAINER VIVIAN",
        dialog: [
          "Data Science is my specialty!",
          "KOSTAS teaches machines to see",
          "with computer vision.",
          "His remote sensing paper at",
          "IGARSS is a must-read!",
        ],
        autoGive: {
          itemId: "paper_multiscale_igarss",
          asidePosition: { x: 0, y: 16 },
          clearedDialog: [
            "Remote sensing is the future",
            "of Earth observation!",
          ],
        },
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
          "This very portfolio is built",
          "with Astro + Phaser!",
          "Check out his WACV vision paper!",
        ],
        autoGive: {
          itemId: "paper_semseg_wacv",
          asidePosition: { x: 5, y: 11 },
          clearedDialog: [
            "Vision models are everywhere",
            "these days!",
          ],
        },
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
          "KOSTAS deploys models at scale",
          "for Amazon!",
          "His CHASE paper applies ML",
          "to healthcare at scale.",
        ],
        autoGive: {
          itemId: "paper_dementia_chase",
          asidePosition: { x: 0, y: 13 },
          clearedDialog: [
            "Cloud infrastructure powers",
            "modern ML at scale!",
          ],
        },
      },
    ],
  },
};
