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
      type: Phaser.CANVAS,
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

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Send entities to Phaser when loaded or when viewport becomes ready
  useEffect(() => {
    if (state.entities.length === 0) return;

    const sendEntities = () => {
      emitEditorEvent(REFRESH_ENTITIES, { entities: state.entities });
    };

    // Send now (in case scene is already ready)
    sendEntities();

    // Also listen for viewport ready in case scene loads after entities
    const unsub = onEditorEvent(VIEWPORT_READY, sendEntities);
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
        if (detail?.entityId) {
          const entity = state.entities.find((e) => e.id === detail.entityId);
          if (entity) {
            dispatch({
              type: "MOVE_ENTITY",
              id: detail.entityId,
              x: detail.tileX,
              y: detail.tileY,
              oldX: entity.x,
              oldY: entity.y,
            });
          }
        }
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [state.entities]);

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
