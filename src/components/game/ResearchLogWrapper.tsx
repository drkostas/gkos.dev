import { useEffect, useRef, useState } from "react";
import { GameEvents, onGameEvent, emitGameEvent } from "@/game/EventBridge";
import ResearchLogViewer from "./ResearchLogViewer";

/**
 * Event-driven wrapper that shows/hides the ResearchLogViewer.
 * Mounted permanently in PhaserGame; becomes visible when
 * SHOW_RESEARCH_LOG fires (from the Bag's USE action).
 *
 * Also listens for MENU_CLOSE so that when the player presses
 * Escape, the Phaser scene's Start-button handler (which emits
 * MENU_CLOSE to tear down the whole menu tree, including the Bag)
 * also dismisses the Research Log in the same tick. Without this,
 * the bag would close underneath the log and leave it orphaned
 * on screen.
 */
export default function ResearchLogWrapper() {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    const unsubShow = onGameEvent(GameEvents.SHOW_RESEARCH_LOG, () => {
      setVisible(true);
    });
    // Cascade: any top-level menu close also closes the log.
    const unsubMenuClose = onGameEvent(GameEvents.MENU_CLOSE, () => {
      if (visibleRef.current) {
        setVisible(false);
        emitGameEvent(GameEvents.RESEARCH_LOG_CLOSE);
      }
    });
    return () => {
      unsubShow();
      unsubMenuClose();
    };
  }, []);

  if (!visible) return null;

  return (
    <ResearchLogViewer
      onClose={() => {
        setVisible(false);
        emitGameEvent(GameEvents.RESEARCH_LOG_CLOSE);
      }}
    />
  );
}
