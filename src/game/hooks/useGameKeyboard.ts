/**
 * useGameKeyboard — attaches a keydown listener on `window` while
 * `active` is true, dispatches to logical game buttons, and cleans
 * up on unmount or when `active` flips to false.
 *
 * ## Usage
 *
 * ```tsx
 * useGameKeyboard(visible, {
 *   confirm: () => { sfx.confirm(); doThing(); },
 *   cancel: onClose,
 *   up: () => setSel((i) => i - 1),
 *   down: () => setSel((i) => i + 1),
 * });
 * ```
 *
 * ## Stable references
 *
 * The `handlers` object is a dependency of the underlying effect.
 * Passing a fresh literal on every render (as shown above) is fine
 * for simple components — React re-attaches the listener each
 * render, but that's cheap and correct.
 *
 * Components that need `useCallback`-stable references to avoid
 * cycling listeners on every keypress are free to pass memoized
 * handlers — the hook doesn't care either way.
 *
 * Components that need latest-state inside a callback without
 * re-registering the listener should use refs (the same pattern
 * they already use today). This hook handles the
 * `addEventListener` / `removeEventListener` plumbing; it doesn't
 * take a position on stale-closure handling.
 *
 * ## preventDefault behavior
 *
 * The hook calls `e.preventDefault()` on any key that matches one
 * of the logical buttons AND has a handler attached. Keys with no
 * handler attached are not prevented. `other` receives unmatched
 * keys so callers can still handle keys like printable characters
 * (QuestionnaireInterface does this) without conflicting with the
 * logical-button dispatch.
 */

import { useEffect } from "react";
import {
  isCancelKey,
  isConfirmKey,
  isDownKey,
  isLeftKey,
  isMenuKey,
  isRightKey,
  isUpKey,
} from "@/game/utils/inputKeys";

export interface GameKeyHandlers {
  confirm?: () => void;
  cancel?: () => void;
  up?: () => void;
  down?: () => void;
  left?: () => void;
  right?: () => void;
  menu?: () => void;
  /** Catch-all for keys not matched above. Receives the raw event. */
  other?: (e: KeyboardEvent) => void;
}

export function useGameKeyboard(
  active: boolean,
  handlers: GameKeyHandlers,
): void {
  useEffect(() => {
    if (!active) return;
    const listener = (e: KeyboardEvent) => {
      if (isConfirmKey(e.key) && handlers.confirm) {
        e.preventDefault();
        handlers.confirm();
        return;
      }
      if (isCancelKey(e.key) && handlers.cancel) {
        e.preventDefault();
        handlers.cancel();
        return;
      }
      if (isUpKey(e.key) && handlers.up) {
        e.preventDefault();
        handlers.up();
        return;
      }
      if (isDownKey(e.key) && handlers.down) {
        e.preventDefault();
        handlers.down();
        return;
      }
      if (isLeftKey(e.key) && handlers.left) {
        e.preventDefault();
        handlers.left();
        return;
      }
      if (isRightKey(e.key) && handlers.right) {
        e.preventDefault();
        handlers.right();
        return;
      }
      if (isMenuKey(e.key) && handlers.menu) {
        e.preventDefault();
        handlers.menu();
        return;
      }
      handlers.other?.(e);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [active, handlers]);
}
