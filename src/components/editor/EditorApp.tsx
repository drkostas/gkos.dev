import { useEffect, useState } from "react";
import { EditorProvider, useEditorState, useEditorDispatch } from "./state/EditorContext";
import type { EditorEntity } from "./state/editorTypes";
import EditorViewport from "./EditorViewport";
import { emitEditorEvent, TOGGLE_LAYER as TOGGLE_LAYER_EVENT, JUMP_TO_TILE } from "../../game/editor/EditorEvents";

/** Dropdown menu item */
function MenuItem({ label, shortcut, onClick, disabled }: { label: string; shortcut?: string; onClick?: () => void; disabled?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "4px 24px 4px 8px", fontSize: 11, cursor: disabled ? "default" : "pointer",
        color: disabled ? "#555" : hovered ? "#fff" : "#ccc",
        background: hovered && !disabled ? "#3a3a5a" : "transparent",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
        whiteSpace: "nowrap",
      }}
    >
      <span>{label}</span>
      {shortcut && <span style={{ color: "#666", fontSize: 9, fontFamily: "monospace" }}>{shortcut}</span>}
    </div>
  );
}

/** Menu separator */
function MenuSep() {
  return <div style={{ height: 1, background: "#3a3a50", margin: "3px 0" }} />;
}

/** Toolbar at the top */
function Toolbar() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  const tools = [
    { id: "select" as const, icon: "⊹", label: "Select", desc: "Click to select entities" },
    { id: "move" as const, icon: "✥", label: "Move", desc: "Drag entities to reposition" },
    { id: "stamp" as const, icon: "⊞", label: "Stamp", desc: "Place new entities from library" },
    { id: "eraser" as const, icon: "⌫", label: "Eraser", desc: "Remove entities from map" },
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

  const toggleLayer = (layer: string) => {
    const newVisible = !state.layers[layer as keyof typeof state.layers];
    dispatch({ type: "TOGGLE_LAYER", layer: layer as any });
    emitEditorEvent(TOGGLE_LAYER_EVENT, { layer, visible: newVisible });
  };

  const menus: Record<string, React.ReactNode> = {
    File: (
      <>
        <MenuItem label="Save" shortcut="⌘S" onClick={handleSave} />
        <MenuItem label="Export JSON..." onClick={() => {
          const blob = new Blob([JSON.stringify(state.entities, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = "editor-entities.json"; a.click();
          URL.revokeObjectURL(url);
        }} />
        <MenuSep />
        <MenuItem label="Regenerate Data" onClick={async () => {
          const r = await fetch("/api/editor/analyze", { method: "POST" });
          const data = await r.json();
          console.log("Analysis:", data);
        }} />
      </>
    ),
    Edit: (
      <>
        <MenuItem label="Undo" shortcut="⌘Z" onClick={handleUndo} disabled={state.undoStack.length === 0} />
        <MenuItem label="Redo" shortcut="⌘Y" onClick={handleRedo} disabled={state.redoStack.length === 0} />
        <MenuSep />
        <MenuItem label="Deselect All" shortcut="Esc" onClick={() => dispatch({ type: "DESELECT" })} />
        <MenuItem label="Delete Selected" shortcut="Del" disabled={!state.selectedEntityId} onClick={() => {
          if (state.selectedEntityId) {
            const e = state.entities.find((x) => x.id === state.selectedEntityId);
            if (e) dispatch({ type: "DELETE_ENTITY", id: e.id, entity: e });
          }
        }} />
      </>
    ),
    View: (
      <>
        <MenuItem label={`${state.layers.grid ? "✓ " : "  "}Grid`} onClick={() => toggleLayer("grid")} />
        <MenuItem label={`${state.layers.collision ? "✓ " : "  "}Collision Overlay`} onClick={() => toggleLayer("collision")} />
        <MenuItem label={`${state.layers.foreground ? "✓ " : "  "}Foreground`} onClick={() => toggleLayer("foreground")} />
        <MenuItem label={`${state.layers.entities ? "✓ " : "  "}Entity Markers`} onClick={() => toggleLayer("entities")} />
        <MenuItem label={`${state.layers.zones ? "✓ " : "  "}Zone Boundaries`} onClick={() => toggleLayer("zones")} />
        <MenuSep />
        <MenuItem label="Zoom In" shortcut="Scroll ↑" disabled />
        <MenuItem label="Zoom Out" shortcut="Scroll ↓" disabled />
        <MenuItem label="Reset View" onClick={() => {
          emitEditorEvent(JUMP_TO_TILE, { x: 70, y: 60 });
        }} />
      </>
    ),
  };

  return (
    <div style={{ height: 38, background: "#2d2d44", display: "flex", alignItems: "center", padding: "0 10px", gap: 8, borderBottom: "1px solid #3a3a50", flexShrink: 0, position: "relative", zIndex: 100 }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: "#8b5cf6", letterSpacing: 0.5, marginRight: 8 }}>⚡ WORLD DESIGNER</span>
      {Object.keys(menus).map((m) => (
        <div key={m} style={{ position: "relative" }}>
          <span
            onClick={() => setOpenMenu(openMenu === m ? null : m)}
            onMouseEnter={() => openMenu && setOpenMenu(m)}
            style={{
              color: openMenu === m ? "#fff" : "#888", fontSize: 11, cursor: "pointer",
              padding: "3px 6px", borderRadius: 3,
              background: openMenu === m ? "#3a3a5a" : "transparent",
            }}
          >{m}</span>
          {openMenu === m && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setOpenMenu(null)} />
              <div style={{
                position: "absolute", top: "100%", left: 0, marginTop: 2, zIndex: 9999,
                background: "#1a1a30", border: "1px solid #4a4a6a", borderRadius: 4,
                padding: "4px 0", minWidth: 180, boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
              }}>
                {menus[m]}
              </div>
            </>
          )}
        </div>
      ))}
      <div style={{ width: 1, height: 20, background: "#444", margin: "0 4px" }} />
      {tools.map((t) => (
        <div
          key={t.id}
          onClick={() => dispatch({ type: "SET_TOOL", tool: t.id })}
          onMouseEnter={() => setHoveredTool(t.id)}
          onMouseLeave={() => setHoveredTool(null)}
          title={`${t.label}: ${t.desc}`}
          style={{
            width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 4, cursor: "pointer", fontSize: 14, position: "relative",
            color: state.tool === t.id ? "#4a9eed" : hoveredTool === t.id ? "#ccc" : "#888",
            background: state.tool === t.id ? "#1e3a5f" : hoveredTool === t.id ? "#2a2a40" : "transparent",
          }}
        >
          {t.icon}
          {hoveredTool === t.id && (
            <div style={{
              position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
              marginTop: 6, background: "#1a1a2e", border: "1px solid #3a3a50", borderRadius: 4,
              padding: "4px 8px", fontSize: 9, color: "#ccc", whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)", pointerEvents: "none", zIndex: 50,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 1 }}>{t.label}</div>
              <div style={{ color: "#888" }}>{t.desc}</div>
            </div>
          )}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 4, fontSize: 9, color: "#555" }}>
        <span onClick={handleUndo} title="Undo (⌘Z)" style={{ cursor: "pointer", background: "#1e1e2e", border: "1px solid #444", borderRadius: 2, padding: "1px 5px", fontFamily: "monospace" }}>⌘Z</span>
        <span onClick={handleRedo} title="Redo (⌘Y)" style={{ cursor: "pointer", background: "#1e1e2e", border: "1px solid #444", borderRadius: 2, padding: "1px 5px", fontFamily: "monospace" }}>⌘Y</span>
        <span onClick={handleSave} title="Save (⌘S)" style={{ cursor: "pointer", background: "#1e1e2e", border: "1px solid #444", borderRadius: 2, padding: "1px 5px", fontFamily: "monospace" }}>⌘S</span>
      </div>
    </div>
  );
}

/** Left panel — Entity list with type filtering */
function LeftPanel() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const [filterType, setFilterType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const entityTypes = ["npc", "pokemon-npc", "pickup", "wild-pokemon", "sign", "hidden-item", "warp", "gate"] as const;
  const typeColors: Record<string, string> = {
    npc: "#3b82f6", "pokemon-npc": "#06b6d4", pickup: "#f97316",
    "wild-pokemon": "#22c55e", sign: "#f59e0b", "hidden-item": "#ec4899",
    warp: "#8b5cf6", gate: "#dc2626",
  };

  const filtered = state.entities.filter((e) => {
    if (filterType && e.type !== filterType) return false;
    if (searchQuery && !e.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ width: 200, background: "#1e1e30", borderRight: "1px solid #2a2a40", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "8px 8px 4px", flexShrink: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#666", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
          Entities ({state.entities.length})
        </div>
        <input
          type="text"
          placeholder="Search entities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%", background: "#161628", border: "1px solid #2a2a40", borderRadius: 3,
            color: "#ccc", fontSize: 10, padding: "3px 6px", outline: "none", marginBottom: 6, boxSizing: "border-box",
          }}
        />
        {entityTypes.map((t) => {
          const count = state.entities.filter((e) => e.type === t).length;
          if (count === 0) return null;
          const active = filterType === t;
          return (
            <div
              key={t}
              onClick={() => setFilterType(active ? null : t)}
              style={{
                padding: "2px 8px", fontSize: 10, cursor: "pointer",
                background: active ? "#1e3a5f" : "transparent", borderRadius: 2,
              }}
            >
              <span style={{ color: typeColors[t] || "#888", marginRight: 4 }}>●</span>
              <span style={{ color: active ? "#fff" : "#aaa" }}>{t} ({count})</span>
            </div>
          );
        })}
      </div>
      <div style={{ height: 1, background: "#2a2a40", margin: "4px 8px", flexShrink: 0 }} />
      <div style={{ fontSize: 9, fontWeight: 700, color: "#666", letterSpacing: 1.5, padding: "4px 8px", textTransform: "uppercase", flexShrink: 0 }}>
        {filterType ? `${filterType} (${filtered.length})` : `All (${filtered.length})`}
      </div>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {filtered.map((e) => (
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
      </div>
    </div>
  );
}

/** Center viewport — Phaser tilemap */
function Viewport() {
  return <EditorViewport />;
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
