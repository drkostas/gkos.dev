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

/** Content phase populates this array. */
export const FIELD_MOVE_AWARDS: FieldMoveAward[] = [];
