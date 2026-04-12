import { useEffect } from "react";
import { EditorProvider, useEditorState, useEditorDispatch } from "./state/EditorContext";
import type { EditorEntity } from "./state/editorTypes";

/** Toolbar at the top */
function Toolbar() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const tools = [
    { id: "select" as const, icon: "⊹", label: "Select" },
    { id: "move" as const, icon: "✥", label: "Move" },
    { id: "stamp" as const, icon: "⊞", label: "Stamp" },
    { id: "eraser" as const, icon: "⌫", label: "Eraser" },
  ];

  const handleSave = async () => {
    try {
      await fetch("/api/editor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: [], dryRun: true }),
      });
      dispatch({ type: "MARK_CLEAN" });
    } catch (e) {
      console.error("Save failed:", e);
    }
  };

  const handleUndo = () => dispatch({ type: "UNDO" });
  const handleRedo = () => dispatch({ type: "REDO" });

  return (
    <div style={{ height: 38, background: "#2d2d44", display: "flex", alignItems: "center", padding: "0 10px", gap: 8, borderBottom: "1px solid #3a3a50", flexShrink: 0 }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: "#8b5cf6", letterSpacing: 0.5, marginRight: 8 }}>⚡ WORLD DESIGNER</span>
      {["File", "Edit", "View"].map((m) => (
        <span key={m} style={{ color: "#888", fontSize: 11, cursor: "pointer", padding: "3px 6px", borderRadius: 3 }}>{m}</span>
      ))}
      <div style={{ width: 1, height: 20, background: "#444", margin: "0 4px" }} />
      {tools.map((t) => (
        <div
          key={t.id}
          onClick={() => dispatch({ type: "SET_TOOL", tool: t.id })}
          title={t.label}
          style={{
            width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 4, cursor: "pointer", fontSize: 14,
            color: state.tool === t.id ? "#4a9eed" : "#888",
            background: state.tool === t.id ? "#1e3a5f" : "transparent",
          }}
        >
          {t.icon}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 4, fontSize: 9, color: "#555" }}>
        <span onClick={handleUndo} style={{ cursor: "pointer", background: "#1e1e2e", border: "1px solid #444", borderRadius: 2, padding: "1px 5px", fontFamily: "monospace" }}>⌘Z</span>
        <span onClick={handleRedo} style={{ cursor: "pointer", background: "#1e1e2e", border: "1px solid #444", borderRadius: 2, padding: "1px 5px", fontFamily: "monospace" }}>⌘Y</span>
        <span onClick={handleSave} style={{ cursor: "pointer", background: "#1e1e2e", border: "1px solid #444", borderRadius: 2, padding: "1px 5px", fontFamily: "monospace" }}>⌘S</span>
      </div>
    </div>
  );
}

/** Left panel — Asset Library placeholder */
function LeftPanel() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const entityTypes = ["npc", "pokemon-npc", "pickup", "wild-pokemon", "sign", "hidden-item", "warp", "gate"] as const;
  const typeColors: Record<string, string> = {
    npc: "#4a9eed", "pokemon-npc": "#4a9eed", pickup: "#ec4899",
    "wild-pokemon": "#22c55e", sign: "#f59e0b", "hidden-item": "#ec4899",
    warp: "#06b6d4", gate: "#ef4444",
  };

  return (
    <div style={{ width: 200, background: "#1e1e30", borderRight: "1px solid #2a2a40", overflowY: "auto", flexShrink: 0, padding: "8px 0" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#666", letterSpacing: 1.5, padding: "4px 8px", textTransform: "uppercase" }}>
        Entities ({state.entities.length})
      </div>
      {entityTypes.map((t) => {
        const count = state.entities.filter((e) => e.type === t).length;
        if (count === 0) return null;
        return (
          <div key={t} style={{ padding: "2px 8px", fontSize: 10 }}>
            <span style={{ color: typeColors[t] || "#888", marginRight: 4 }}>●</span>
            <span style={{ color: "#aaa" }}>{t} ({count})</span>
          </div>
        );
      })}
      <div style={{ height: 1, background: "#2a2a40", margin: "8px 8px" }} />
      <div style={{ fontSize: 9, fontWeight: 700, color: "#666", letterSpacing: 1.5, padding: "4px 8px", textTransform: "uppercase" }}>
        Entity List
      </div>
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {state.entities.slice(0, 40).map((e) => (
          <div
            key={e.id}
            onClick={() => dispatch({ type: "SELECT_ENTITY", id: e.id })}
            style={{
              padding: "3px 8px", fontSize: 10, cursor: "pointer",
              background: state.selectedEntityId === e.id ? "#1e3a5f" : "transparent",
              color: state.selectedEntityId === e.id ? "#e5e5e5" : "#999",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <span style={{ color: typeColors[e.type] || "#888" }}>●</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.id}</span>
          </div>
        ))}
        {state.entities.length > 40 && (
          <div style={{ padding: "4px 8px", fontSize: 9, color: "#555" }}>+ {state.entities.length - 40} more...</div>
        )}
      </div>
    </div>
  );
}

/** Center viewport — Canvas placeholder (Phaser will replace this later) */
function Viewport() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const typeColors: Record<string, string> = {
    npc: "#4a9eed", "pokemon-npc": "#4a9eed", pickup: "#ec4899",
    "wild-pokemon": "#22c55e", sign: "#f59e0b", "hidden-item": "#ec4899",
    warp: "#06b6d4", gate: "#ef4444",
  };

  return (
    <div style={{ flex: 1, background: "#1a2e1a", position: "relative", overflow: "hidden", margin: 2, borderRadius: 3, border: "1px solid #333" }}>
      <div style={{ position: "absolute", top: 6, left: 10, fontSize: 10, fontWeight: 600, color: "#22c55e", background: "rgba(0,0,0,0.7)", padding: "2px 8px", borderRadius: 3, zIndex: 5 }}>
        VIEWPORT — Mauville City ({state.entities.length} entities)
      </div>
      {/* Render entity dots on a 140x120 grid */}
      {state.layers.entities && state.entities.map((e) => {
        const left = (e.x / 140) * 100;
        const top = (e.y / 120) * 100;
        const size = state.selectedEntityId === e.id ? 10 : 7;
        const selected = state.selectedEntityId === e.id;
        return (
          <div
            key={e.id}
            onClick={(ev) => { ev.stopPropagation(); dispatch({ type: "SELECT_ENTITY", id: e.id }); }}
            title={`${e.id} (${e.x}, ${e.y})`}
            style={{
              position: "absolute",
              left: `${left}%`, top: `${top}%`,
              width: size, height: size,
              borderRadius: "50%",
              background: typeColors[e.type] || "#888",
              cursor: "pointer",
              boxShadow: selected ? "0 0 0 3px #fff" : "none",
              zIndex: selected ? 10 : 3,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
      {/* Click background to deselect */}
      <div
        style={{ position: "absolute", inset: 0, zIndex: 1 }}
        onClick={() => dispatch({ type: "DESELECT" })}
      />
    </div>
  );
}

/** Right panel — Properties inspector */
function RightPanel() {
  const state = useEditorState();
  const selected = state.entities.find((e) => e.id === state.selectedEntityId);

  if (!selected) {
    return (
      <div style={{ width: 300, background: "#1e1e30", borderLeft: "1px solid #2a2a40", padding: 12, color: "#555", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
        Click an entity to inspect
      </div>
    );
  }

  return (
    <div style={{ width: 300, background: "#1e1e30", borderLeft: "1px solid #2a2a40", overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, borderBottom: "1px solid #2a2a40", paddingBottom: 4 }}>{selected.id}</div>

      <div style={{ background: "#161628", borderRadius: 5, padding: "6px 8px" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#4a9eed", marginBottom: 4 }}>POSITION & MOVEMENT</div>
        <div style={{ fontSize: 11, color: "#ccc", lineHeight: 1.8 }}>
          <div>Type: <span style={{ color: "#8b5cf6" }}>{selected.type}</span></div>
          <div>Position: <b>{selected.x}</b>, <b>{selected.y}</b></div>
          {selected.facingDirection && <div>Facing: {selected.facingDirection}</div>}
          {selected.movementBehavior && <div>Movement: <span style={{ color: "#22c55e" }}>{selected.movementBehavior}</span></div>}
          {selected.spriteKey && <div>Sprite: {selected.spriteKey}</div>}
        </div>
      </div>

      {selected.dialog && selected.dialog.length > 0 && (
        <div style={{ background: "#161628", borderRadius: 5, padding: "6px 8px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#4a9eed", marginBottom: 4 }}>DIALOG ({selected.dialog.length} lines)</div>
          {selected.dialog.map((line, i) => (
            <div key={i} style={{ fontSize: 10, color: "#bbb", padding: "1px 0", fontFamily: "monospace" }}>"{line}"</div>
          ))}
        </div>
      )}

      {selected.text && selected.text.length > 0 && (
        <div style={{ background: "#161628", borderRadius: 5, padding: "6px 8px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>SIGN TEXT</div>
          {selected.text.map((line, i) => (
            <div key={i} style={{ fontSize: 10, color: "#bbb", padding: "1px 0" }}>"{line}"</div>
          ))}
        </div>
      )}

      {selected.autoGive && (
        <div style={{ background: "#161628", borderRadius: 5, padding: "6px 8px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#4a9eed", marginBottom: 4 }}>AUTO-GIVE</div>
          <div style={{ fontSize: 10, color: "#ccc" }}>Item: {selected.autoGive.itemId}</div>
          {selected.autoGive.asideX != null && <div style={{ fontSize: 10, color: "#ccc" }}>Aside: ({selected.autoGive.asideX}, {selected.autoGive.asideY})</div>}
        </div>
      )}

      {selected.pokemon && (
        <div style={{ background: "#161628", borderRadius: 5, padding: "6px 8px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#22c55e", marginBottom: 4 }}>POKEMON</div>
          <div style={{ fontSize: 10, color: "#ccc" }}>Dex #{selected.pokemon.pokedexNumber} — {selected.pokemon.speciesName}</div>
          <div style={{ fontSize: 10, color: "#888" }}>{selected.pokemon.projectName}</div>
        </div>
      )}

      {selected.hasDialogFn && (
        <div style={{ background: "#2a1a1a", borderRadius: 5, padding: "4px 8px", fontSize: 9, color: "#f59e0b" }}>
          ⚠ Has dynamic dialogFn — edit in source code
        </div>
      )}
    </div>
  );
}

/** Bottom panel — Problems */
function BottomPanel() {
  const state = useEditorState();
  return (
    <div style={{ height: 120, background: "#1e1e30", borderTop: "1px solid #2a2a40", flexShrink: 0, padding: "4px 10px", overflowY: "auto" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>PROBLEMS</div>
      <div style={{ fontSize: 10, color: "#22c55e" }}>✓ Loaded {state.entities.length} entities from editor-data.json</div>
      <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Validation panel coming in Phase 1E...</div>
    </div>
  );
}

/** Status bar */
function StatusBar() {
  const state = useEditorState();
  const selected = state.entities.find((e) => e.id === state.selectedEntityId);
  return (
    <div style={{ height: 22, background: "#2d2d44", display: "flex", alignItems: "center", padding: "0 10px", fontSize: 9, color: "#666", borderTop: "1px solid #3a3a50", flexShrink: 0, gap: 4 }}>
      <span>Mauville City</span>
      <span style={{ width: 1, height: 10, background: "#444", margin: "0 4px" }} />
      {selected ? <span>Tile ({selected.x}, {selected.y})</span> : <span>No selection</span>}
      <span style={{ width: 1, height: 10, background: "#444", margin: "0 4px" }} />
      <span>{state.entities.filter((e) => e.type === "npc" || e.type === "pokemon-npc" || e.type === "pickup").length} NPCs</span>
      <span>{state.entities.filter((e) => e.type === "wild-pokemon").length} Pokemon</span>
      <span>{state.entities.filter((e) => e.type === "sign").length} Signs</span>
      <span style={{ width: 1, height: 10, background: "#444", margin: "0 4px" }} />
      <span style={{ color: state.dirty ? "#f59e0b" : "#22c55e" }}>{state.dirty ? "● Unsaved" : "● Saved"}</span>
      <span style={{ marginLeft: "auto" }}>Undo: {state.undoStack.length} | Redo: {state.redoStack.length}</span>
    </div>
  );
}

/** Inner app with context */
function EditorInner() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();

  // Load data on mount
  useEffect(() => {
    fetch("/api/editor/data")
      .then((r) => r.json())
      .then((data) => {
        if (data.entities) {
          dispatch({ type: "LOAD_DATA", entities: data.entities });
        } else {
          dispatch({ type: "SET_ERROR", error: data.error || "No entities in response" });
        }
      })
      .catch((e) => dispatch({ type: "SET_ERROR", error: e.message }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); dispatch({ type: "UNDO" }); }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); dispatch({ type: "REDO" }); }
      if (e.key === "Escape") dispatch({ type: "DESELECT" });
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedEntityId) {
          const entity = state.entities.find((e) => e.id === state.selectedEntityId);
          if (entity) dispatch({ type: "DELETE_ENTITY", id: entity.id, entity });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.selectedEntityId, state.entities]);

  if (state.loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12, fontSize: 14, color: "#888" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #333", borderTopColor: "#8b5cf6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span>Loading editor data...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12, color: "#ef4444" }}>
        <div style={{ fontSize: 32 }}>:(</div>
        <div style={{ fontSize: 14 }}>Failed to load editor data</div>
        <div style={{ fontSize: 11, color: "#888", maxWidth: 400, textAlign: "center" }}>{state.error}</div>
        <div style={{ fontSize: 11, color: "#888" }}>Run: node scripts/editor-data-export.mjs</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Toolbar />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <LeftPanel />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Viewport />
          <BottomPanel />
        </div>
        <RightPanel />
      </div>
      <StatusBar />
    </div>
  );
}

/** Top-level export — wraps with provider */
export default function EditorApp() {
  return (
    <EditorProvider>
      <EditorInner />
    </EditorProvider>
  );
}
