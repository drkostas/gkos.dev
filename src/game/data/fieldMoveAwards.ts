/**
 * Field move awards — which badge unlocks which field move on which
 * party Pokemon. Consumed by KOSTAS's `dialogFn` in `interiors.ts`
 * after a successful `awardBadge()` call.
 *
 * `learnMessage` is DATA for content-phase dialog writing. The
 * engine does NOT auto-show it as a notification — that would fire
 * on top of KOSTAS's dialog. The dialog-writer is responsible for
 * surfacing it as a follow-up dialog line inside the same
 * conversation.
 *
 * This file stays empty during engine phase and is populated during
 * content phase once badges, field moves, and gate locations are
 * finalized.
 */

export interface FieldMoveAward {
  /** Badge id that triggers teaching this move. */
  badgeId: string;
  /** Party member id that learns the move (see `ALL_PARTY`). */
  pokemonId: string;
  /** Field move name — plain string, matched by gate `requiredMove`. */
  moveName: string;
  /** Flavor message, e.g. `"Your KYOGRE learned FORCE PUSH!"`. */
  learnMessage: string;
}

/**
 * Content phase entries. Per the comprehensive plan's Decision
 * Ledger §5: POKEDEX badge teaches FleetSmart (party member
 * `fleetsmart`, species Kyogre) a custom field move "FORCE PUSH"
 * that clears the Snorlax NPC gate; PUBLICATION badge teaches
 * MaskDistill (party member `maskdistill`, species Absol) "CUT"
 * which clears the tinted-tree terrain gate on Route 111.
 *
 * FIELD_MOVE_AWARDS entries trigger inside KOSTAS's `afterDialog`
 * side effect — see `interiors.ts` → `gym_kostas.dialogFn` where
 * `teachFieldMove(pokemonId, moveName)` mutates `save.fieldMoves`.
 * Gate matching is exact: the same string appears in both places.
 */
export const FIELD_MOVE_AWARDS: FieldMoveAward[] = [
  {
    badgeId: "pokedex",
    pokemonId: "fleetsmart",
    moveName: "FORCE PUSH",
    learnMessage: "FleetSmart learned FORCE PUSH!",
  },
  {
    badgeId: "publication",
    pokemonId: "maskdistill",
    moveName: "CUT",
    learnMessage: "MaskDistill learned CUT!",
  },
];
