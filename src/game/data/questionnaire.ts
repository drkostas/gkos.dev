/**
 * Questionnaire config — questions, answers, and reward.
 *
 * Source of truth for the "letter on the desk" questionnaire puzzle.
 * Edit this file to change the questions the player must answer or
 * the item they receive on completion.
 *
 * Adding/removing questions automatically updates every part of the
 * UI (slot table, footer, labels) because the interface reads from
 * `QUESTIONS.length`.
 */

export interface QuestionnaireQuestion {
  /** Human-readable prompt shown in the footer list. */
  label: string;
  /**
   * Canonical answer — its length determines the number of character
   * slots shown. Typing is limited to that many letters, so the
   * player can only enter a word that fits.
   */
  canonical: string;
  /**
   * Additional accepted answers (case-insensitive exact match).
   * The canonical is automatically accepted too.
   */
  accept?: string[];
}

/** Ordered list of questions. Displayed 1..N in the footer. */
export const QUESTIONS: QuestionnaireQuestion[] = [
  {
    label: "Name of my most starred repo",
    canonical: "README",
  },
  {
    label: "Name of my most recent paper",
    canonical: "MEDIC",
  },
  {
    label: "Month of my first blog post",
    canonical: "APRIL",
  },
  {
    label: "Framework I use for ML",
    canonical: "PYTORCH",
    accept: ["TORCH"],
  },
];

/**
 * Item id awarded on a fully correct submission. Must match a key in
 * `ITEM_DEFINITIONS` (src/game/data/itemDefinitions.ts). The pocket
 * is inferred from the item definition, so changing this to a TM,
 * paper, blog, or key item all work the same.
 */
export const QUESTIONNAIRE_REWARD_ITEM_ID = "tm_portfolio";
