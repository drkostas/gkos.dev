/**
 * useMenuNavigation — wrapping cursor state for single-axis menus.
 *
 * Most game menus share the same up/down wrap pattern:
 *
 *   setIndex((i) => (i <= 0 ? N - 1 : i - 1));       // up
 *   setIndex((i) => (i >= N - 1 ? 0 : i + 1));       // down
 *
 * This hook packages that so components can write:
 *
 *   const { index, moveUp, moveDown } = useMenuNavigation(items.length);
 *
 * and wire the two callbacks straight into `useGameKeyboard({ up, down })`.
 *
 * ## Bounds
 *
 * `itemCount` is read on every call to `moveUp`/`moveDown` via the
 * captured closure — pass the current count from render and it
 * stays in sync when the menu grows/shrinks. If the count drops
 * below the current index, render will still show `index`; call
 * `setIndex(0)` yourself on phase/state transitions that invalidate
 * the current cursor (matches the pattern already used in PCInterface,
 * MartShopInterface, etc).
 *
 * ## Not a fit for
 *
 * - Clamping menus (no wrap) — `PokedexList` uses `Math.min/max`
 *   because it ties into scroll offset tracking.
 * - Grid layouts — this hook is 1-axis only.
 * - Phase-dependent cursors where the bound differs per phase —
 *   you can still use it, just call `setIndex(0)` on phase change,
 *   but several of our components manage two cursors (row + confirm
 *   yes/no) and a single hook instance doesn't buy much there.
 */

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

export interface UseMenuNavigationReturn {
  /** Current cursor position. */
  index: number;
  /** Jump to an arbitrary index. Accepts the functional updater form too. */
  setIndex: Dispatch<SetStateAction<number>>;
  /** Move up one slot, wrapping to the bottom. */
  moveUp: () => void;
  /** Move down one slot, wrapping to the top. */
  moveDown: () => void;
}

export function useMenuNavigation(
  itemCount: number,
  initialIndex: number = 0,
): UseMenuNavigationReturn {
  const [index, setIndex] = useState(initialIndex);
  const moveUp = useCallback(
    () => setIndex((i) => (i <= 0 ? itemCount - 1 : i - 1)),
    [itemCount],
  );
  const moveDown = useCallback(
    () => setIndex((i) => (i >= itemCount - 1 ? 0 : i + 1)),
    [itemCount],
  );
  return { index, setIndex, moveUp, moveDown };
}
