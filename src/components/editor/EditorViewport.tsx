import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { EditorScene } from "../../game/scenes/EditorScene";
import { useEditorState, useEditorDispatch } from "./state/EditorContext";
import {
  emitEditorEvent,
  onEditorEvent,
  ENTITY_CLICKED,
  ENTITY_HOVERED,
  TILE_CLICKED,
  MOUSE_MOVE,
  DRAG_END,
  VIEWPORT_READY,
  REFRESH_ENTITIES,
  SELECT_ENTITY,
  DESELECT,
  TOGGLE_LAYER,
  UPDATE_ENTITY_POSITION,
  REMOVE_ENTITY_MARKER,
} from "../../game/editor/EditorEvents";

export default function EditorViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const state = useEditorState();
  const dispatch = useEditorDispatch();

  // Mount Phaser game
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: "#0a0a1a",
      scene: [EditorScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: {
        mouse: {
          preventDefaultWheel: true,
        },
      },
      render: {
        antialias: false,
        pixelArt: true,
      },
    };

    gameRef.current = new Phaser.Game(config);
    (window as any).__EDITOR_GAME__ = gameRef.current;

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      entitiesSentRef.current = false;
    };
  }, []);

  // Send entities to Phaser when loaded or when viewport becomes ready
  const entitiesSentRef = useRef(false);
  useEffect(() => {
    if (state.entities.length === 0) return;

    const sendEntities = () => {
      entitiesSentRef.current = true;
      emitEditorEvent(REFRESH_ENTITIES, { entities: state.entities });
    };

    // Listen for viewport ready (scene may not exist yet)
    const unsub = onEditorEvent(VIEWPORT_READY, sendEntities);

    // If we already sent before (entity data changed), re-send now
    if (entitiesSentRef.current) {
      sendEntities();
    }

    return unsub;
  }, [state.entities]);

  // Sync selection state to Phaser
  useEffect(() => {
    if (state.selectedEntityId) {
      emitEditorEvent(SELECT_ENTITY, { entityId: state.selectedEntityId });
    } else {
      emitEditorEvent(DESELECT, {});
    }
  }, [state.selectedEntityId]);

  // Listen for Phaser events and dispatch to React state
  useEffect(() => {
    const unsubs = [
      onEditorEvent(ENTITY_CLICKED, (detail: any) => {
        if (detail?.entityId) {
          dispatch({ type: "SELECT_ENTITY", id: detail.entityId });
        } else {
          dispatch({ type: "DESELECT" });
        }
      }),
      onEditorEvent(DRAG_END, (detail: any) => {
        if (!detail?.entityId) return;
        const entity = state.entities.find((e) => e.id === detail.entityId);
        if (!entity) return;
        // Skip if the pointer never left the starting tile — the click
        // was a plain select, not a drag. Otherwise we'd push a no-op
        // MOVE_ENTITY onto the undo stack every time the user selects.
        if (entity.x === detail.tileX && entity.y === detail.tileY) return;
        dispatch({
          type: "MOVE_ENTITY",
          id: detail.entityId,
          x: detail.tileX,
          y: detail.tileY,
          oldX: entity.x,
          oldY: entity.y,
        });
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [state.entities]);

  // Modifier-aware cursor feedback. The unified Edit mode relies on
  // ⌘/⌥/⇧ to distinguish paint / erase / multi-select, so the cursor has
  // to show what the next click will actually do.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const findCanvas = () => container.querySelector("canvas");
    const update = (e: KeyboardEvent | MouseEvent) => {
      const c = findCanvas();
      if (!c) return;
      const meta = (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey;
      const alt = (e as MouseEvent).altKey;
      const shift = (e as MouseEvent).shiftKey;
      // CSS cursors map nicely to semantic actions. 'copy' shows a +
      // badge (paint), 'no-drop' shows the crossed circle (erase),
      // 'cell' is the selection crosshair (multi-select).
      if (meta) c.style.cursor = "copy";
      else if (alt) c.style.cursor = "no-drop";
      else if (shift) c.style.cursor = "cell";
      else c.style.cursor = "default";
    };
    const onKey = (e: KeyboardEvent) => update(e);
    const onMouse = (e: MouseEvent) => update(e);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("mousemove", onMouse);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        margin: 2,
        borderRadius: 3,
        border: "1px solid #333",
        minHeight: 0,
        zIndex: 1,
      }}
    />
  );
}
