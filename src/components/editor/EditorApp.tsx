import { useEffect, useRef, useState } from "react";
import { EditorProvider, useEditorState, useEditorDispatch } from "./state/EditorContext";
import type { EditorEntity } from "./state/editorTypes";
import EditorViewport from "./EditorViewport";
import { emitEditorEvent, onEditorEvent, TOGGLE_LAYER as TOGGLE_LAYER_EVENT, JUMP_TO_TILE, SWITCH_MAP, VIEWPORT_READY } from "../../game/editor/EditorEvents";
import { POKEMON_SPECIES, type PokemonSpecies } from "../../game/data/pokemonSpecies";

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

/** Section header inside a dropdown — non-interactive, small caps. */
function MenuHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "4px 8px 2px",
      fontSize: 9,
      color: "#6a8fbf",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      fontWeight: 700,
    }}>{children}</div>
  );
}

/** Toolbar at the top */
function Toolbar() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [saveDiffChanges, setSaveDiffChanges] = useState<any[] | null>(null);

  // Tool toolbar removed — the editor has a single unified "Edit" mode and
  // every action is driven by modifiers (Cmd paint, Alt erase, Shift multi-
  // select/block, etc.). See the Edit menu for the full shortcut list.

  const collectChanges = () => {
    // Collect changes from undo stack, deduplicating to keep only LATEST per entity+field
    const changeMap = new Map<string, { entityId: string; field: string; oldValue: any; newValue: any }>();
    for (const u of state.undoStack) {
      const a = u.action;
      if (a.type === "MOVE_ENTITY") {
        changeMap.set(`${a.id}:x`, { entityId: a.id, field: "x", oldValue: a.oldX, newValue: a.x });
        changeMap.set(`${a.id}:y`, { entityId: a.id, field: "y", oldValue: a.oldY, newValue: a.y });
      } else if (a.type === "UPDATE_FIELD") {
        changeMap.set(`${a.id}:${a.field}`, { entityId: a.id, field: a.field, oldValue: a.oldValue, newValue: a.value });
      }
    }
    return Array.from(changeMap.values());
  };

  const handleSave = async () => {
    const changes = collectChanges();
    const hasCatalogChanges = state.dirty && state.catalog;
    if (changes.length === 0 && !hasCatalogChanges) {
      console.log("[save] No changes to save");
      return;
    }
    // Show diff preview
    setSaveDiffChanges(changes);
  };

  const executeSave = async (changes: any[]) => {
    try {
      const r = await fetch("/api/editor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes, catalog: state.catalog, dryRun: false }),
      });
      const result = await r.json();
      console.log("[save] Result:", result);
      // Always save tile tints (regardless of entity save success)
      try {
        await fetch("/api/editor/save-tints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tints: state.tileTints,
            presets: state.catalog?.tintPresets,
          }),
        });
      } catch {}
      if (result.success) {
        window.dispatchEvent(new CustomEvent("editor:saved", {}));
        // Re-export editor-data.json so reloads get fresh data
        try {
          await fetch("/api/editor/re-export", { method: "POST" });
        } catch {}
        // Reload fresh data from the updated export
        try {
          const dataResp = await fetch("/api/editor/data");
          const freshData = await dataResp.json();
          if (freshData.entities) {
            dispatch({ type: "LOAD_DATA", entities: freshData.entities });
          }
          if (freshData.catalog) {
            dispatch({ type: "LOAD_CATALOG", catalog: freshData.catalog });
          }
        } catch {}
        // MARK_CLEAN also clears undo/redo stacks
        dispatch({ type: "MARK_CLEAN" });
      }
    } catch (e) {
      console.error("Save failed:", e);
    }
    setSaveDiffChanges(null);
  };

  // Listen for Ctrl+S trigger from keyboard handler
  useEffect(() => {
    const handler = () => {
      const changes = collectChanges();
      if (changes.length > 0 || state.dirty) setSaveDiffChanges(changes);
    };
    window.addEventListener("editor:trigger-save", handler);
    return () => window.removeEventListener("editor:trigger-save", handler);
  }, [state.undoStack, state.dirty]);

  // Esc closes the save-diff modal while it's open. Runs in capture phase
  // and stops propagation so it wins over the main editor's tiered Esc.
  useEffect(() => {
    if (!saveDiffChanges) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setSaveDiffChanges(null);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [saveDiffChanges]);

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
        <MenuItem label="Export CSV..." onClick={() => {
          const header = "id,type,x,y,spriteKey,facingDirection,movementBehavior";
          const rows = state.entities.map((e) => `${e.id},${e.type},${e.x},${e.y},${e.spriteKey || ""},${e.facingDirection || ""},${e.movementBehavior || ""}`);
          const csv = [header, ...rows].join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = "editor-entities.csv"; a.click();
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
        <MenuHeader>History</MenuHeader>
        <MenuItem label="Undo" shortcut="⌘Z" onClick={handleUndo} disabled={state.undoStack.length === 0} />
        <MenuItem label="Redo" shortcut="⌘⇧Z / ⌘Y" onClick={handleRedo} disabled={state.redoStack.length === 0} />
        <MenuItem label="Show History" onClick={() => window.dispatchEvent(new CustomEvent("editor:show-history"))} disabled={state.undoStack.length === 0} />

        <MenuSep />
        <MenuHeader>Selection</MenuHeader>
        <MenuItem label="Click tile" shortcut="—" disabled />
        <MenuItem label="Pick GID (eyedropper)" shortcut="Click tile" disabled />
        <MenuItem label="Select entity" shortcut="Click entity" disabled />
        <MenuItem label="Multi-select tile" shortcut="⇧+Click" disabled />
        <MenuItem label="Deselect all / pop level" shortcut="Esc" onClick={() => dispatch({ type: "DESELECT" })} />

        <MenuSep />
        <MenuHeader>Tile painting</MenuHeader>
        <MenuItem label="Paint picked GID" shortcut="⌘+Click" disabled />
        <MenuItem label="Paint stroke" shortcut="⌘+Drag" disabled />
        <MenuItem label="Erase tile" shortcut="⌥+Click" disabled />
        <MenuItem label="Erase stroke" shortcut="⌥+Drag" disabled />
        <MenuItem label="Fill bucket (flood fill)" shortcut="⌘⇧+Click" disabled />
        <MenuItem label="Magic wand (select all same GID / top sprite)" shortcut="W" onClick={() => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
        }} />
        <MenuItem label="Toggle tile collision" shortcut="C" onClick={() => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
        }} />

        <MenuSep />
        <MenuHeader>Block copy / paste</MenuHeader>
        <MenuItem label="Copy block" shortcut="⇧+Drag (2+ tiles)" disabled />
        <MenuItem label="Paste block (single)" shortcut="Click (when copied)" disabled />
        <MenuItem label="Paint-paste block" shortcut="⌘+Drag (when copied)" disabled />
        <MenuItem label="Rotate block 90°" shortcut="R" disabled />
        <MenuItem label="Flip block horizontally" shortcut="F" disabled />
        <MenuItem label="Flip block vertically" shortcut="⇧F" disabled />
        <MenuItem label="Drop block" shortcut="Esc" onClick={() => emitEditorEvent("editor:clear-block-selection", {})} />

        <MenuSep />
        <MenuHeader>Tinting (HSL)</MenuHeader>
        <MenuItem label="Open tint popup for last clicked tile" shortcut="T" onClick={() => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "t" }));
        }} />
        <MenuItem label="Add tile to tint selection" shortcut="⇧+Click" disabled />

        <MenuSep />
        <MenuHeader>Entity</MenuHeader>
        <MenuItem label="Move entity" shortcut="Drag selected" disabled />
        <MenuItem label="Duplicate" shortcut="⌘D" disabled={!state.selectedEntityId} onClick={() => {
          if (state.selectedEntityId) {
            const e = state.entities.find((x) => x.id === state.selectedEntityId);
            if (e) dispatch({ type: "ADD_ENTITY", entity: { ...e, id: e.id + "_copy", x: e.x + 1 } });
          }
        }} />
        <MenuItem label="Delete" shortcut="Del" disabled={!state.selectedEntityId} onClick={() => {
          if (state.selectedEntityId) {
            const e = state.entities.find((x) => x.id === state.selectedEntityId);
            if (e) dispatch({ type: "DELETE_ENTITY", id: e.id, entity: e });
          }
        }} />
        {state.selectedEntityIds.length > 1 && (
          <MenuItem label={`Batch Delete (${state.selectedEntityIds.length})`} onClick={() => {
            for (const id of state.selectedEntityIds) {
              const e = state.entities.find((x) => x.id === id);
              if (e) dispatch({ type: "DELETE_ENTITY", id: e.id, entity: e });
            }
          }} />
        )}

        <MenuSep />
        <MenuHeader>Navigation</MenuHeader>
        <MenuItem label="Pan" shortcut="Drag / ␣+Drag / middle-click" disabled />
        <MenuItem label="Zoom" shortcut="Scroll · + / -" disabled />
        <MenuItem label="Fit map to view" shortcut="0" onClick={() => emitEditorEvent("editor:fit-map", {})} />
        <MenuItem label="Reset zoom (100%)" shortcut="1" onClick={() => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
        }} />
        <MenuItem label="Arrow keys (step pan)" shortcut="← → ↑ ↓" disabled />

        <MenuSep />
        <MenuHeader>Export</MenuHeader>
        <MenuItem label="Export map as PNG" onClick={() => emitEditorEvent("editor:export-png", {})} />
      </>
    ),
    View: (
      <>
        <MenuItem label={`${state.layers.grid ? "✓ " : "  "}Grid`} onClick={() => toggleLayer("grid")} />
        <MenuItem label={`${state.layers.collision ? "✓ " : "  "}Collision Overlay`} onClick={() => toggleLayer("collision")} />
        <MenuItem label={`${state.layers.foreground ? "✓ " : "  "}Foreground`} onClick={() => toggleLayer("foreground")} />
        <MenuItem label={`${state.layers.entities ? "✓ " : "  "}Entity Markers`} onClick={() => toggleLayer("entities")} />
        <MenuItem label={`${state.layers.zones ? "✓ " : "  "}Zone Boundaries`} onClick={() => toggleLayer("zones")} />
        <MenuItem label={`${state.layers.movement ? "✓ " : "  "}Movement Ranges`} onClick={() => toggleLayer("movement")} />
        <MenuItem label={`${state.layers.heatmap ? "✓ " : "  "}Reachability Heatmap`} onClick={async () => {
          if (!state.layers.heatmap) {
            // Fetch reachability data from analyzer
            try {
              const r = await fetch("/api/editor/analyze", { method: "POST" });
              const data = await r.json();
              if (data.reachability) {
                emitEditorEvent("editor:show-heatmap", { data: data.reachability });
              }
            } catch (e) { console.error("Heatmap failed:", e); }
          } else {
            emitEditorEvent("editor:hide-heatmap", {});
          }
          toggleLayer("heatmap");
        }} />
        <MenuSep />
        <MenuItem label="Zoom In" shortcut="Scroll ↑" disabled />
        <MenuItem label="Zoom Out" shortcut="Scroll ↓" disabled />
        <MenuItem label="Reset View" onClick={() => {
          emitEditorEvent(JUMP_TO_TILE, { x: 70, y: 60 });
        }} />
        <MenuSep />
        <MenuItem label="Entity Relationships" onClick={() => {
          window.dispatchEvent(new CustomEvent("editor:show-relationships"));
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
      <div
        title="Unified Edit mode — see the Edit menu (or press ?) for all shortcuts"
        style={{
          fontSize: 10, color: "#4a9eed", padding: "4px 10px",
          border: "1px solid #2a4a6a", borderRadius: 4, background: "#1a2a3a",
          fontWeight: 600, letterSpacing: 0.3,
        }}
      >
        EDIT
      </div>
      <div style={{ flex: 1 }} />
      {/* Global search */}
      <input
        type="text"
        placeholder="Search map... (Ctrl+F)"
        style={{
          width: 150, background: "#161628", border: "1px solid #2a2a40", borderRadius: 3,
          color: "#ccc", fontSize: 10, padding: "3px 8px", outline: "none",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const query = (e.target as HTMLInputElement).value.toLowerCase();
            if (!query) return;
            const match = state.entities.find((ent) =>
              ent.id.toLowerCase().includes(query) ||
              ent.dialog?.some((d) => d.toLowerCase().includes(query)) ||
              ent.text?.some((t) => t.toLowerCase().includes(query)) ||
              ent.speakerName?.toLowerCase().includes(query) ||
              ent.spriteKey?.toLowerCase().includes(query),
            );
            if (match) {
              dispatch({ type: "SELECT_ENTITY", id: match.id });
              emitEditorEvent(JUMP_TO_TILE, { x: match.x, y: match.y });
            }
          }
        }}
      />
      <div style={{ display: "flex", gap: 4, fontSize: 9, color: "#555", marginLeft: 6 }}>
        <span onClick={handleUndo} title="Undo (⌘Z)" style={{ cursor: "pointer", background: "#1e1e2e", border: "1px solid #444", borderRadius: 2, padding: "1px 5px", fontFamily: "monospace" }}>⌘Z</span>
        <span onClick={handleRedo} title="Redo (⌘Y)" style={{ cursor: "pointer", background: "#1e1e2e", border: "1px solid #444", borderRadius: 2, padding: "1px 5px", fontFamily: "monospace" }}>⌘Y</span>
        <span onClick={handleSave} title="Save (⌘S)" style={{ cursor: "pointer", background: "#1e1e2e", border: "1px solid #444", borderRadius: 2, padding: "1px 5px", fontFamily: "monospace" }}>⌘S</span>
      </div>
      {/* Save Diff Viewer Modal */}
      {saveDiffChanges && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998 }} onClick={() => setSaveDiffChanges(null)} />
          <div style={{
            position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)", zIndex: 9999,
            background: "#1a1a30", border: "1px solid #4a4a6a", borderRadius: 8, padding: 16,
            width: 450, maxHeight: "60vh", display: "flex", flexDirection: "column",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Save Changes ({saveDiffChanges.length})</div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, marginBottom: 12 }}>
              {saveDiffChanges.map((c, i) => (
                <div key={i} style={{ fontSize: 10, padding: "3px 0", borderBottom: "1px solid #2a2a40", display: "flex", gap: 6 }}>
                  <span style={{ color: "#4a9eed", fontFamily: "monospace", minWidth: 140 }}>{c.entityId}</span>
                  <span style={{ color: "#888" }}>.{c.field}</span>
                  <span style={{ color: "#ef4444" }}>{JSON.stringify(c.oldValue).substring(0, 20)}</span>
                  <span style={{ color: "#666" }}>{"→"}</span>
                  <span style={{ color: "#22c55e" }}>{JSON.stringify(c.newValue).substring(0, 20)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setSaveDiffChanges(null)} style={{
                background: "#2a2a40", color: "#ccc", border: "1px solid #3a3a50", borderRadius: 4,
                padding: "6px 16px", fontSize: 11, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={() => executeSave(saveDiffChanges)} style={{
                background: "#22c55e", color: "#000", border: "none", borderRadius: 4,
                padding: "6px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>Save {saveDiffChanges.length} Changes</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** NPC sprite preview — renders first frame using canvas for universal sprite sizes */
function SpritePreview({ spriteKey, size = 24 }: { spriteKey: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      // Determine frame size: height is the full image height, width is 16 for standard or min(w, 48)
      const frameW = Math.min(img.width, img.height <= 16 ? 16 : 16);
      const frameH = img.height;
      // Scale to fit the canvas while maintaining aspect ratio
      const scale = Math.min(size / frameW, size / frameH);
      const dw = frameW * scale;
      const dh = frameH * scale;
      ctx.drawImage(img, 0, 0, frameW, frameH, (size - dw) / 2, (size - dh) / 2, dw, dh);
    };
    img.src = `/game/sprites/emerald/${spriteKey}.png`;
  }, [spriteKey, size]);

  return (
    <canvas ref={canvasRef} width={size} height={size}
      style={{ width: size, height: size, flexShrink: 0, background: "#0d0d1a", borderRadius: 2, imageRendering: "pixelated" }} />
  );
}

// Fallback sprite list used before dynamic list loads
const FALLBACK_NPC_SPRITES = [
  "boy_1", "boy_2", "boy_3", "girl_1", "girl_2", "girl_3",
  "man_1", "woman_1", "woman_2", "woman_4", "fat_man", "old_man",
  "beauty", "maniac", "lass", "fisherman", "nurse", "item_ball",
];

const ALL_TILESETS = [
  { id: "mauville_bottom", label: "Mauville Ground", path: "/game/tilesets/mauville_bottom.png" },
  { id: "mauville_top", label: "Mauville Top", path: "/game/tilesets/mauville_top.png" },
  { id: "mauville_ground", label: "Mauville Base", path: "/game/tilesets/mauville_ground.png" },
  { id: "pokecenter_bottom", label: "Pokemon Center", path: "/game/tilesets/pokecenter_bottom.png" },
  { id: "pokecenter_top", label: "Pokemon Center Top", path: "/game/tilesets/pokecenter_top.png" },
  { id: "mart_bottom", label: "Mart", path: "/game/tilesets/mart_bottom.png" },
  { id: "mart_top", label: "Mart Top", path: "/game/tilesets/mart_top.png" },
  { id: "gym_bottom", label: "Gym", path: "/game/tilesets/gym_bottom.png" },
  { id: "gym_top", label: "Gym Top", path: "/game/tilesets/gym_top.png" },
];

/** Swatch entry — a pinned tile reference persisted across sessions. */
interface TileSwatch { tilesetId: string; gid: number; }

function useSwatches() {
  const [list, setList] = useState<TileSwatch[]>(() => {
    try {
      const raw = localStorage.getItem("editor_swatches");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  useEffect(() => {
    try { localStorage.setItem("editor_swatches", JSON.stringify(list)); } catch {}
  }, [list]);
  const add = (sw: TileSwatch) => setList((prev) => {
    if (prev.some((p) => p.tilesetId === sw.tilesetId && p.gid === sw.gid)) return prev;
    return [...prev, sw];
  });
  const remove = (sw: TileSwatch) => setList((prev) =>
    prev.filter((p) => !(p.tilesetId === sw.tilesetId && p.gid === sw.gid)),
  );
  return { list, add, remove };
}

function TilesPanel() {
  const [selectedTileset, setSelectedTileset] = useState("mauville_bottom");
  const ts = ALL_TILESETS.find((t) => t.id === selectedTileset) || ALL_TILESETS[0];
  const swatches = useSwatches();

  const applyGid = (gid: number) => {
    emitEditorEvent("editor:select-tile-gid", { gid });
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "4px", display: "flex", flexDirection: "column" }}>
      {/* Pinned swatches — favourites for quick recall */}
      {swatches.list.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 8, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
            Pinned Swatches
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {swatches.list.map((sw) => {
              const setDef = ALL_TILESETS.find((t) => t.id === sw.tilesetId);
              if (!setDef) return null;
              const col = (sw.gid - 1) % 16;
              const row = Math.floor((sw.gid - 1) / 16);
              return (
                <div
                  key={`${sw.tilesetId}:${sw.gid}`}
                  title={`${setDef.label} · GID ${sw.gid} (right-click to unpin)`}
                  onClick={() => applyGid(sw.gid)}
                  onContextMenu={(e) => { e.preventDefault(); swatches.remove(sw); }}
                  onMouseEnter={() => emitEditorEvent("editor:preview-gid", { gid: sw.gid })}
                  onMouseLeave={() => emitEditorEvent("editor:preview-gid", null)}
                  style={{
                    width: 28, height: 28, cursor: "pointer",
                    background: `url("${setDef.path}") no-repeat`,
                    backgroundPosition: `-${col * 16}px -${row * 16}px`,
                    backgroundSize: "auto",
                    imageRendering: "pixelated",
                    border: "1px solid #3a3a50", borderRadius: 2,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      <select value={selectedTileset} onChange={(e) => setSelectedTileset(e.target.value)}
        style={{ width: "100%", background: "#161628", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "3px 4px", marginBottom: 4 }}>
        {ALL_TILESETS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <div style={{ fontSize: 8, color: "#666", padding: "0 2px 3px" }}>
        Click tile to pick GID · Right-click to pin as swatch
      </div>
      <div
        style={{ position: "relative", cursor: "crosshair" }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const img = e.currentTarget.querySelector("img");
          if (!img) return;
          const scaleX = img.naturalWidth / rect.width;
          const scaleY = img.naturalHeight / rect.height;
          const realX = (e.clientX - rect.left) * scaleX;
          const realY = (e.clientY - rect.top) * scaleY;
          const tileCol = Math.floor(realX / 16);
          const tileRow = Math.floor(realY / 16);
          const gid = tileRow * 16 + tileCol + 1;
          applyGid(gid);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const img = e.currentTarget.querySelector("img");
          if (!img) return;
          const scaleX = img.naturalWidth / rect.width;
          const scaleY = img.naturalHeight / rect.height;
          const realX = (e.clientX - rect.left) * scaleX;
          const realY = (e.clientY - rect.top) * scaleY;
          const tileCol = Math.floor(realX / 16);
          const tileRow = Math.floor(realY / 16);
          const gid = tileRow * 16 + tileCol + 1;
          swatches.add({ tilesetId: selectedTileset, gid });
        }}
      >
        <img src={ts.path} alt={ts.label}
          style={{ imageRendering: "pixelated", width: "100%", display: "block" }} />
      </div>
    </div>
  );
}

/** Left panel — Tabbed Asset Library */
function LeftPanel() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const [activeTab, setActiveTab] = useState<"entities" | "sprites" | "tiles" | "data">("entities");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterZone, setFilterZone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const entityTypes = ["npc", "pokemon-npc", "pickup", "wild-pokemon", "sign", "hidden-item", "warp", "gate"] as const;
  const typeColors: Record<string, string> = {
    npc: "#3b82f6", "pokemon-npc": "#06b6d4", pickup: "#f97316",
    "wild-pokemon": "#22c55e", sign: "#f59e0b", "hidden-item": "#ec4899",
    warp: "#8b5cf6", gate: "#dc2626",
  };

  const getZone = (x: number, y: number) =>
    x >= 50 && x < 90 && y >= 50 && y < 70 ? "Mauville" : x < 50 ? "Route 117" : x >= 90 ? "Route 118" : y < 50 ? "Route 111" : "Route 110";

  const filtered = state.entities.filter((e) => {
    if (filterType && e.type !== filterType) return false;
    if (filterZone && getZone(e.x, e.y) !== filterZone) return false;
    if (searchQuery && !e.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const allSprites = state.availableSprites?.npcs || FALLBACK_NPC_SPRITES;
  const filteredSprites = allSprites.filter((s) =>
    !searchQuery || s.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const catalogCount = state.catalog
    ? state.catalog.itemDefinitions.length + state.catalog.stepMilestones.length + state.catalog.pokedex.length + state.catalog.party.length + state.catalog.badges.length + state.catalog.researchLog.length + state.catalog.fieldMoveAwards.length
    : 0;
  const tabs = [
    { id: "entities" as const, label: "Entities", count: state.entities.length },
    { id: "sprites" as const, label: "NPC Sprites", count: allSprites.length },
    { id: "tiles" as const, label: "Tiles", count: 0 },
    { id: "data" as const, label: "Data", count: catalogCount },
  ];

  return (
    <div style={{ width: "100%", height: "100%", background: "#1e1e30", display: "flex", flexDirection: "column" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid #2a2a40" }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(""); setFilterType(null); }}
            style={{
              flex: 1, padding: "6px 4px", fontSize: 9, textAlign: "center", cursor: "pointer",
              color: activeTab === tab.id ? "#fff" : "#888",
              borderBottom: activeTab === tab.id ? "2px solid #4a9eed" : "2px solid transparent",
              fontWeight: activeTab === tab.id ? 700 : 400,
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: "6px 8px", flexShrink: 0 }}>
        <input
          type="text"
          placeholder={activeTab === "entities" ? "Search entities..." : activeTab === "sprites" ? "Search sprites..." : "Search tiles..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%", background: "#161628", border: "1px solid #2a2a40", borderRadius: 3,
            color: "#ccc", fontSize: 10, padding: "3px 6px", outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Entity tab */}
      {activeTab === "entities" && (
        <>
          <div style={{ padding: "0 8px 4px", flexShrink: 0 }}>
            {entityTypes.map((t) => {
              const count = state.entities.filter((e) => e.type === t).length;
              if (count === 0) return null;
              const active = filterType === t;
              return (
                <div
                  key={t}
                  onClick={() => setFilterType(active ? null : t)}
                  style={{
                    padding: "2px 6px", fontSize: 10, cursor: "pointer",
                    background: active ? "#1e3a5f" : "transparent", borderRadius: 2,
                  }}
                >
                  <span style={{ color: typeColors[t] || "#888", marginRight: 4 }}>●</span>
                  <span style={{ color: active ? "#fff" : "#aaa" }}>{t} ({count})</span>
                </div>
              );
            })}
          </div>
          {/* Zone filter */}
          <div style={{ display: "flex", gap: 2, padding: "2px 6px", flexWrap: "wrap" }}>
            {["Mauville", "Route 117", "Route 118", "Route 111", "Route 110"].map((z) => (
              <span key={z} onClick={() => setFilterZone(filterZone === z ? null : z)}
                style={{
                  fontSize: 8, padding: "1px 4px", borderRadius: 3, cursor: "pointer",
                  background: filterZone === z ? "#1e3a5f" : "#161628",
                  color: filterZone === z ? "#fff" : "#666",
                }}>{z}</span>
            ))}
          </div>
          <div style={{ height: 1, background: "#2a2a40", margin: "2px 8px", flexShrink: 0 }} />
          <div style={{ fontSize: 9, fontWeight: 700, color: "#666", letterSpacing: 1, padding: "4px 8px", flexShrink: 0 }}>
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
                {e.spriteKey && <SpritePreview spriteKey={e.spriteKey} size={24} />}
                {!e.spriteKey && <span style={{ color: typeColors[e.type] || "#888", width: 18, textAlign: "center" }}>●</span>}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.id}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* NPC Sprites tab */}
      {activeTab === "sprites" && (
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "0 4px" }}>
          <div style={{ fontSize: 9, color: "#666", padding: "4px 4px", flexShrink: 0 }}>
            {filteredSprites.length} sprites — drag to viewport to place
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
            {filteredSprites.map((sprite) => (
              <div
                key={sprite}
                title={`Click to place ${sprite} NPC on map`}
                style={{
                  background: "#161628", borderRadius: 3, padding: 4,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  cursor: "pointer", border: "1px solid transparent",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#4a9eed"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
                onClick={() => {
                  const id = `npc_new_${sprite}_${Date.now().toString(36)}`;
                  const newEntity = {
                    type: "npc" as const, id, x: 70, y: 60,
                    spriteKey: sprite, facingDirection: "down",
                    movementBehavior: "STATIONARY", movementRangeX: 0, movementRangeY: 0,
                    dialog: ["Hello!"], sourceFile: "npcs.ts",
                  };
                  dispatch({ type: "ADD_ENTITY", entity: newEntity });
                  emitEditorEvent(JUMP_TO_TILE, { x: 70, y: 60 });
                }}
              >
                <img
                  src={`/game/sprites/emerald/${sprite}.png`}
                  alt={sprite}
                  style={{ imageRendering: "pixelated", width: 48, height: "auto" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span style={{ fontSize: 7, color: "#888", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                  {sprite}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tiles tab */}
      {activeTab === "tiles" && <TilesPanel />}

      {/* Data Manager tab */}
      {activeTab === "data" && <DataManagerPanel />}
    </div>
  );
}

/** Data Manager sub-tabs */
type DataSubTab = "items" | "tms" | "pokedex" | "party" | "badges" | "log" | "moves" | "movement";
const DATA_SUB_TABS: { id: DataSubTab; label: string }[] = [
  { id: "items", label: "Items" },
  { id: "tms", label: "TMs" },
  { id: "pokedex", label: "Pokedex" },
  { id: "party", label: "Party" },
  { id: "badges", label: "Badges" },
  { id: "log", label: "Log" },
  { id: "moves", label: "Moves" },
  { id: "movement", label: "Movement" },
];

const POCKET_COLORS: Record<string, string> = {
  papers: "#ef4444", blogs: "#3b82f6", keyItems: "#f59e0b", tms: "#22c55e",
};

function DataManagerPanel() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const [subTab, setSubTab] = useState<DataSubTab>("items");
  const [search, setSearch] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const catalog = state.catalog;

  if (!catalog) return <div style={{ padding: 12, color: "#555", fontSize: 11 }}>Loading catalog data...</div>;

  const updateCatalog = (dataType: keyof typeof catalog, index: number, field: string, value: any) => {
    dispatch({ type: "UPDATE_CATALOG", dataType, index, field, value });
  };

  const renderField = (label: string, value: any, onChange: (v: string) => void, opts?: { type?: string; disabled?: boolean; options?: string[] }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
      <span style={{ fontSize: 8, color: "#888", width: 55, flexShrink: 0, textAlign: "right" }}>{label}</span>
      {opts?.options ? (
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={opts.disabled}
          style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }}>
          {opts.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={opts?.type || "text"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={opts?.disabled}
          style={{ flex: 1, background: opts?.disabled ? "transparent" : "#0d0d1a", border: opts?.disabled ? "none" : "1px solid #2a2a40", borderRadius: 2, color: opts?.disabled ? "#666" : "#ccc", fontSize: 9, padding: "1px 3px", boxSizing: "border-box" }} />
      )}
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Sub-tab bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 1, padding: "4px 4px 2px", flexShrink: 0 }}>
        {DATA_SUB_TABS.map((t) => {
          const count = catalog[t.id === "tms" ? "stepMilestones" : t.id === "log" ? "researchLog" : t.id === "moves" ? "fieldMoveAwards" : t.id === "items" ? "itemDefinitions" : t.id === "movement" ? "movementPatterns" : t.id]?.length || 0;
          return (
            <span key={t.id} onClick={() => { setSubTab(t.id); setSearch(""); setExpandedIdx(null); }}
              style={{
                fontSize: 8, padding: "2px 5px", borderRadius: 3, cursor: "pointer",
                background: subTab === t.id ? "#1e3a5f" : "#161628",
                color: subTab === t.id ? "#fff" : "#888",
              }}>{t.label} ({count})</span>
          );
        })}
      </div>
      {/* Search */}
      <div style={{ padding: "3px 6px", flexShrink: 0 }}>
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", background: "#161628", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "2px 5px", outline: "none", boxSizing: "border-box" }} />
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "0 4px" }}>

        {/* ── ITEMS ── */}
        {subTab === "items" && catalog.itemDefinitions
          .map((item, idx) => ({ item, idx }))
          .filter(({ item }) => !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase()))
          .map(({ item, idx }) => (
            <div key={item.id} style={{ marginBottom: 2 }}>
              <div onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", cursor: "pointer", background: expandedIdx === idx ? "#1e2a3f" : "transparent", borderRadius: 3 }}>
                <span style={{ fontSize: 7, padding: "0 3px", borderRadius: 3, background: POCKET_COLORS[item.pocket] || "#555", color: "#fff", fontWeight: 700 }}>{item.pocket}</span>
                <span style={{ fontSize: 9, color: "#ccc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                <span style={{ fontSize: 7, color: "#555" }}>{item.id}</span>
              </div>
              {expandedIdx === idx && (
                <div style={{ padding: "4px 8px", background: "#0d0d1a", borderRadius: 3, margin: "2px 0" }}>
                  {renderField("ID", item.id, () => {}, { disabled: true })}
                  {renderField("Name", item.name, (v) => updateCatalog("itemDefinitions", idx, "name", v))}
                  {renderField("Pocket", item.pocket, (v) => updateCatalog("itemDefinitions", idx, "pocket", v), { options: ["papers", "blogs", "keyItems", "tms"] })}
                  {renderField("URL", item.url, (v) => updateCatalog("itemDefinitions", idx, "url", v))}
                  {renderField("Icon", item.icon, (v) => updateCatalog("itemDefinitions", idx, "icon", v))}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 8, color: "#888", width: 55, flexShrink: 0, textAlign: "right", paddingTop: 2 }}>Desc</span>
                    <textarea value={item.description} onChange={(e) => updateCatalog("itemDefinitions", idx, "description", e.target.value)}
                      style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "2px 4px", resize: "vertical", minHeight: 32, fontFamily: "monospace", boxSizing: "border-box" }} />
                  </div>
                  <span onClick={() => dispatch({ type: "DELETE_CATALOG_ENTRY", dataType: "itemDefinitions", index: idx })}
                    style={{ fontSize: 8, color: "#ef4444", cursor: "pointer" }}>Delete</span>
                </div>
              )}
            </div>
          ))}
        {subTab === "items" && (
          <div onClick={() => {
            const id = `item_new_${Date.now().toString(36)}`;
            dispatch({ type: "ADD_CATALOG_ENTRY", dataType: "itemDefinitions", entry: { id, name: "New Item", pocket: "keyItems", description: "", url: "", icon: "" } });
          }} style={{ fontSize: 9, color: "#4a9eed", cursor: "pointer", padding: "4px 8px" }}>+ Add Item</div>
        )}

        {/* ── TMs ── */}
        {subTab === "tms" && catalog.stepMilestones
          .map((tm, idx) => ({ tm, idx }))
          .filter(({ tm }) => !search || tm.tm.toLowerCase().includes(search.toLowerCase()) || tm.itemId.toLowerCase().includes(search.toLowerCase()))
          .map(({ tm, idx }) => (
            <div key={idx} style={{ marginBottom: 2 }}>
              <div onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", cursor: "pointer", background: expandedIdx === idx ? "#1e2a3f" : "transparent", borderRadius: 3 }}>
                <span style={{ fontSize: 8, color: "#22c55e", fontFamily: "monospace", width: 40 }}>{tm.steps}s</span>
                <span style={{ fontSize: 9, color: "#ccc", flex: 1 }}>{tm.tm}</span>
                <span style={{ fontSize: 7, color: "#555" }}>{tm.itemId}</span>
              </div>
              {expandedIdx === idx && (
                <div style={{ padding: "4px 8px", background: "#0d0d1a", borderRadius: 3, margin: "2px 0" }}>
                  {renderField("Steps", tm.steps, (v) => updateCatalog("stepMilestones", idx, "steps", parseInt(v) || 0), { type: "number" })}
                  {renderField("TM Name", tm.tm, (v) => updateCatalog("stepMilestones", idx, "tm", v))}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 8, color: "#888", width: 55, flexShrink: 0, textAlign: "right" }}>Item</span>
                    <select value={tm.itemId} onChange={(e) => updateCatalog("stepMilestones", idx, "itemId", e.target.value)}
                      style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }}>
                      {catalog.itemDefinitions.filter((it) => it.pocket === "tms").map((it) => (
                        <option key={it.id} value={it.id}>{it.name} ({it.id})</option>
                      ))}
                    </select>
                  </div>
                  {renderField("Desc", tm.description, (v) => updateCatalog("stepMilestones", idx, "description", v))}
                </div>
              )}
            </div>
          ))}

        {/* ── POKEDEX ── */}
        {subTab === "pokedex" && catalog.pokedex
          .map((p, idx) => ({ p, idx }))
          .filter(({ p }) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.pokemon.toLowerCase().includes(search.toLowerCase()))
          .map(({ p, idx }) => (
            <div key={p.number} style={{ marginBottom: 2 }}>
              <div onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", cursor: "pointer", background: expandedIdx === idx ? "#1e2a3f" : "transparent", borderRadius: 3 }}>
                <span style={{ fontSize: 8, color: "#22c55e", fontFamily: "monospace", width: 24 }}>#{p.number}</span>
                <span style={{ fontSize: 9, color: "#ccc", flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 7, color: "#888" }}>{p.pokemon}</span>
              </div>
              {expandedIdx === idx && (
                <div style={{ padding: "4px 8px", background: "#0d0d1a", borderRadius: 3, margin: "2px 0" }}>
                  {renderField("#", p.number, (v) => updateCatalog("pokedex", idx, "number", parseInt(v) || 0), { type: "number" })}
                  {renderField("Name", p.name, (v) => updateCatalog("pokedex", idx, "name", v))}
                  {renderField("Species", p.pokemon, (v) => updateCatalog("pokedex", idx, "pokemon", v))}
                  {renderField("Level", p.level, (v) => updateCatalog("pokedex", idx, "level", parseInt(v) || 1), { type: "number" })}
                  {renderField("Type 1", p.types[0], (v) => updateCatalog("pokedex", idx, "types", [v, p.types[1]]),
                    { options: ["Normal", "Fire", "Water", "Grass", "Electric", "Ice", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"] })}
                  {renderField("Type 2", p.types[1], (v) => updateCatalog("pokedex", idx, "types", [p.types[0], v]),
                    { options: ["Normal", "Fire", "Water", "Grass", "Electric", "Ice", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"] })}
                  {renderField("Status", p.status, (v) => updateCatalog("pokedex", idx, "status", v), { options: ["caught", "seen", "unseen"] })}
                  {renderField("URL", p.url, (v) => updateCatalog("pokedex", idx, "url", v))}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 8, color: "#888", width: 55, flexShrink: 0, textAlign: "right", paddingTop: 2 }}>Desc</span>
                    <textarea value={p.description} onChange={(e) => updateCatalog("pokedex", idx, "description", e.target.value)}
                      style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "2px 4px", resize: "vertical", minHeight: 24, fontFamily: "monospace", boxSizing: "border-box" }} />
                  </div>
                </div>
              )}
            </div>
          ))}

        {/* ── PARTY ── */}
        {subTab === "party" && catalog.party
          .map((m, idx) => ({ m, idx }))
          .filter(({ m }) => !search || m.nickname.toLowerCase().includes(search.toLowerCase()) || m.species.toLowerCase().includes(search.toLowerCase()))
          .map(({ m, idx }) => (
            <div key={m.id} style={{ marginBottom: 2 }}>
              <div onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", cursor: "pointer", background: expandedIdx === idx ? "#1e2a3f" : "transparent", borderRadius: 3 }}>
                <span style={{ fontSize: 9, color: "#ccc", flex: 1 }}>{m.nickname}</span>
                <span style={{ fontSize: 8, color: "#888" }}>Lv.{m.level} {m.species}</span>
              </div>
              {expandedIdx === idx && (
                <div style={{ padding: "4px 8px", background: "#0d0d1a", borderRadius: 3, margin: "2px 0" }}>
                  {renderField("ID", m.id, () => {}, { disabled: true })}
                  {renderField("Nickname", m.nickname, (v) => updateCatalog("party", idx, "nickname", v))}
                  {renderField("Species", m.species, (v) => updateCatalog("party", idx, "species", v))}
                  {renderField("Level", m.level, (v) => updateCatalog("party", idx, "level", parseInt(v) || 1), { type: "number" })}
                  {renderField("HP", m.hp, (v) => updateCatalog("party", idx, "hp", parseInt(v) || 1), { type: "number" })}
                  {renderField("Max HP", m.maxHp, (v) => updateCatalog("party", idx, "maxHp", parseInt(v) || 1), { type: "number" })}
                  {renderField("Project", m.projectName, (v) => updateCatalog("party", idx, "projectName", v))}
                  {renderField("URL", m.url, (v) => updateCatalog("party", idx, "url", v))}
                  <div style={{ fontSize: 8, fontWeight: 700, color: "#8b5cf6", margin: "4px 0 2px" }}>MOVES</div>
                  {m.moves.map((mv, mi) => (
                    <div key={mi} style={{ marginLeft: 8, marginBottom: 3, padding: "2px 4px", background: "#161628", borderRadius: 2 }}>
                      {renderField("Name", mv.name, (v) => {
                        const moves = [...m.moves]; moves[mi] = { ...moves[mi], name: v };
                        updateCatalog("party", idx, "moves", moves);
                      })}
                      {renderField("Type", mv.type, (v) => {
                        const moves = [...m.moves]; moves[mi] = { ...moves[mi], type: v };
                        updateCatalog("party", idx, "moves", moves);
                      }, { options: ["Normal", "Fire", "Water", "Grass", "Electric", "Ice", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"] })}
                      {renderField("PP", mv.pp, (v) => {
                        const moves = [...m.moves]; moves[mi] = { ...moves[mi], pp: parseInt(v) || 0 };
                        updateCatalog("party", idx, "moves", moves);
                      }, { type: "number" })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

        {/* ── BADGES ── */}
        {subTab === "badges" && catalog.badges
          .map((b, idx) => ({ b, idx }))
          .map(({ b, idx }) => (
            <div key={b.id} style={{ marginBottom: 2 }}>
              <div onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", cursor: "pointer", background: expandedIdx === idx ? "#1e2a3f" : "transparent", borderRadius: 3 }}>
                <span style={{ fontSize: 9, color: "#f59e0b" }}>{b.name}</span>
                <span style={{ fontSize: 7, color: "#555", flex: 1 }}>{b.id}</span>
                {b.auto && <span style={{ fontSize: 7, color: "#22c55e" }}>auto</span>}
              </div>
              {expandedIdx === idx && (
                <div style={{ padding: "4px 8px", background: "#0d0d1a", borderRadius: 3, margin: "2px 0" }}>
                  {renderField("ID", b.id, () => {}, { disabled: true })}
                  {renderField("Name", b.name, (v) => updateCatalog("badges", idx, "name", v))}
                  {renderField("Hint", b.hint, (v) => updateCatalog("badges", idx, "hint", v))}
                  {b.hasCondition && <div style={{ fontSize: 8, color: "#f59e0b", marginTop: 2 }}>Condition: complex logic — edit in source</div>}
                </div>
              )}
            </div>
          ))}

        {/* ── RESEARCH LOG ── */}
        {subTab === "log" && catalog.researchLog
          .map((entry, idx) => ({ entry, idx }))
          .filter(({ entry }) => !search || entry.title.toLowerCase().includes(search.toLowerCase()))
          .map(({ entry, idx }) => (
            <div key={entry.number} style={{ marginBottom: 2 }}>
              <div onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", cursor: "pointer", background: expandedIdx === idx ? "#1e2a3f" : "transparent", borderRadius: 3 }}>
                <span style={{ fontSize: 8, color: "#8b5cf6", fontFamily: "monospace", width: 16 }}>#{entry.number}</span>
                <span style={{ fontSize: 9, color: "#ccc", flex: 1 }}>{entry.title}</span>
                <span style={{ fontSize: 7, color: "#555" }}>{entry.threshold} disc.</span>
              </div>
              {expandedIdx === idx && (
                <div style={{ padding: "4px 8px", background: "#0d0d1a", borderRadius: 3, margin: "2px 0" }}>
                  {renderField("Title", entry.title, (v) => updateCatalog("researchLog", idx, "title", v))}
                  {renderField("Threshold", entry.threshold, (v) => updateCatalog("researchLog", idx, "threshold", parseInt(v) || 0), { type: "number" })}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 8, color: "#888", width: 55, flexShrink: 0, textAlign: "right", paddingTop: 2 }}>Text</span>
                    <textarea value={entry.text.join("\n")} onChange={(e) => updateCatalog("researchLog", idx, "text", e.target.value.split("\n"))}
                      style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "2px 4px", resize: "vertical", minHeight: 48, fontFamily: "monospace", boxSizing: "border-box" }} />
                  </div>
                </div>
              )}
            </div>
          ))}

        {/* ── FIELD MOVES ── */}
        {subTab === "moves" && catalog.fieldMoveAwards
          .map((fm, idx) => ({ fm, idx }))
          .map(({ fm, idx }) => (
            <div key={idx} style={{ marginBottom: 2 }}>
              <div onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", cursor: "pointer", background: expandedIdx === idx ? "#1e2a3f" : "transparent", borderRadius: 3 }}>
                <span style={{ fontSize: 9, color: "#ccc" }}>{fm.moveName}</span>
                <span style={{ fontSize: 7, color: "#555" }}>{fm.badgeId} {"→"} {fm.pokemonId}</span>
              </div>
              {expandedIdx === idx && (
                <div style={{ padding: "4px 8px", background: "#0d0d1a", borderRadius: 3, margin: "2px 0" }}>
                  {renderField("Move", fm.moveName, (v) => updateCatalog("fieldMoveAwards", idx, "moveName", v))}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 8, color: "#888", width: 55, flexShrink: 0, textAlign: "right" }}>Badge</span>
                    <select value={fm.badgeId} onChange={(e) => updateCatalog("fieldMoveAwards", idx, "badgeId", e.target.value)}
                      style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }}>
                      {catalog.badges.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.id})</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 8, color: "#888", width: 55, flexShrink: 0, textAlign: "right" }}>Pokemon</span>
                    <select value={fm.pokemonId} onChange={(e) => updateCatalog("fieldMoveAwards", idx, "pokemonId", e.target.value)}
                      style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }}>
                      {catalog.party.map((p) => <option key={p.id} value={p.id}>{p.nickname} ({p.id})</option>)}
                    </select>
                  </div>
                  {renderField("Message", fm.learnMessage, (v) => updateCatalog("fieldMoveAwards", idx, "learnMessage", v))}
                </div>
              )}
            </div>
          ))}

        {/* ── MOVEMENT PATTERNS ── */}
        {subTab === "movement" && catalog.movementPatterns
          .map((mp, idx) => ({ mp, idx }))
          .filter(({ mp }) => !search || mp.label.toLowerCase().includes(search.toLowerCase()) || mp.id.toLowerCase().includes(search.toLowerCase()))
          .map(({ mp, idx }) => (
            <div key={mp.id} style={{ marginBottom: 2 }}>
              <div onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", cursor: "pointer", background: expandedIdx === idx ? "#1e2a3f" : "transparent", borderRadius: 3 }}>
                <span style={{ fontSize: 7, padding: "0 3px", borderRadius: 3, background: mp.paceMode ? "#f59e0b" : "#3b82f6", color: "#fff", fontWeight: 700 }}>
                  {mp.walkEnabled && mp.lookEnabled ? "W+L" : mp.walkEnabled ? "WALK" : mp.lookEnabled ? "LOOK" : "STILL"}
                </span>
                <span style={{ fontSize: 9, color: "#ccc", flex: 1 }}>{mp.label}</span>
                <span style={{ fontSize: 7, color: "#555" }}>{mp.id}</span>
              </div>
              {expandedIdx === idx && (
                <div style={{ padding: "4px 8px", background: "#0d0d1a", borderRadius: 3, margin: "2px 0" }}>
                  {renderField("ID", mp.id, () => {}, { disabled: true })}
                  {renderField("Label", mp.label, (v) => updateCatalog("movementPatterns", idx, "label", v))}

                  {/* Look section */}
                  <div style={{ borderTop: "1px solid #1a1a30", marginTop: 4, paddingTop: 4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#888", marginBottom: 3, cursor: "pointer" }}>
                      <input type="checkbox" checked={mp.lookEnabled} onChange={(e) => updateCatalog("movementPatterns", idx, "lookEnabled", e.target.checked)} />
                      <span style={{ color: "#4a9eed", fontWeight: 700 }}>Look Around</span>
                    </label>
                    {mp.lookEnabled && (
                      <>
                        <div style={{ display: "flex", gap: 4, marginBottom: 2, marginLeft: 16 }}>
                          <span style={{ fontSize: 8, color: "#888", width: 50, flexShrink: 0 }}>Dirs</span>
                          {(["up", "down", "left", "right"] as const).map((d) => (
                            <div key={d} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <span style={{ fontSize: 7, color: "#666" }}>{d[0].toUpperCase()}</span>
                              <input type="number" min="0" step="0.5" value={mp.lookDirections[d]} onChange={(e) => {
                                const newDirs = { ...mp.lookDirections, [d]: Number(e.target.value) };
                                updateCatalog("movementPatterns", idx, "lookDirections", newDirs);
                              }} style={{ width: 30, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 4, marginBottom: 2, marginLeft: 16 }}>
                          <span style={{ fontSize: 8, color: "#888", width: 50, flexShrink: 0 }}>Freq (ms)</span>
                          <input type="number" value={mp.lookFrequencyMs[0]} onChange={(e) => updateCatalog("movementPatterns", idx, "lookFrequencyMs", [Number(e.target.value), mp.lookFrequencyMs[1]])}
                            style={{ width: 50, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }} />
                          <span style={{ fontSize: 8, color: "#666" }}>→</span>
                          <input type="number" value={mp.lookFrequencyMs[1]} onChange={(e) => updateCatalog("movementPatterns", idx, "lookFrequencyMs", [mp.lookFrequencyMs[0], Number(e.target.value)])}
                            style={{ width: 50, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }} />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Walk section */}
                  <div style={{ borderTop: "1px solid #1a1a30", marginTop: 4, paddingTop: 4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#888", marginBottom: 3, cursor: "pointer" }}>
                      <input type="checkbox" checked={mp.walkEnabled} onChange={(e) => updateCatalog("movementPatterns", idx, "walkEnabled", e.target.checked)} />
                      <span style={{ color: "#22c55e", fontWeight: 700 }}>Walk</span>
                    </label>
                    {mp.walkEnabled && (
                      <>
                        <div style={{ display: "flex", gap: 4, marginBottom: 2, marginLeft: 16 }}>
                          <span style={{ fontSize: 8, color: "#888", width: 50, flexShrink: 0 }}>Dirs</span>
                          {(["up", "down", "left", "right"] as const).map((d) => (
                            <div key={d} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <span style={{ fontSize: 7, color: "#666" }}>{d[0].toUpperCase()}</span>
                              <input type="number" min="0" step="0.5" value={mp.walkDirections[d]} onChange={(e) => {
                                const newDirs = { ...mp.walkDirections, [d]: Number(e.target.value) };
                                updateCatalog("movementPatterns", idx, "walkDirections", newDirs);
                              }} style={{ width: 30, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 4, marginBottom: 2, marginLeft: 16 }}>
                          <span style={{ fontSize: 8, color: "#888", width: 50, flexShrink: 0 }}>Steps</span>
                          <input type="number" min="1" value={mp.walkStepsPerMove[0]} onChange={(e) => updateCatalog("movementPatterns", idx, "walkStepsPerMove", [Number(e.target.value), mp.walkStepsPerMove[1]])}
                            style={{ width: 50, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }} />
                          <span style={{ fontSize: 8, color: "#666" }}>→</span>
                          <input type="number" min="1" value={mp.walkStepsPerMove[1]} onChange={(e) => updateCatalog("movementPatterns", idx, "walkStepsPerMove", [mp.walkStepsPerMove[0], Number(e.target.value)])}
                            style={{ width: 50, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }} />
                        </div>
                        <div style={{ display: "flex", gap: 4, marginBottom: 2, marginLeft: 16 }}>
                          <span style={{ fontSize: 8, color: "#888", width: 50, flexShrink: 0 }}>Freq (ms)</span>
                          <input type="number" value={mp.walkFrequencyMs[0]} onChange={(e) => updateCatalog("movementPatterns", idx, "walkFrequencyMs", [Number(e.target.value), mp.walkFrequencyMs[1]])}
                            style={{ width: 50, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }} />
                          <span style={{ fontSize: 8, color: "#666" }}>→</span>
                          <input type="number" value={mp.walkFrequencyMs[1]} onChange={(e) => updateCatalog("movementPatterns", idx, "walkFrequencyMs", [mp.walkFrequencyMs[0], Number(e.target.value)])}
                            style={{ width: 50, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }} />
                        </div>
                        {renderField("Speed", mp.walkSpeed, (v) => updateCatalog("movementPatterns", idx, "walkSpeed", Number(v)), { type: "number" })}
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#888", marginLeft: 16, cursor: "pointer" }}>
                          <input type="checkbox" checked={mp.paceMode} onChange={(e) => updateCatalog("movementPatterns", idx, "paceMode", e.target.checked)} />
                          <span>Pace Mode (bounce at boundary)</span>
                        </label>
                      </>
                    )}
                  </div>

                  {/* Range */}
                  <div style={{ borderTop: "1px solid #1a1a30", marginTop: 4, paddingTop: 4 }}>
                    <div style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700, marginBottom: 3 }}>Range from Home</div>
                    {renderField("Max X", mp.maxRangeX, (v) => updateCatalog("movementPatterns", idx, "maxRangeX", Number(v)), { type: "number" })}
                    {renderField("Max Y", mp.maxRangeY, (v) => updateCatalog("movementPatterns", idx, "maxRangeY", Number(v)), { type: "number" })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 4, borderTop: "1px solid #1a1a30" }}>
                    <span onClick={() => dispatch({ type: "DELETE_CATALOG_ENTRY", dataType: "movementPatterns", index: idx })}
                      style={{ fontSize: 8, color: "#ef4444", cursor: "pointer" }}>Delete</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        {subTab === "movement" && (
          <div onClick={() => {
            const newId = `custom_${Date.now()}`;
            dispatch({
              type: "ADD_CATALOG_ENTRY",
              dataType: "movementPatterns",
              entry: {
                id: newId,
                label: "New Pattern",
                lookEnabled: false,
                lookDirections: { up: 0, down: 0, left: 0, right: 0 },
                lookFrequencyMs: [2000, 4000],
                walkEnabled: false,
                walkDirections: { up: 0, down: 0, left: 0, right: 0 },
                walkStepsPerMove: [1, 1],
                walkFrequencyMs: [2000, 4000],
                walkSpeed: 2,
                maxRangeX: 0,
                maxRangeY: 0,
                paceMode: false,
              },
            });
          }} style={{ fontSize: 10, color: "#4a9eed", cursor: "pointer", padding: "6px 8px", textAlign: "center" }}>+ Add Movement Pattern</div>
        )}
      </div>
    </div>
  );
}

/**
 * Per-map assets used to render the minimap background. Uses the ORIGINAL
 * (pre-split) tileset for Mauville so grass + decor both appear composited,
 * and includes the foreground PNG so trees/buildings are visible above.
 */
const MINIMAP_MAP_ASSETS: Record<string, { mapJson: string; tileset: string; foreground?: string; width: number; height: number }> = {
  mauville: {
    mapJson: "/game/maps/mauville.json",
    tileset: "/game/tilesets/mauville_bottom.png",
    foreground: "/game/maps/mauville_foreground.png",
    width: 140, height: 120,
  },
  pokecenter: { mapJson: "/game/maps/pokecenter.json", tileset: "/game/tilesets/pokecenter_bottom.png", width: 14, height: 9 },
  mart: { mapJson: "/game/maps/mart.json", tileset: "/game/tilesets/mart_bottom.png", width: 11, height: 8 },
  gym: { mapJson: "/game/maps/gym.json", tileset: "/game/tilesets/gym_bottom.png", width: 10, height: 21 },
};

/** Module-level cache so switching maps back and forth doesn't re-fetch. */
const minimapThumbCache = new Map<string, HTMLCanvasElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Build an offscreen canvas with the full map rendered at native tile
 * resolution. The Minimap then scales it down with drawImage. Cached by
 * map id — subsequent switches to the same map are instant.
 */
async function buildMapThumbnail(mapId: string): Promise<HTMLCanvasElement | null> {
  const cached = minimapThumbCache.get(mapId);
  if (cached) return cached;
  const cfg = MINIMAP_MAP_ASSETS[mapId];
  if (!cfg) return null;
  const [mapJson, tilesetImg] = await Promise.all([
    fetch(cfg.mapJson).then((r) => r.json()),
    loadImage(cfg.tileset),
  ]);
  const w = mapJson.width as number;
  const h = mapJson.height as number;
  const ts = mapJson.tilesets[0];
  const tw = ts.tilewidth as number;
  const th = ts.tileheight as number;
  const margin = (ts.margin as number) ?? 0;
  const spacing = (ts.spacing as number) ?? 0;
  const cols = ts.columns as number;
  const firstgid = ts.firstgid as number;
  const ground = mapJson.layers.find((l: any) => l.name === "Ground");
  if (!ground) return null;

  const cv = document.createElement("canvas");
  cv.width = w * tw;
  cv.height = h * th;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  // Transparent under grass so any foreground alpha shows through correctly
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gid = ground.data[y * w + x] as number;
      if (!gid) continue;
      const local = gid - firstgid;
      if (local < 0) continue;
      const srcX = margin + (local % cols) * (tw + spacing);
      const srcY = margin + Math.floor(local / cols) * (th + spacing);
      ctx.drawImage(tilesetImg, srcX, srcY, tw, th, x * tw, y * th, tw, th);
    }
  }

  if (cfg.foreground) {
    try {
      const fgImg = await loadImage(cfg.foreground);
      ctx.drawImage(fgImg, 0, 0);
    } catch {
      // Foreground PNG missing — grass-only thumbnail is still useful
    }
  }

  minimapThumbCache.set(mapId, cv);
  return cv;
}

/**
 * Minimap — small overview of the full map with the actual tile graphics
 * plus entity dots. Click to jump the main viewport to that tile.
 */
function Minimap() {
  const state = useEditorState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapId, setMapId] = useState<string>(() =>
    typeof localStorage !== "undefined" ? (localStorage.getItem("editor_current_map") || "mauville") : "mauville"
  );
  const [thumb, setThumb] = useState<HTMLCanvasElement | null>(null);

  // Listen for map switches so we re-render with the right thumbnail
  useEffect(() => {
    const onSwitch = (e: Event) => {
      const next = (e as CustomEvent).detail?.mapId;
      if (next && next !== mapId) setMapId(next);
    };
    window.addEventListener(SWITCH_MAP, onSwitch);
    return () => window.removeEventListener(SWITCH_MAP, onSwitch);
  }, [mapId]);

  // Load the thumbnail canvas for the current map
  useEffect(() => {
    let cancelled = false;
    setThumb(minimapThumbCache.get(mapId) || null);
    buildMapThumbnail(mapId).then((cv) => {
      if (!cancelled && cv) setThumb(cv);
    });
    return () => { cancelled = true; };
  }, [mapId]);

  const cfg = MINIMAP_MAP_ASSETS[mapId] ?? MINIMAP_MAP_ASSETS.mauville;
  const MAX_W = 180;
  const MAX_H = 150;
  // Scale to fit within MAX_W x MAX_H while preserving aspect ratio
  const scale = Math.min(MAX_W / cfg.width, MAX_H / cfg.height);
  const W = Math.round(cfg.width * scale);
  const H = Math.round(cfg.height * scale);

  const typeColors: Record<string, string> = {
    npc: "#3b82f6", "pokemon-npc": "#06b6d4", pickup: "#f97316",
    "wild-pokemon": "#22c55e", sign: "#f59e0b", "hidden-item": "#ec4899",
    warp: "#8b5cf6", gate: "#dc2626",
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background fill for the brief pre-load window
    ctx.fillStyle = "#1a2e1a";
    ctx.fillRect(0, 0, W, H);

    // Actual map tiles
    if (thumb) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(thumb, 0, 0, W, H);
      // Slight dark wash so entity dots stay readable against bright tiles
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(0, 0, W, H);
    }

    // Entity dots
    for (const e of state.entities) {
      const px = (e.x / cfg.width) * W;
      const py = (e.y / cfg.height) * H;
      ctx.fillStyle = typeColors[e.type] || "#888";
      const r = state.selectedEntityId === e.id ? 3 : 1.5;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Selected entity ring
    if (state.selectedEntityId) {
      const sel = state.entities.find((e) => e.id === state.selectedEntityId);
      if (sel) {
        const px = (sel.x / cfg.width) * W;
        const py = (sel.y / cfg.height) * H;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [state.entities, state.selectedEntityId, thumb, W, H, cfg.width, cfg.height]);

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor(((e.clientX - rect.left) / W) * cfg.width);
    const y = Math.floor(((e.clientY - rect.top) / H) * cfg.height);
    emitEditorEvent(JUMP_TO_TILE, { x, y });
  };

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onClick={handleClick}
      style={{
        position: "absolute", bottom: 8, left: 8, zIndex: 10,
        border: "1px solid #333", borderRadius: 3, cursor: "crosshair",
        opacity: 0.9,
      }}
    />
  );
}

/** Map selector dropdown */
function MapSelector() {
  const dispatch = useEditorDispatch();
  const [currentMap, setCurrentMap] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("editor_current_map") || "mauville";
    }
    return "mauville";
  });
  const maps = [
    { id: "mauville", label: "Overworld (140x120)" },
    { id: "pokecenter", label: "Pokemon Center (14x9)" },
    { id: "mart", label: "Mart (11x8)" },
    { id: "gym", label: "Gym (10x21)" },
  ];

  // Helper: load entities for a map into both React state and Phaser
  const loadMapEntities = async (mapId: string) => {
    try {
      const r = await fetch("/api/editor/data");
      const data = await r.json();
      if (mapId === "mauville") {
        if (data.entities) {
          dispatch({ type: "LOAD_DATA", entities: data.entities });
        }
      } else {
        const interior = data.interiors?.[mapId];
        if (interior) {
          const entities = [
            ...interior.npcs,
            ...interior.exitWarps.map((w: any) => ({ ...w, type: "warp" })),
            ...interior.pcTiles.map((p: any) => ({ ...p, type: "special" })),
            ...(interior.switches || []),
          ];
          dispatch({ type: "LOAD_DATA", entities });
        }
      }
    } catch {}
  };

  // On mount, if persisted map isn't default, switch to it after scene is ready
  useEffect(() => {
    if (currentMap === "mauville") return;
    const switchToSaved = () => {
      emitEditorEvent(SWITCH_MAP, { mapId: currentMap });
      loadMapEntities(currentMap);
    };
    const unsub = onEditorEvent(VIEWPORT_READY, switchToSaved);
    return unsub;
  }, []);

  return (
    <select
      value={currentMap}
      onChange={async (e) => {
        const mapId = e.target.value;
        setCurrentMap(mapId);
        localStorage.setItem("editor_current_map", mapId);
        emitEditorEvent(SWITCH_MAP, { mapId });
        await loadMapEntities(mapId);
      }}
      style={{
        position: "absolute", top: 6, right: 10, zIndex: 10,
        background: "#1a1a30", color: "#ccc", border: "1px solid #3a3a50",
        borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer",
      }}
    >
      {maps.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
    </select>
  );
}

/** Center viewport — Phaser tilemap + minimap overlay */
function Viewport() {
  return (
    <div style={{ flex: 1, position: "relative", minHeight: 0, display: "flex", flexDirection: "column" }}>
      <EditorViewport />
      <MapSelector />
      <Minimap />
    </div>
  );
}

/** Template commands for autocomplete */
const TEMPLATE_COMMANDS = [
  { cmd: "github.followers", desc: "GitHub follower count", ns: "github" },
  { cmd: "github.repos", desc: "Public repo count", ns: "github" },
  { cmd: "github.stars", desc: "Total stars", ns: "github" },
  { cmd: "github.commits", desc: "Recent commit count", ns: "github" },
  { cmd: "spotify.track", desc: "Currently playing track", ns: "spotify" },
  { cmd: "spotify.artist", desc: "Currently playing artist", ns: "spotify" },
  { cmd: "strava.distance", desc: "Recent activity distance", ns: "strava" },
  { cmd: "strava.type", desc: "Recent activity type", ns: "strava" },
  { cmd: "strava.name", desc: "Recent activity name", ns: "strava" },
  { cmd: "pypi.downloads", desc: "Total PyPI downloads", ns: "pypi" },
  { cmd: "pypi.packages", desc: "Package count", ns: "pypi" },
  { cmd: "player.name", desc: "Player's name", ns: "player" },
  { cmd: "player.steps", desc: "Total steps walked", ns: "player" },
  { cmd: "badges.count", desc: "Badges earned", ns: "badges" },
  { cmd: "badges.total", desc: "Total available badges", ns: "badges" },
  { cmd: "pokedex.seen", desc: "Pokemon seen count", ns: "pokedex" },
  { cmd: "pokedex.caught", desc: "Pokemon caught count", ns: "pokedex" },
];

/** Dialog textarea with template autocomplete */
function DialogTextarea({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [acFilter, setAcFilter] = useState("");
  const [acIndex, setAcIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = TEMPLATE_COMMANDS.filter((c) =>
    !acFilter || c.cmd.toLowerCase().includes(acFilter.toLowerCase()) || c.desc.toLowerCase().includes(acFilter.toLowerCase()),
  );

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);

    // Check if we just typed {{
    const cursorPos = e.target.selectionStart;
    const before = v.substring(0, cursorPos);
    const lastOpen = before.lastIndexOf("{{");
    const lastClose = before.lastIndexOf("}}");

    if (lastOpen > lastClose && lastOpen >= 0) {
      const partial = before.substring(lastOpen + 2).trim();
      setAcFilter(partial);
      setShowAutocomplete(true);
      setAcIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  };

  const insertTemplate = (cmd: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursorPos = ta.selectionStart;
    const before = value.substring(0, cursorPos);
    const lastOpen = before.lastIndexOf("{{");
    const after = value.substring(cursorPos);
    const newValue = before.substring(0, lastOpen) + `{{ ${cmd} }}` + after;
    onChange(newValue);
    setShowAutocomplete(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showAutocomplete) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setAcIndex(Math.min(filtered.length - 1, acIndex + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setAcIndex(Math.max(0, acIndex - 1)); }
    if (e.key === "Enter" && filtered[acIndex]) { e.preventDefault(); insertTemplate(filtered[acIndex].cmd); }
    if (e.key === "Escape") { setShowAutocomplete(false); }
  };

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
        placeholder={placeholder}
        style={{
          width: "100%", background: "transparent", border: "none",
          color: "#ccc", fontSize: 10, padding: "4px 6px", outline: "none", resize: "vertical",
          fontFamily: "monospace", minHeight: 32, boxSizing: "border-box",
        }}
      />
      {showAutocomplete && filtered.length > 0 && (
        <div style={{
          position: "absolute", left: 0, right: 0, top: "100%", zIndex: 9999,
          background: "#1a1a30", border: "1px solid #4a4a6a", borderRadius: 4,
          padding: "2px 0", maxHeight: 150, overflowY: "auto",
          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
        }}>
          {filtered.slice(0, 10).map((c, i) => (
            <div
              key={c.cmd}
              onMouseDown={(e) => { e.preventDefault(); insertTemplate(c.cmd); }}
              style={{
                padding: "3px 8px", fontSize: 10, cursor: "pointer",
                background: i === acIndex ? "#2a2a50" : "transparent",
                color: i === acIndex ? "#fff" : "#ccc",
                display: "flex", justifyContent: "space-between",
              }}
            >
              <span style={{ fontFamily: "monospace" }}>{"{{ "}{c.cmd}{" }}"}</span>
              <span style={{ color: "#666", fontSize: 8, marginLeft: 8 }}>{c.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Template preview — shows resolved values for {{ }} tokens */
function TemplatePreview({ line }: { line: string }) {
  const [resolved, setResolved] = useState<string | null>(null);
  useEffect(() => {
    const tokens = line.match(/\{\{[^}]+\}\}/g);
    if (!tokens) return;
    // Lazy import to avoid circular deps
    import("../../game/systems/TemplateResolver").then(({ resolveTemplates }) => {
      resolveTemplates([line]).then((result) => {
        if (result[0] !== line) setResolved(result[0]);
      }).catch(() => {});
    });
  }, [line]);

  const tokens = line.match(/\{\{[^}]+\}\}/g);
  return (
    <div style={{ padding: "2px 6px 3px", fontSize: 8, background: "#0d1a2a" }}>
      <span style={{ color: "#06b6d4" }}>Template: {tokens?.join(", ")}</span>
      {resolved && (
        <div style={{ color: "#888", marginTop: 1 }}>Preview: {resolved}</div>
      )}
    </div>
  );
}

/** Editable field row */
function PropField({ label, value, onChange, type = "text", disabled, options }: {
  label: string; value: string | number | undefined; onChange?: (v: string) => void;
  type?: "text" | "number" | "select"; disabled?: boolean; options?: string[];
}) {
  const inputStyle: React.CSSProperties = {
    background: disabled ? "transparent" : "#0d0d1a", border: disabled ? "none" : "1px solid #2a2a40",
    borderRadius: 3, color: disabled ? "#888" : "#ccc", fontSize: 10, padding: "2px 5px",
    outline: "none", width: "100%", boxSizing: "border-box" as const,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
      <span style={{ fontSize: 9, color: "#888", width: 70, flexShrink: 0, textAlign: "right" }}>{label}</span>
      {type === "select" && options ? (
        <select
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          style={{ ...inputStyle, cursor: disabled ? "default" : "pointer" }}
        >
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          style={inputStyle}
        />
      )}
    </div>
  );
}

/** Section wrapper with header */
function PropSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: "#161628", borderRadius: 5, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ fontSize: 9, fontWeight: 700, color, padding: "6px 8px", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
      >
        <span>{title}</span>
        <span style={{ color: "#555" }}>{open ? "▾" : "▸"}</span>
      </div>
      {open && <div style={{ padding: "0 8px 6px" }}>{children}</div>}
    </div>
  );
}

/** Right panel — Properties inspector */
/** Custom sprite picker with visual previews */
function SpritePicker({ value, onChange, sprites }: { value: string; onChange: (v: string) => void; sprites: string[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const filtered = sprites.filter((s) => !search || s.toLowerCase().includes(search.toLowerCase()));

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 2, right: window.innerWidth - rect.right });
    }
    setOpen(!open);
  };

  return (
    <div>
      {/* Current selection — clickable to open */}
      <div ref={triggerRef} onClick={handleOpen}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 4, cursor: "pointer" }}>
        <SpritePreview spriteKey={value} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: "#e5e5e5", fontWeight: 500 }}>{value}</span>
        </div>
        <span style={{ fontSize: 10, color: "#666" }}>{open ? "▲" : "▼"}</span>
      </div>
      {/* Dropdown — fixed position to escape overflow:hidden ancestors */}
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "fixed", top: dropPos.top, right: dropPos.right, zIndex: 999, width: 360,
            background: "#1a1a30", border: "1px solid #4a4a6a", borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)", maxHeight: 400, display: "flex", flexDirection: "column",
          }}>
            <input type="text" placeholder="Search sprites..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
              style={{ margin: 6, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3, color: "#ccc", fontSize: 11, padding: "5px 10px", outline: "none" }} />
            <div style={{ fontSize: 9, color: "#666", padding: "0 8px 4px" }}>{filtered.length} sprites</div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 6px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
                {filtered.map((s) => (
                  <div key={s} onClick={() => { onChange(s); setOpen(false); setSearch(""); }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      padding: 5, borderRadius: 4, cursor: "pointer", minWidth: 0, overflow: "hidden",
                      background: s === value ? "#1e3a5f" : "transparent",
                      border: s === value ? "1px solid #4a9eed" : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => { if (s !== value) (e.currentTarget as HTMLElement).style.background = "#2a2a40"; }}
                    onMouseLeave={(e) => { if (s !== value) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <SpritePreview spriteKey={s} size={40} />
                    <span style={{ fontSize: 8, color: s === value ? "#fff" : "#999", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** KOSTAS dialog branch editor — shows all state-machine branches */
function KostasDialogEditor() {
  const state = useEditorState();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Load kostasDialog from editor data (fetched on mount)
  const [kostasData, setKostasData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/editor/data").then(r => r.json()).then(data => {
      if (data.kostasDialog) setKostasData(data.kostasDialog);
    }).catch(() => {});
  }, []);

  if (!kostasData) return null;

  const branches = [
    { key: "champion", label: "CHAMPION (all 8 badges)", color: "#f59e0b", lines: kostasData.champion },
    ...Object.entries(kostasData.badges as Record<string, string[]>).map(([badge, lines]) => ({
      key: `badge_${badge}`, label: `${badge.toUpperCase()} badge award`, color: "#8b5cf6", lines,
    })),
    { key: "hint", label: "HINT (no badge eligible)", color: "#888", lines: kostasData.hint },
    { key: "received", label: "Badge received confirmation", color: "#22c55e", lines: [kostasData.received] },
  ];

  return (
    <PropSection title={`KOSTAS BRANCHES (${branches.length})`} color="#f59e0b">
      <div style={{ fontSize: 8, color: "#888", marginBottom: 4 }}>
        State machine dialog — each branch triggers based on player progress
      </div>
      {branches.map((b) => (
        <div key={b.key} style={{ marginBottom: 3 }}>
          <div onClick={() => setExpanded(expanded === b.key ? null : b.key)}
            style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 4px", cursor: "pointer", background: expanded === b.key ? "#1e2a3f" : "transparent", borderRadius: 2 }}>
            <span style={{ fontSize: 7, color: b.color, fontWeight: 700 }}>{expanded === b.key ? "▾" : "▸"}</span>
            <span style={{ fontSize: 9, color: "#ccc" }}>{b.label}</span>
            <span style={{ fontSize: 7, color: "#555" }}>{b.lines.length} lines</span>
          </div>
          {expanded === b.key && (
            <div style={{ padding: "2px 8px" }}>
              {b.lines.map((line: string, i: number) => (
                <div key={i} style={{ fontSize: 9, color: "#aaa", fontFamily: "monospace", background: "#0d0d1a", borderRadius: 2, padding: "2px 4px", marginBottom: 1 }}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </PropSection>
  );
}

/**
 * Tile inspector — shown in the right sidebar when no entity is selected.
 * Tracks the last-clicked tile (from `editor:tile-selected` events the
 * scene emits) and surfaces per-tile controls: collision toggle, GID,
 * top-sprite presence, tint status. Without this panel, tile-level
 * authoring was keyboard-only (C key) and felt hidden.
 */
function TileInspector() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const [tile, setTile] = useState<{ x: number; y: number; layer: "ground" | "top" } | null>(null);
  const [gid, setGid] = useState<number>(0);
  const [blocked, setBlocked] = useState<boolean>(false);
  const [hasTopSprite, setHasTopSprite] = useState<boolean>(false);

  const refresh = (x: number, y: number, layer?: "ground" | "top") => {
    const g = (window as any).__EDITOR_GAME__;
    const s = g?.scene?.getScene("EditorScene");
    if (!s || !s.tilemap) return;
    const t = s.tilemap.getTileAt(x, y, false, "Ground");
    setGid(t?.index ?? 0);
    const idx = y * s.tilemap.width + x;
    setBlocked((s.collisionLayerData?.[idx] ?? 0) > 0);
    const hts = (s.topSprites ?? []).some((sp: any) =>
      Math.floor(sp.x / 16) === x && Math.floor(sp.y / 16) === y,
    );
    setHasTopSprite(hts);
    setTile({ x, y, layer: layer ?? (hts ? "top" : "ground") });
  };

  useEffect(() => {
    const onTile = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x: number; y: number } | null;
      if (!detail) return;
      refresh(detail.x, detail.y);
    };
    const onCol = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x: number; y: number; blocked: boolean };
      setTile((prev) => {
        if (prev && prev.x === detail.x && prev.y === detail.y) setBlocked(detail.blocked);
        return prev;
      });
    };
    window.addEventListener("editor:tile-selected", onTile);
    window.addEventListener("editor:collision-toggle", onCol);
    return () => {
      window.removeEventListener("editor:tile-selected", onTile);
      window.removeEventListener("editor:collision-toggle", onCol);
    };
  }, []);

  const toggleCollision = () => {
    if (!tile) return;
    // Direct scene event — dispatching a fake KeyboardEvent to window
    // doesn't reliably reach Phaser's keyboard plugin, which is why the
    // old checkbox only worked the first time.
    emitEditorEvent("editor:toggle-collision", { x: tile.x, y: tile.y });
  };

  // Tint lookup key format matches editorReducer: "{map}:{layer}:{x},{y}"
  const mapId = typeof localStorage !== "undefined" ? (localStorage.getItem("editor_current_map") || "mauville") : "mauville";
  const storageMapId = mapId === "mauville" ? "overworld" : mapId;
  const tintKey = tile ? `${storageMapId}:${tile.layer}:${tile.x},${tile.y}` : "";
  const tintEntry = tile ? state.tileTints[tintKey] : null;

  // Resolve HSL adjustment for slider bindings
  const adj = (() => {
    if (!tintEntry) return { h: 0, s: 0, l: 0, a: 1, rot: 0, flipX: false, flipY: false };
    if (tintEntry.presetId) {
      const preset = state.catalog?.tintPresets?.find((p) => p.id === tintEntry.presetId);
      const base = preset?.adjust ?? { h: 0, s: 0, l: 0, a: 1 };
      return { h: base.h, s: base.s, l: base.l, a: base.a, rot: tintEntry.rot ?? 0, flipX: !!tintEntry.flipX, flipY: !!tintEntry.flipY };
    }
    return {
      h: tintEntry.h ?? 0, s: tintEntry.s ?? 0, l: tintEntry.l ?? 0, a: tintEntry.a ?? 1,
      rot: tintEntry.rot ?? 0, flipX: !!tintEntry.flipX, flipY: !!tintEntry.flipY,
    };
  })();

  const applyAdj = (next: { h: number; s: number; l: number; a: number; rot?: number; flipX?: boolean; flipY?: boolean }) => {
    if (!tile) return;
    const isDefault = next.h === 0 && next.s === 0 && next.l === 0 && next.a === 1 && (next.rot ?? 0) === 0 && !next.flipX && !next.flipY;
    if (isDefault) {
      dispatch({ type: "SET_TILE_TINT", key: tintKey, entry: null });
    } else {
      const entry: any = { h: next.h, s: next.s, l: next.l, a: next.a };
      if (next.rot) entry.rot = next.rot;
      if (next.flipX) entry.flipX = true;
      if (next.flipY) entry.flipY = true;
      dispatch({ type: "SET_TILE_TINT", key: tintKey, entry });
    }
  };

  const copyTileAsBlock = () => {
    if (!tile) return;
    emitEditorEvent("editor:copy-single-tile", { x: tile.x, y: tile.y });
  };

  if (!tile) {
    return (
      <div style={{ width: "100%", height: "100%", background: "#1e1e30", padding: 12, color: "#555", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        Click an entity to inspect it, or click a tile to edit collision / tint / GID.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: "#1e1e30", overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #2a2a40", paddingBottom: 4 }}>
        <span style={{ background: "#4a9eed", color: "#fff", fontSize: 8, padding: "1px 5px", borderRadius: 8, fontWeight: 700, textTransform: "uppercase" }}>
          tile
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, flex: 1, fontFamily: "monospace" }}>
          ({tile.x}, {tile.y})
        </span>
        <button onClick={copyTileAsBlock}
          style={{ fontSize: 9, background: "#1e3a5f", color: "#4a9eed", border: "1px solid #4a4a6a", borderRadius: 3, padding: "3px 8px", cursor: "pointer", fontFamily: "monospace" }}>
          Copy tile
        </button>
      </div>

      <PropSection title="TILE DATA" color="#4a9eed">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, fontSize: 10 }}>
          <span style={{ color: "#888", width: 70, textAlign: "right" }}>GID</span>
          <span style={{ color: "#ccc", fontFamily: "monospace" }}>{gid}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, fontSize: 10 }}>
          <span style={{ color: "#888", width: 70, textAlign: "right" }}>Top sprite</span>
          <span style={{ color: hasTopSprite ? "#22c55e" : "#666" }}>{hasTopSprite ? "yes" : "no"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, fontSize: 10 }}>
          <span style={{ color: "#888", width: 70, textAlign: "right" }}>Layer</span>
          <select value={tile.layer}
            onChange={(e) => setTile({ x: tile.x, y: tile.y, layer: e.target.value as "ground" | "top" })}
            style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3, color: "#ccc", fontSize: 10, padding: "2px 5px" }}>
            <option value="ground">ground</option>
            <option value="top" disabled={!hasTopSprite}>top {hasTopSprite ? "" : "(none)"}</option>
          </select>
        </div>
      </PropSection>

      <PropSection title="COLLISION" color="#ef4444">
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11 }}>
          <input
            type="checkbox"
            checked={blocked}
            onChange={toggleCollision}
            style={{ width: 14, height: 14, accentColor: "#ef4444" }}
          />
          <span style={{ color: blocked ? "#ef4444" : "#aaa" }}>
            {blocked ? "Blocked (player cannot walk)" : "Walkable"}
          </span>
        </label>
        <div style={{ fontSize: 9, color: "#666", marginTop: 4 }}>
          Shortcut: <kbd style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 2, padding: "0 4px", fontFamily: "monospace" }}>C</kbd>
        </div>
      </PropSection>

      <PropSection title="TINT (HSL)" color="#a855f7">
        {[
          { label: "Hue", val: adj.h, min: -180, max: 180, step: 1, after: "°", key: "h" as const, def: 0 },
          { label: "Sat", val: adj.s, min: -1, max: 1, step: 0.05, after: "", key: "s" as const, def: 0 },
          { label: "Light", val: adj.l, min: -1, max: 1, step: 0.05, after: "", key: "l" as const, def: 0 },
          { label: "Alpha", val: adj.a, min: 0, max: 1, step: 0.05, after: "", key: "a" as const, def: 1 },
        ].map((row) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: "#888", width: 45 }}>{row.label}</span>
            <input type="range" min={row.min} max={row.max} step={row.step} value={row.val}
              onChange={(e) => applyAdj({ ...adj, [row.key]: Number(e.target.value) })}
              onDoubleClick={() => applyAdj({ ...adj, [row.key]: row.def })}
              style={{ flex: 1, accentColor: "#a855f7" }} />
            <span style={{ fontSize: 9, color: "#666", width: 40, textAlign: "right", fontFamily: "monospace" }}>
              {row.val.toFixed(2)}{row.after}
            </span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <button onClick={() => applyAdj({ h: 0, s: 0, l: 0, a: 1 })}
            style={{ fontSize: 9, background: "#2a2a40", color: "#aaa", border: "1px solid #3a3a50", borderRadius: 3, padding: "2px 8px", cursor: "pointer" }}>
            Clear tint
          </button>
          {(state.catalog?.tintPresets ?? []).map((p) => (
            <button key={p.id} onClick={() => applyAdj({ h: p.adjust.h, s: p.adjust.s, l: p.adjust.l, a: p.adjust.a })}
              title={p.label}
              style={{ fontSize: 9, background: "#1e1a30", color: "#a855f7", border: "1px solid #3a2a4a", borderRadius: 3, padding: "2px 8px", cursor: "pointer" }}>
              {p.label}
            </button>
          ))}
        </div>
      </PropSection>

      {hasTopSprite && (
        <PropSection title="ROTATE / FLIP (top sprite only)" color="#f59e0b">
          <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
            {[0, 90, 180, 270].map((r) => (
              <button key={r} onClick={() => applyAdj({ ...adj, rot: r })}
                style={{
                  flex: 1, fontSize: 9,
                  background: adj.rot === r ? "#1e3a5f" : "#0d0d1a",
                  color: adj.rot === r ? "#fff" : "#aaa",
                  border: "1px solid " + (adj.rot === r ? "#4a9eed" : "#2a2a40"),
                  borderRadius: 3, padding: "3px 0", cursor: "pointer",
                }}>{r}°</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            <button onClick={() => applyAdj({ ...adj, flipX: !adj.flipX })}
              style={{ flex: 1, fontSize: 9, background: adj.flipX ? "#1e3a5f" : "#0d0d1a", color: adj.flipX ? "#fff" : "#aaa", border: "1px solid #2a2a40", borderRadius: 3, padding: "3px 0", cursor: "pointer" }}>
              Flip X
            </button>
            <button onClick={() => applyAdj({ ...adj, flipY: !adj.flipY })}
              style={{ flex: 1, fontSize: 9, background: adj.flipY ? "#1e3a5f" : "#0d0d1a", color: adj.flipY ? "#fff" : "#aaa", border: "1px solid #2a2a40", borderRadius: 3, padding: "3px 0", cursor: "pointer" }}>
              Flip Y
            </button>
          </div>
        </PropSection>
      )}
    </div>
  );
}

function RightPanel() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const selected = state.entities.find((e) => e.id === state.selectedEntityId);

  const updateField = (field: string, value: any, oldValue: any) => {
    if (selected) {
      dispatch({ type: "UPDATE_FIELD", id: selected.id, field, value, oldValue });
      // Sync position changes to Phaser
      if (field === "x" || field === "y") {
        const newX = field === "x" ? Number(value) : selected.x;
        const newY = field === "y" ? Number(value) : selected.y;
        emitEditorEvent("editor:update-pos", { entityId: selected.id, x: newX, y: newY });
      }
      // Sync facing/sprite changes to Phaser
      if (field === "facingDirection" || field === "spriteKey") {
        emitEditorEvent("editor:update-field", { entityId: selected.id, field, value });
      }
    }
  };

  if (!selected) {
    return <TileInspector />;
  }

  const typeColors: Record<string, string> = {
    npc: "#3b82f6", "pokemon-npc": "#06b6d4", pickup: "#f97316",
    "wild-pokemon": "#22c55e", sign: "#f59e0b", "hidden-item": "#ec4899",
    warp: "#8b5cf6", gate: "#dc2626",
  };

  return (
    <div style={{ width: "100%", height: "100%", background: "#1e1e30", overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #2a2a40", paddingBottom: 4 }}>
        <span style={{
          background: typeColors[selected.type] || "#888", color: "#fff", fontSize: 8,
          padding: "1px 5px", borderRadius: 8, fontWeight: 700, textTransform: "uppercase",
        }}>{selected.type}</span>
        <span style={{ fontSize: 11, fontWeight: 700, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.id}</span>
      </div>

      <PropSection title="POSITION & MOVEMENT" color="#4a9eed">
        <PropField label="ID" value={selected.id} disabled />
        <PropField label="X" value={selected.x} type="number"
          onChange={(v) => updateField("x", Number(v), selected.x)} />
        <PropField label="Y" value={selected.y} type="number"
          onChange={(v) => updateField("y", Number(v), selected.y)} />
        <PropField label="Facing" value={selected.facingDirection} type="select"
          options={["up", "down", "left", "right"]}
          onChange={(v) => updateField("facingDirection", v, selected.facingDirection)} />
        {selected.movementBehavior !== undefined && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: "#888", width: 70, flexShrink: 0, textAlign: "right" }}>Movement</span>
            <select value={selected.movementBehavior} onChange={(e) => updateField("movementBehavior", e.target.value, selected.movementBehavior)}
              style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3, color: "#ccc", fontSize: 10, padding: "2px 4px" }}>
              {(state.catalog?.movementPatterns || []).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
              {/* Fallback: show current value if it's not in the catalog (legacy) */}
              {selected.movementBehavior && !state.catalog?.movementPatterns?.some((p) => p.id === selected.movementBehavior) && (
                <option value={selected.movementBehavior}>{selected.movementBehavior} (legacy)</option>
              )}
            </select>
          </div>
        )}
        {selected.spriteKey !== undefined && (
          <div style={{ marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: "#888", marginBottom: 2, display: "block" }}>Sprite</span>
            <SpritePicker
              value={selected.spriteKey}
              onChange={(v) => updateField("spriteKey", v, selected.spriteKey)}
              sprites={state.availableSprites?.npcs || FALLBACK_NPC_SPRITES}
            />
          </div>
        )}
      </PropSection>

      {(selected.dialog && selected.dialog.length > 0) && (
        <PropSection title={`DIALOG (${selected.dialog.length} slides)`} color="#4a9eed">
          {selected.hasDialogFn && (
            <div style={{ background: "#1a2a1a", border: "1px solid #2a4a2a", borderRadius: 4, padding: "4px 8px", marginBottom: 6, fontSize: 9 }}>
              <span style={{ color: "#f59e0b" }}>Dynamic NPC</span>
              <span style={{ color: "#888" }}> — also has dialogFn (live API). These are the offline fallback lines.</span>
            </div>
          )}
          {selected.dialog.map((line, i) => {
            const pages = Math.ceil(line.length / 105) || 1; // ~35 chars x 3 lines per page
            return (
              <div key={i} style={{
                marginBottom: 4, background: "#0d0d1a", border: "1px solid #2a2a40",
                borderRadius: 4, overflow: "hidden",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "3px 6px", background: "#161628", borderBottom: "1px solid #2a2a40",
                }}>
                  <span style={{ fontSize: 8, color: "#666" }}>Slide {i + 1}</span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {pages > 1 && <span style={{ fontSize: 8, color: "#f59e0b" }}>{pages} pages</span>}
                    {i > 0 && (
                      <span onClick={() => {
                        const d = [...selected.dialog!];
                        [d[i - 1], d[i]] = [d[i], d[i - 1]];
                        updateField("dialog", d, selected.dialog);
                      }} style={{ fontSize: 10, cursor: "pointer", color: "#666" }} title="Move up">↑</span>
                    )}
                    {i < (selected.dialog?.length || 0) - 1 && (
                      <span onClick={() => {
                        const d = [...selected.dialog!];
                        [d[i], d[i + 1]] = [d[i + 1], d[i]];
                        updateField("dialog", d, selected.dialog);
                      }} style={{ fontSize: 10, cursor: "pointer", color: "#666" }} title="Move down">↓</span>
                    )}
                    <span onClick={() => {
                      const d = selected.dialog!.filter((_, j) => j !== i);
                      updateField("dialog", d, selected.dialog);
                    }} style={{ fontSize: 10, cursor: "pointer", color: "#ef4444" }} title="Delete slide">×</span>
                  </div>
                </div>
                <DialogTextarea
                  value={line}
                  onChange={(v) => {
                    const newDialog = [...selected.dialog!];
                    newDialog[i] = v;
                    updateField("dialog", newDialog, selected.dialog);
                  }}
                  placeholder="Enter dialog text... Type {{ for templates"
                />
                {line.includes("{{") && (
                  <TemplatePreview line={line} />
                )}
              </div>
            );
          })}
          <div
            onClick={() => {
              const newDialog = [...(selected.dialog || []), ""];
              updateField("dialog", newDialog, selected.dialog);
            }}
            style={{ fontSize: 9, color: "#4a9eed", cursor: "pointer", marginTop: 2, padding: "2px 0" }}
          >+ Add slide</div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
            <span onClick={() => {
              window.dispatchEvent(new CustomEvent("editor:preview-dialog", { detail: { lines: selected.dialog, speaker: selected.speakerName } }));
            }} style={{ fontSize: 9, color: "#8b5cf6", cursor: "pointer" }}>Preview Dialog</span>
            <span onClick={() => {
              const template = "{{#if badges.count > 4}}You're doing great!{{else}}Keep collecting badges!{{/if}}";
              const newDialog = [...(selected.dialog || []), template];
              updateField("dialog", newDialog, selected.dialog);
            }} style={{ fontSize: 9, color: "#06b6d4", cursor: "pointer" }}>+ Condition Block</span>
          </div>
          {selected.speakerName && (
            <PropField label="Speaker" value={selected.speakerName}
              onChange={(v) => updateField("speakerName", v, selected.speakerName)} />
          )}
        </PropSection>
      )}

      {(selected.text && selected.text.length > 0) && (
        <PropSection title="SIGN TEXT" color="#f59e0b">
          {selected.text.map((line, i) => (
            <div key={i} style={{ marginBottom: 3 }}>
              <textarea
                value={line}
                onChange={(e) => {
                  const newText = [...selected.text!];
                  newText[i] = e.target.value;
                  updateField("text", newText, selected.text);
                }}
                style={{
                  width: "100%", background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3,
                  color: "#ccc", fontSize: 10, padding: "3px 5px", outline: "none", resize: "vertical",
                  fontFamily: "monospace", minHeight: 24, boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </PropSection>
      )}

      {selected.autoGive && (
        <PropSection title="AUTO-GIVE" color="#4a9eed">
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: "#888", width: 70, flexShrink: 0, textAlign: "right" }}>Item</span>
            <select value={selected.autoGive.itemId || ""} onChange={(e) => updateField("autoGive", { ...selected.autoGive, itemId: e.target.value }, selected.autoGive)}
              style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3, color: "#ccc", fontSize: 10, padding: "2px 5px" }}>
              <option value="">-- select --</option>
              {state.catalog?.itemDefinitions.map((it) => (
                <option key={it.id} value={it.id}>{it.name} [{it.pocket}]</option>
              ))}
            </select>
          </div>
          {/* Aside movement chain — relative steps from home. Overrides asideX/Y when set. */}
          <div style={{ marginTop: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: "#888" }}>Aside Steps (after giving item, relative to home)</span>
            </div>
            {(selected.autoGive.asideSteps || []).map((step, i: number) => (
              <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                <select value={step.dir} onChange={(e) => {
                  const steps = [...(selected.autoGive!.asideSteps || [])];
                  steps[i] = { ...steps[i], dir: e.target.value as any };
                  updateField("autoGive", { ...selected.autoGive!, asideSteps: steps }, selected.autoGive);
                }} style={{ background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }}>
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
                <input type="number" min="1" value={step.steps} onChange={(e) => {
                  const steps = [...(selected.autoGive!.asideSteps || [])];
                  steps[i] = { ...steps[i], steps: Number(e.target.value) };
                  updateField("autoGive", { ...selected.autoGive!, asideSteps: steps }, selected.autoGive);
                }} style={{ width: 50, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "1px 3px" }} />
                <span style={{ fontSize: 8, color: "#666" }}>tiles</span>
                <span onClick={() => {
                  if (i > 0) {
                    const steps = [...(selected.autoGive!.asideSteps || [])];
                    [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
                    updateField("autoGive", { ...selected.autoGive!, asideSteps: steps }, selected.autoGive);
                  }
                }} style={{ cursor: i > 0 ? "pointer" : "default", color: i > 0 ? "#4a9eed" : "#333", fontSize: 10 }} title="Move up">↑</span>
                <span onClick={() => {
                  const steps = selected.autoGive!.asideSteps || [];
                  if (i < steps.length - 1) {
                    const newSteps = [...steps];
                    [newSteps[i], newSteps[i + 1]] = [newSteps[i + 1], newSteps[i]];
                    updateField("autoGive", { ...selected.autoGive!, asideSteps: newSteps }, selected.autoGive);
                  }
                }} style={{ cursor: i < (selected.autoGive!.asideSteps!.length - 1) ? "pointer" : "default", color: i < (selected.autoGive!.asideSteps!.length - 1) ? "#4a9eed" : "#333", fontSize: 10 }} title="Move down">↓</span>
                <span onClick={() => {
                  const steps = (selected.autoGive!.asideSteps || []).filter((_, j) => j !== i);
                  updateField("autoGive", { ...selected.autoGive!, asideSteps: steps }, selected.autoGive);
                }} style={{ color: "#ef4444", cursor: "pointer", fontSize: 11, marginLeft: 4 }}>×</span>
              </div>
            ))}
            <span onClick={() => {
              const steps = [...(selected.autoGive!.asideSteps || []), { dir: "up" as const, steps: 1 }];
              updateField("autoGive", { ...selected.autoGive!, asideSteps: steps }, selected.autoGive);
            }} style={{ fontSize: 9, color: "#4a9eed", cursor: "pointer" }}>+ Add step</span>
          </div>
          {/* Fallback absolute position (visible if no asideSteps set) */}
          {(!selected.autoGive.asideSteps || selected.autoGive.asideSteps.length === 0) && selected.autoGive.asideX != null && (
            <div style={{ marginTop: 4, opacity: 0.7 }}>
              <div style={{ fontSize: 8, color: "#666", marginBottom: 2 }}>(Absolute fallback — used only if no steps defined)</div>
              <PropField label="Aside X" value={selected.autoGive.asideX} type="number"
                onChange={(v) => updateField("autoGive", { ...selected.autoGive!, asideX: Number(v) }, selected.autoGive)} />
              <PropField label="Aside Y" value={selected.autoGive.asideY} type="number"
                onChange={(v) => updateField("autoGive", { ...selected.autoGive!, asideY: Number(v) }, selected.autoGive)} />
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 9, color: "#888", marginBottom: 3 }}>Cleared Dialog (after giving item)</div>
            {(selected.autoGive.clearedDialog || []).map((line: string, i: number) => (
              <div key={i} style={{ display: "flex", gap: 4, marginBottom: 3 }}>
                <textarea value={line} onChange={(e) => {
                  const d = [...(selected.autoGive!.clearedDialog || [])];
                  d[i] = e.target.value;
                  updateField("autoGive", { ...selected.autoGive!, clearedDialog: d }, selected.autoGive);
                }} style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3, color: "#ccc", fontSize: 10, padding: "4px 6px", resize: "vertical", minHeight: 24, fontFamily: "monospace" }} />
                <span onClick={() => {
                  const d = (selected.autoGive!.clearedDialog || []).filter((_: any, j: number) => j !== i);
                  updateField("autoGive", { ...selected.autoGive!, clearedDialog: d }, selected.autoGive);
                }} style={{ color: "#ef4444", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>×</span>
              </div>
            ))}
            <span onClick={() => {
              const d = [...(selected.autoGive!.clearedDialog || []), ""];
              updateField("autoGive", { ...selected.autoGive!, clearedDialog: d }, selected.autoGive);
            }} style={{ fontSize: 9, color: "#4a9eed", cursor: "pointer" }}>+ Add line</span>
          </div>
        </PropSection>
      )}

      {selected.pokemon && (
        <PropSection title="POKEMON" color="#22c55e">
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: "#888", width: 70, flexShrink: 0, textAlign: "right" }}>Species</span>
            <img
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selected.pokemon.pokedexNumber}.png`}
              alt="" loading="lazy"
              style={{ width: 32, height: 32, imageRendering: "pixelated", background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3, flexShrink: 0 }}
            />
            <select
              value={selected.pokemon.pokedexNumber}
              onChange={(e) => {
                const dex = Number(e.target.value);
                const sp = POKEMON_SPECIES[dex - 1];
                if (!sp) return;
                updateField("pokemon", {
                  pokedexNumber: sp.dex,
                  speciesName: sp.name,
                  projectName: selected.pokemon?.projectName ?? sp.name,
                }, selected.pokemon);
              }}
              style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3, color: "#ccc", fontSize: 10, padding: "2px 5px" }}
            >
              {POKEMON_SPECIES.map((sp) => (
                <option key={sp.dex} value={sp.dex}>
                  #{String(sp.dex).padStart(3, "0")} {sp.name}
                </option>
              ))}
            </select>
          </div>
          <PropField label="Project" value={selected.pokemon.projectName}
            onChange={(v) => updateField("pokemon", { ...selected.pokemon!, projectName: String(v) }, selected.pokemon)} />
        </PropSection>
      )}

      {selected.type === "warp" && (
        <PropSection title="WARP" color="#8b5cf6">
          <PropField label="Target Map" value={selected.targetMap}
            onChange={(v) => updateField("targetMap", v, selected.targetMap)} />
          <PropField label="Spawn X" value={selected.spawnX} type="number"
            onChange={(v) => updateField("spawnX", Number(v), selected.spawnX)} />
          <PropField label="Spawn Y" value={selected.spawnY} type="number"
            onChange={(v) => updateField("spawnY", Number(v), selected.spawnY)} />
          <PropField label="Facing" value={selected.spawnFacing} type="select" options={["up", "down", "left", "right"]}
            onChange={(v) => updateField("spawnFacing", v, selected.spawnFacing)} />
        </PropSection>
      )}

      {selected.type === "hidden-item" && (
        <PropSection title="HIDDEN ITEM" color="#ec4899">
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: "#888", width: 70, flexShrink: 0, textAlign: "right" }}>Item</span>
            <select value={selected.itemId || ""} onChange={(e) => updateField("itemId", e.target.value, selected.itemId)}
              style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3, color: "#ccc", fontSize: 10, padding: "2px 5px" }}>
              <option value="">-- select --</option>
              {state.catalog?.itemDefinitions.map((it) => (
                <option key={it.id} value={it.id}>{it.name} [{it.pocket}]</option>
              ))}
            </select>
          </div>
          <PropField label="Map" value={selected.map} disabled />
          <PropField label="Difficulty" value={selected.difficulty} type="select"
            options={["easy", "medium", "hard"]}
            onChange={(v) => updateField("difficulty", v, selected.difficulty)} />
          <PropField label="Placement" value={selected.placement} disabled />
        </PropSection>
      )}

      {selected.type === "gate" && (
        <PropSection title="GATE" color="#dc2626">
          <PropField label="Gate Type" value={selected.gateType} disabled />
          <PropField label="NPC ID" value={selected.npcId} disabled />
          {selected.requiredMove && <PropField label="Move" value={selected.requiredMove} disabled />}
        </PropSection>
      )}

      {selected.hasDialogFn && (!selected.dialog || selected.dialog.length === 0) && (
        <div style={{ background: "#2a1a1a", borderRadius: 5, padding: "4px 8px", fontSize: 9, color: "#f59e0b" }}>
          ⚠ Has dynamic dialogFn — edit in source code
        </div>
      )}
      {/* KOSTAS dialog branch editor */}
      {selected.id === "gym_kostas" && <KostasDialogEditor />}
      {selected.hasSpawnCondition && (
        <div style={{ background: "#2a1a1a", borderRadius: 5, padding: "4px 8px", fontSize: 9, color: "#f59e0b" }}>
          ⚠ Has spawnCondition — edit in source code
        </div>
      )}

      <PropSection title="SOURCE" color="#666">
        <PropField label="File" value={selected.sourceFile} disabled />
        {selected.sourceOffset && <div style={{ fontSize: 9, color: "#666", paddingLeft: 76 }}>Has +50 offset</div>}
      </PropSection>

      <PropSection title="RELATIONSHIPS" color="#06b6d4">
        {(() => {
          // Compute zone from position
          const x = selected.x; const y = selected.y;
          const zone = x >= 50 && x < 90 && y >= 50 && y < 70 ? "Mauville City"
            : x < 50 ? "Route 117" : x >= 90 ? "Route 118"
            : y < 50 ? "Route 111" : y >= 70 ? "Route 110" : "Unknown";
          // Compute badge contribution
          const badges: string[] = [];
          if (selected.autoGive) badges.push("CONNECTED (key item)");
          if (selected.pokemon) badges.push("POKEDEX (encounter)");
          if (selected.type === "npc" && selected.dialog?.some(d => d.length > 50)) badges.push("BLOGGER (potential)");

          // Count same-type entities
          const sameType = state.entities.filter(e => e.type === selected.type).length;

          return (
            <>
              <div style={{ fontSize: 10, color: "#ccc", padding: "0 0 2px" }}>Zone: <span style={{ color: "#4a9eed" }}>{zone}</span></div>
              <div style={{ fontSize: 10, color: "#ccc" }}>Same type: {sameType} total</div>
              {badges.length > 0 && (
                <div style={{ fontSize: 10, color: "#ccc", marginTop: 2 }}>
                  Contributes to: {badges.map((b, i) => <span key={i} style={{ color: "#f59e0b", fontSize: 9 }}>{i > 0 ? ", " : ""}{b}</span>)}
                </div>
              )}
            </>
          );
        })()}
      </PropSection>
    </div>
  );
}

/** Checkpoints tab — save/restore entity state snapshots */
function CheckpointsTab() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const [diffView, setDiffView] = useState<{ cpName: string; added: any[]; removed: any[]; moved: any[] } | null>(null);
  const [checkpoints, setCheckpoints] = useState<{ name: string; time: string; count: number; data: any[] }[]>(() => {
    try {
      const saved = localStorage.getItem("editor_checkpoints");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const saveCheckpoint = () => {
    const name = `Checkpoint ${checkpoints.length + 1}`;
    const cp = { name, time: new Date().toLocaleTimeString(), count: state.entities.length, data: JSON.parse(JSON.stringify(state.entities)) };
    const next = [cp, ...checkpoints].slice(0, 20);
    setCheckpoints(next);
    localStorage.setItem("editor_checkpoints", JSON.stringify(next));
  };

  const restoreCheckpoint = (index: number) => {
    dispatch({ type: "LOAD_DATA", entities: checkpoints[index].data });
  };

  const deleteCheckpoint = (index: number) => {
    const next = checkpoints.filter((_, i) => i !== index);
    setCheckpoints(next);
    localStorage.setItem("editor_checkpoints", JSON.stringify(next));
  };

  return (
    <div style={{ padding: "6px 10px", display: "flex", gap: 8, flex: 1 }}>
      <div>
        <button onClick={saveCheckpoint} style={{
          background: "#4a9eed", color: "#fff", border: "none", borderRadius: 4,
          padding: "4px 12px", fontSize: 9, fontWeight: 700, cursor: "pointer", marginBottom: 4,
        }}>Save Checkpoint</button>
        <div style={{ fontSize: 8, color: "#666" }}>{state.entities.length} entities, {state.undoStack.length} changes</div>
      </div>
      {diffView && (
        <div style={{ background: "#161628", borderRadius: 4, padding: 6, margin: "0 0 4px", maxHeight: 60, overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: "#4a9eed" }}>Diff: {diffView.cpName}</span>
            <span onClick={() => setDiffView(null)} style={{ fontSize: 8, color: "#666", cursor: "pointer" }}>close</span>
          </div>
          {diffView.added.map((e: any) => <div key={e.id} style={{ fontSize: 8, color: "#22c55e" }}>+ {e.id}</div>)}
          {diffView.removed.map((e: any) => (
            <div key={e.id} style={{ fontSize: 8, color: "#ef4444", display: "flex", gap: 4 }}>
              <span>- {e.id}</span>
              <span onClick={() => dispatch({ type: "ADD_ENTITY", entity: e })} style={{ color: "#4a9eed", cursor: "pointer" }}>restore</span>
            </div>
          ))}
          {diffView.moved.map((e: any) => (
            <div key={e.id} style={{ fontSize: 8, color: "#f59e0b", display: "flex", gap: 4 }}>
              <span>~ {e.id} moved</span>
              <span onClick={() => {
                dispatch({ type: "MOVE_ENTITY", id: e.id, x: e.x, y: e.y, oldX: state.entities.find(c => c.id === e.id)?.x || 0, oldY: state.entities.find(c => c.id === e.id)?.y || 0 });
              }} style={{ color: "#4a9eed", cursor: "pointer" }}>revert</span>
            </div>
          ))}
          {diffView.added.length + diffView.removed.length + diffView.moved.length === 0 && <div style={{ fontSize: 8, color: "#22c55e" }}>No changes</div>}
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {checkpoints.length === 0 && <div style={{ fontSize: 9, color: "#555" }}>No checkpoints saved</div>}
        {checkpoints.map((cp, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0", fontSize: 9 }}>
            <span style={{ color: "#ccc" }}>{cp.name}</span>
            <span style={{ color: "#555" }}>{cp.time}</span>
            <span style={{ color: "#666" }}>({cp.count})</span>
            <span onClick={() => restoreCheckpoint(i)} style={{ color: "#22c55e", cursor: "pointer" }}>Restore</span>
            <span onClick={() => {
              const cpEntities = new Set(cp.data.map((e: any) => e.id));
              const curEntities = new Set(state.entities.map(e => e.id));
              const added = state.entities.filter(e => !cpEntities.has(e.id));
              const removed = cp.data.filter((e: any) => !curEntities.has(e.id));
              const moved = cp.data.filter((e: any) => {
                const cur = state.entities.find(c => c.id === e.id);
                return cur && (cur.x !== e.x || cur.y !== e.y);
              });
              setDiffView({ cpName: cp.name, added, removed, moved });
            }} style={{ color: "#4a9eed", cursor: "pointer" }}>Diff</span>
            <span onClick={() => deleteCheckpoint(i)} style={{ color: "#ef4444", cursor: "pointer" }}>×</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Debug launcher — launch game from a specific state */
function DebugLauncherTab() {
  const state = useEditorState();
  const [playerName, setPlayerName] = useState("RED");
  const [badges, setBadges] = useState(0);
  const [steps, setSteps] = useState(0);

  const launchGame = (spawnX?: number, spawnY?: number) => {
    const debugSave = {
      playerName,
      badges: Array.from({ length: badges }, (_, i) => `badge_${i}`),
      steps,
      spawnOverride: spawnX !== undefined ? { x: spawnX, y: spawnY } : undefined,
    };
    localStorage.setItem("__editor_debug_save", JSON.stringify(debugSave));
    window.open("/explore", "_blank");
  };

  const selected = state.entities.find((e) => e.id === state.selectedEntityId);

  return (
    <div style={{ padding: "6px 10px", display: "flex", gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#8b5cf6", marginBottom: 4 }}>PLAYER STATE</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, color: "#666", marginBottom: 2 }}>Name</div>
            <input value={playerName} onChange={(e) => setPlayerName(e.target.value)}
              style={{ width: "100%", background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3, color: "#ccc", fontSize: 10, padding: "2px 5px", boxSizing: "border-box" }} />
          </div>
          <div style={{ width: 60 }}>
            <div style={{ fontSize: 8, color: "#666", marginBottom: 2 }}>Badges</div>
            <input type="number" min={0} max={8} value={badges} onChange={(e) => setBadges(Number(e.target.value))}
              style={{ width: "100%", background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3, color: "#ccc", fontSize: 10, padding: "2px 5px", boxSizing: "border-box" }} />
          </div>
          <div style={{ width: 60 }}>
            <div style={{ fontSize: 8, color: "#666", marginBottom: 2 }}>Steps</div>
            <input type="number" min={0} value={steps} onChange={(e) => setSteps(Number(e.target.value))}
              style={{ width: "100%", background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 3, color: "#ccc", fontSize: 10, padding: "2px 5px", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {[
            { label: "Fresh Start", b: 0, s: 0 },
            { label: "Mid-game", b: 4, s: 500 },
            { label: "Near Champion", b: 7, s: 2000 },
            { label: "All Badges", b: 8, s: 5000 },
          ].map((preset) => (
            <span key={preset.label} onClick={() => { setBadges(preset.b); setSteps(preset.s); }}
              style={{ fontSize: 8, color: "#4a9eed", cursor: "pointer", background: "#161628", padding: "2px 6px", borderRadius: 3 }}>
              {preset.label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#8b5cf6", marginBottom: 4 }}>SOUND PREVIEW</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["mauville", "route110", "route111", "gym", "pokecenter", "mart"].map((track) => (
            <span key={track} onClick={() => {
              const ext = ["mauville", "route110"].includes(track) ? "mp3" : "ogg";
              const audio = new Audio(`/game/audio/bgm/mus_${track}.${ext}`);
              audio.volume = 0.3;
              audio.play().catch(() => {});
              setTimeout(() => audio.pause(), 10000); // Stop after 10s
            }} style={{ fontSize: 8, color: "#4a9eed", cursor: "pointer", background: "#161628", padding: "2px 6px", borderRadius: 3 }}>
              {track}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
        <button onClick={() => launchGame()} style={{
          background: "#22c55e", color: "#000", border: "none", borderRadius: 4, padding: "6px 16px",
          fontSize: 10, fontWeight: 700, cursor: "pointer",
        }}>LAUNCH GAME</button>
        {selected && (
          <button onClick={() => launchGame(selected.x, selected.y)} style={{
            background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 4, padding: "4px 12px",
            fontSize: 9, cursor: "pointer",
          }}>PLAY FROM ({selected.x}, {selected.y})</button>
        )}
      </div>
    </div>
  );
}

/** Bottom panel — Problems with validation */
function BottomPanel() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const [bottomTab, setBottomTab] = useState<"problems" | "debug" | "checkpoints">("problems");
  const [problems, setProblems] = useState<{ severity: "error" | "warning" | "info"; message: string; entityId?: string }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const runValidation = () => {
    const results: typeof problems = [];

    // Client-side validation rules
    const ids = state.entities.map((e) => e.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    for (const d of dupes) results.push({ severity: "error", message: `Duplicate ID: ${d}`, entityId: d });

    for (const e of state.entities) {
      if (e.x < 0 || e.x >= 140 || e.y < 0 || e.y >= 120) {
        results.push({ severity: "error", message: `Out of bounds (${e.x}, ${e.y})`, entityId: e.id });
      }
      if (e.type === "sign" && (!e.text || e.text.length === 0)) {
        results.push({ severity: "warning", message: "Sign has no text", entityId: e.id });
      }
      if (e.type === "npc" && !e.spriteKey) {
        results.push({ severity: "warning", message: "NPC missing sprite", entityId: e.id });
      }
      if (e.type === "warp" && !e.targetMap) {
        results.push({ severity: "warning", message: "Warp missing target map", entityId: e.id });
      }
      if (e.type === "gate" && (e.x === undefined || e.y === undefined)) {
        results.push({ severity: "info", message: "Gate has no position", entityId: e.id });
      }
    }

    if (results.length === 0) {
      results.push({ severity: "info", message: `All ${state.entities.length} entities valid` });
    }

    setProblems(results);
  };

  const runAnalyzer = async () => {
    setAnalyzing(true);
    try {
      const r = await fetch("/api/editor/analyze", { method: "POST" });
      const data = await r.json();
      if (data.analysis) {
        const results: typeof problems = [];
        if (data.analysis.unreachable?.length) {
          for (const u of data.analysis.unreachable) {
            results.push({ severity: "error", message: `Unreachable: ${u.id} at (${u.x}, ${u.y})`, entityId: u.id });
          }
        }
        if (data.analysis.onCollision?.length) {
          for (const c of data.analysis.onCollision) {
            results.push({ severity: "error", message: `On collision tile: ${c.id}`, entityId: c.id });
          }
        }
        setProblems((prev) => [...prev, ...results]);
      }
    } catch (e) {
      console.error("Analyzer failed:", e);
    }
    setAnalyzing(false);
  };

  // Run validation on mount
  useEffect(() => { runValidation(); }, [state.entities]);

  const errors = problems.filter((p) => p.severity === "error").length;
  const warnings = problems.filter((p) => p.severity === "warning").length;

  return (
    <div style={{ height: 140, background: "#1e1e30", borderTop: "1px solid #2a2a40", flexShrink: 0, display: "flex", flexDirection: "column" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0, borderBottom: "1px solid #2a2a40" }}>
        {(["problems", "debug", "checkpoints"] as const).map((tab) => {
          const colors: Record<string, string> = { problems: "#ef4444", debug: "#8b5cf6", checkpoints: "#4a9eed" };
          const labels: Record<string, string> = { problems: "PROBLEMS", debug: "DEBUG", checkpoints: "CHECKPOINTS" };
          return (
            <div key={tab} onClick={() => setBottomTab(tab)} style={{
              padding: "4px 12px", fontSize: 10, fontWeight: 600, cursor: "pointer",
              color: bottomTab === tab ? colors[tab] : "#666",
              borderBottom: bottomTab === tab ? `2px solid ${colors[tab]}` : "2px solid transparent",
            }}>
              {labels[tab]}
              {tab === "problems" && errors > 0 && <span style={{ fontSize: 8, color: "#ef4444", background: "#2a1a1a", padding: "0 4px", borderRadius: 8, marginLeft: 4 }}>{errors}</span>}
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
        {bottomTab === "problems" && (
          <>
            <span onClick={runValidation} style={{ fontSize: 9, color: "#4a9eed", cursor: "pointer", padding: "4px 6px" }}>Refresh</span>
            <span onClick={runAnalyzer} style={{ fontSize: 9, color: "#4a9eed", cursor: "pointer", padding: "4px 6px" }}>
              {analyzing ? "Analyzing..." : "Run Analyzer"}
            </span>
          </>
        )}
      </div>
      {/* Problems tab content */}
      {bottomTab === "problems" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 10px", minHeight: 0 }}>
          {problems.map((p, i) => (
            <div
              key={i}
              onClick={() => {
                if (p.entityId) {
                  dispatch({ type: "SELECT_ENTITY", id: p.entityId });
                  const entity = state.entities.find((e) => e.id === p.entityId);
                  if (entity) emitEditorEvent(JUMP_TO_TILE, { x: entity.x, y: entity.y });
                }
              }}
              style={{
                fontSize: 10, padding: "2px 0", cursor: p.entityId ? "pointer" : "default",
                color: p.severity === "error" ? "#ef4444" : p.severity === "warning" ? "#f59e0b" : "#22c55e",
                display: "flex", gap: 4,
              }}
            >
              <span>{p.severity === "error" ? "✗" : p.severity === "warning" ? "⚠" : "✓"}</span>
              <span>{p.message}</span>
            </div>
          ))}
        </div>
      )}
      {/* Debug launcher tab content */}
      {bottomTab === "debug" && <DebugLauncherTab />}
      {/* Checkpoints tab content */}
      {bottomTab === "checkpoints" && <CheckpointsTab />}
    </div>
  );
}

/** Status bar */
/**
 * Command Palette — ⌘K opens a floating fuzzy search over every editor
 * action, every entity (by id / name), every tint preset, every map,
 * and every saved swatch. Arrow keys navigate, Enter runs, Esc closes.
 *
 * Modelled after VS Code's ⌘⇧P / Figma's ⌘P: the one discoverability
 * mechanism that scales as the editor grows.
 */
interface CmdItem {
  id: string;
  label: string;
  hint?: string;      // right-aligned subtitle
  category: string;
  /** Optional thumbnail URL rendered to the left of the label. */
  iconUrl?: string;
  run: () => void;
}

function CommandPalette({
  items, onClose,
}: {
  items: CmdItem[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Simple fuzzy ranking: case-insensitive substring + word-start bonus.
  const normalized = query.trim().toLowerCase();
  const filtered = normalized.length === 0
    ? items.slice(0, 40)
    : items
        .map((it) => {
          const label = it.label.toLowerCase();
          const hit = label.indexOf(normalized);
          if (hit < 0) {
            const catHit = it.category.toLowerCase().indexOf(normalized);
            if (catHit < 0) return null;
            return { it, score: 1000 + catHit };
          }
          const wordBonus = hit === 0 || /\s/.test(label[hit - 1]) ? 0 : 50;
          return { it, score: hit + wordBonus };
        })
        .filter((x): x is { it: CmdItem; score: number } => x !== null)
        .sort((a, b) => a.score - b.score)
        .map((x) => x.it)
        .slice(0, 40);

  useEffect(() => { setActive(0); }, [normalized]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[active];
      if (item) { item.run(); onClose(); }
    }
  };

  // Group the unfiltered (recent/common) view by category for readability.
  const grouped = (() => {
    const groups: Record<string, CmdItem[]> = {};
    for (const it of filtered) {
      (groups[it.category] ||= []).push(it);
    }
    return Object.entries(groups);
  })();

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998 }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          width: 540, maxHeight: "70vh",
          background: "#1a1a30", border: "1px solid #4a4a6a", borderRadius: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          zIndex: 9999, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Type to search — actions · entities · presets · maps · swatches"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          style={{
            background: "#0f0f1e", border: "none", borderBottom: "1px solid #3a3a50",
            padding: "14px 18px", fontSize: 14, color: "#fff",
            outline: "none", fontFamily: "inherit",
          }}
        />
        <div style={{ overflowY: "auto", maxHeight: "60vh" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "14px 18px", fontSize: 12, color: "#666" }}>
              No matches — try a different query.
            </div>
          )}
          {normalized.length === 0
            ? grouped.map(([cat, list]) => (
                <div key={cat}>
                  <div style={{ padding: "6px 12px 2px", fontSize: 9, color: "#6a8fbf", textTransform: "uppercase", letterSpacing: 0.6 }}>{cat}</div>
                  {list.map((it) => {
                    const idx = filtered.indexOf(it);
                    return (
                      <CmdRow key={it.id} item={it} active={idx === active} onRun={() => { it.run(); onClose(); }}
                        onHover={() => setActive(idx)} />
                    );
                  })}
                </div>
              ))
            : filtered.map((it, idx) => (
                <CmdRow key={it.id} item={it} active={idx === active} onRun={() => { it.run(); onClose(); }}
                  onHover={() => setActive(idx)} />
              ))
          }
        </div>
      </div>
    </>
  );
}

/**
 * Build the searchable item set for the command palette. Combines:
 *  - editor-wide actions (save, undo, redo, export, layer toggles, …)
 *  - every entity (jump-to-tile and select)
 *  - every map (switch)
 *  - every tint preset (apply to current selection)
 *  - every layer (toggle visibility)
 */
function buildPaletteItems(opts: {
  state: ReturnType<typeof useEditorState>;
  dispatch: ReturnType<typeof useEditorDispatch>;
  jumpTo: (x: number, y: number) => void;
  switchMap: (id: string) => void;
  triggerSave: () => void;
  exportPng: () => void;
  fitMap: () => void;
  magicWand: () => void;
  openTint: () => void;
  zoom100: () => void;
  showHistory: () => void;
  showRelationships: () => void;
  toggleLayer: (layer: string) => void;
  applySpecies: (sp: PokemonSpecies) => void;
  startPlacement: (p: any) => void;
}): CmdItem[] {
  const { state, dispatch } = opts;
  const items: CmdItem[] = [];

  // Edit / file actions
  items.push(
    { id: "save", label: "Save", category: "Action", hint: "⌘S", run: opts.triggerSave },
    { id: "undo", label: "Undo", category: "Action", hint: "⌘Z", run: () => dispatch({ type: "UNDO" }) },
    { id: "redo", label: "Redo", category: "Action", hint: "⌘⇧Z", run: () => dispatch({ type: "REDO" }) },
    { id: "export-png", label: "Export map as PNG", category: "Action", run: opts.exportPng },
    { id: "fit", label: "Fit map to viewport", category: "Navigation", hint: "0", run: opts.fitMap },
    { id: "zoom-100", label: "Reset zoom (100%)", category: "Navigation", hint: "1", run: opts.zoom100 },
    { id: "magic-wand", label: "Magic wand — select all same GID", category: "Tile", hint: "W", run: opts.magicWand },
    { id: "open-tint", label: "Open tint popup", category: "Tile", hint: "T", run: opts.openTint },
    { id: "show-history", label: "Show edit history", category: "View", run: opts.showHistory },
    { id: "show-relationships", label: "Show entity relationships", category: "View", run: opts.showRelationships },
    { id: "deselect", label: "Deselect all", category: "Action", hint: "Esc", run: () => dispatch({ type: "DESELECT" }) },
  );

  // Layer toggles
  for (const layer of ["grid", "collision", "foreground", "entities", "zones", "movement", "heatmap"]) {
    const visible = state.layers[layer as keyof typeof state.layers];
    items.push({
      id: `layer-${layer}`,
      label: `${visible ? "Hide" : "Show"} layer: ${layer}`,
      category: "Layer",
      run: () => opts.toggleLayer(layer),
    });
  }

  // Maps
  const maps = [
    { id: "mauville", label: "Mauville (overworld)" },
    { id: "pokecenter", label: "Pokémon Center" },
    { id: "mart", label: "Mart" },
    { id: "gym", label: "Gym" },
  ];
  for (const m of maps) {
    items.push({
      id: `map-${m.id}`,
      label: `Switch to map: ${m.label}`,
      category: "Map",
      run: () => {
        opts.switchMap(m.id);
        try { localStorage.setItem("editor_current_map", m.id); } catch {}
      },
    });
  }

  // Entities — jump + select
  for (const e of state.entities) {
    items.push({
      id: `entity-${e.id}`,
      label: `Go to entity: ${e.id}`,
      category: "Entity",
      hint: `${e.type} · (${e.x}, ${e.y})`,
      run: () => {
        opts.jumpTo(e.x, e.y);
        dispatch({ type: "SELECT_ENTITY", id: e.id });
      },
    });
  }

  // Tint presets — apply to current popup-selected tiles, if any
  const presets = state.catalog?.tintPresets ?? [];
  for (const p of presets) {
    items.push({
      id: `preset-${p.id}`,
      label: `Apply tint preset: ${p.label}`,
      category: "Tint",
      run: () => {
        // The tint multi-select highlights drive what gets tinted via the
        // existing tint popup. With no selection this is a no-op; we still
        // surface the preset so users can browse them.
        dispatch({ type: "ADD_CATALOG_ENTRY", dataType: "tintPresets", entry: p });
      },
    });
  }

  // All 386 Gen 1–3 pokémon — searchable by name or dex number.
  for (const sp of POKEMON_SPECIES) {
    items.push({
      id: `species-${sp.dex}`,
      label: `${sp.name} (#${String(sp.dex).padStart(3, "0")})`,
      category: "Pokémon",
      hint: `Gen ${sp.dex <= 151 ? 1 : sp.dex <= 251 ? 2 : 3}`,
      iconUrl: sp.spriteUrl,
      run: () => opts.applySpecies(sp),
    });
    items.push({
      id: `wild-${sp.dex}`,
      label: `Wild ${sp.name} (#${String(sp.dex).padStart(3, "0")})`,
      category: "Wild encounter",
      iconUrl: sp.spriteUrl,
      run: () => opts.startPlacement({ kind: "wild-pokemon", species: sp }),
    });
  }

  // Portfolio pokédex — the OG entries. Each is tied to a species slug
  // and resolves to a PokeAPI sprite via that slug's dex number.
  const pokedex = state.catalog?.pokedex ?? [];
  const slugToDex = new Map<string, number>(POKEMON_SPECIES.map((s) => [s.slug, s.dex]));
  for (const p of pokedex) {
    const dex = slugToDex.get(p.pokemon) ?? p.number;
    const sprite = dex > 0 && dex <= POKEMON_SPECIES.length
      ? POKEMON_SPECIES[dex - 1]?.spriteUrl
      : undefined;
    items.push({
      id: `pokedex-${p.number}`,
      label: `${p.name} · ${p.pokemon} (#${p.number})`,
      category: "Portfolio pokédex",
      hint: `${p.level} · ${p.types.join("/")}`,
      iconUrl: sprite,
      run: () => opts.startPlacement({
        kind: "pokedex-entry",
        pokedexNumber: dex,
        name: p.name,
        pokemon: p.pokemon,
      }),
    });
  }

  // NPC sprites — every available overworld sprite is a placement target.
  const npcSprites = state.availableSprites?.npcs ?? [];
  for (const spriteKey of npcSprites) {
    items.push({
      id: `npc-${spriteKey}`,
      label: `NPC: ${spriteKey}`,
      category: "Place NPC",
      iconUrl: `/game/sprites/emerald/${spriteKey}.png`,
      run: () => opts.startPlacement({ kind: "npc", spriteKey }),
    });
  }

  // Items (pickup + hidden). Each catalog item becomes two palette rows:
  // visible pickup and hidden-item variant.
  const items_ = state.catalog?.itemDefinitions ?? [];
  for (const it of items_) {
    items.push({
      id: `item-${it.id}`,
      label: `Item: ${it.name}`,
      category: "Place pickup",
      hint: it.pocket,
      run: () => opts.startPlacement({ kind: "item", itemId: it.id, itemName: it.name, itemIcon: it.icon }),
    });
    items.push({
      id: `hidden-${it.id}`,
      label: `Hidden: ${it.name}`,
      category: "Place hidden item",
      hint: it.pocket,
      run: () => opts.startPlacement({ kind: "hidden-item", itemId: it.id, itemName: it.name }),
    });
  }

  // Miscellaneous placeables with no catalog — just kind.
  items.push(
    { id: "place-sign", label: "Place sign", category: "Place", hint: "edit text after", run: () => opts.startPlacement({ kind: "sign" }) },
    { id: "place-warp", label: "Place warp", category: "Place", hint: "configure target after", run: () => opts.startPlacement({ kind: "warp" }) },
    { id: "place-gate", label: "Place gate", category: "Place", hint: "configure after", run: () => opts.startPlacement({ kind: "gate" }) },
  );

  return items;
}

function CmdRow({ item, active, onRun, onHover }: { item: CmdItem; active: boolean; onRun: () => void; onHover: () => void; }) {
  return (
    <div
      onClick={onRun}
      onMouseEnter={onHover}
      style={{
        padding: "8px 18px", fontSize: 12,
        background: active ? "#2a3a5a" : "transparent",
        color: active ? "#fff" : "#ccc",
        cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 8,
        borderLeft: active ? "2px solid #4a9eed" : "2px solid transparent",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {item.iconUrl && (
          <img src={item.iconUrl} alt="" loading="lazy"
            style={{ width: 24, height: 24, imageRendering: "pixelated", flexShrink: 0 }} />
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
      </span>
      <span style={{ fontSize: 9, color: active ? "#9abcd6" : "#666", fontFamily: "monospace", flexShrink: 0 }}>{item.hint || item.category}</span>
    </div>
  );
}

/**
 * Contextual modifier bar — sits under the main toolbar and shows what
 * the currently-held modifier key does. The unified Edit mode is driven
 * by ⌘/⌥/⇧ so users need a constant reminder of what each one means.
 * Mirrors Adobe's tool-options bar pattern (which changes per active tool).
 */
function ModifierBar() {
  const [mod, setMod] = useState<"cmd" | "alt" | "shift" | "cmdShift" | "none">("none");
  const [pickedGid, setPickedGid] = useState(0);
  const [hasBlock, setHasBlock] = useState(false);
  const [hasTintSelection, setHasTintSelection] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent | MouseEvent) => {
      const anyEv = e as KeyboardEvent & MouseEvent;
      const meta = anyEv.metaKey || anyEv.ctrlKey;
      const alt = anyEv.altKey;
      const shift = anyEv.shiftKey;
      if (meta && shift) setMod("cmdShift");
      else if (meta) setMod("cmd");
      else if (alt) setMod("alt");
      else if (shift) setMod("shift");
      else setMod("none");
    };
    const poll = () => {
      const g = (window as any).__EDITOR_GAME__;
      const s = g?.scene?.getScene("EditorScene");
      if (s) {
        setPickedGid(s.selectedTileGid ?? 0);
        setHasBlock(!!s.blockSelection);
        setHasTintSelection((s.tintHighlights?.size ?? 0) > 0);
      }
    };
    poll();
    const h = setInterval(poll, 250);
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handler);
    window.addEventListener("mousemove", handler);
    return () => {
      clearInterval(h);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", handler);
      window.removeEventListener("mousemove", handler);
    };
  }, []);

  const thumbBg = pickedGid > 0
    ? {
        background: `url("/game/tilesets/mauville_bottom.png") no-repeat`,
        backgroundPosition: `-${((pickedGid - 1) % 16) * 16}px -${Math.floor((pickedGid - 1) / 16) * 16}px`,
        imageRendering: "pixelated" as const,
      }
    : { background: "#1a1a30" };

  // Each modifier surfaces a different sentence of hints
  let hint: React.ReactNode;
  let color = "#888";
  switch (mod) {
    case "cmd":
      color = "#4ade80";
      hint = <>
        <kbd>⌘+Click</kbd> paint · <kbd>⌘+Drag</kbd> stroke
        {hasBlock && <> · <kbd>⌘+Drag</kbd> paint-paste block</>}
        {" · "}Current GID
        <span style={{ display: "inline-block", width: 14, height: 14, marginLeft: 4, border: "1px solid #4a4a6a", ...thumbBg }} />
        <span style={{ marginLeft: 4 }}>{pickedGid || "— (click a tile first)"}</span>
      </>;
      break;
    case "alt":
      color = "#ef4444";
      hint = <><kbd>⌥+Click</kbd> erase · <kbd>⌥+Drag</kbd> erase stroke</>;
      break;
    case "shift":
      color = "#60a5fa";
      hint = <>
        <kbd>⇧+Click</kbd> add to tint selection · <kbd>⇧+Drag</kbd> copy block (2+ tiles)
        {hasTintSelection && <> · <kbd>T</kbd> open tint popup for selection</>}
      </>;
      break;
    case "cmdShift":
      color = "#f59e0b";
      hint = <><kbd>⌘⇧+Click</kbd> flood fill region with current GID</>;
      break;
    default:
      hint = <>
        <kbd>Click</kbd> pick GID / select entity · <kbd>Drag</kbd> pan ·{" "}
        <kbd>⌘</kbd> paint · <kbd>⌥</kbd> erase · <kbd>⇧</kbd> multi-select ·{" "}
        <kbd>W</kbd> wand · <kbd>T</kbd> tint · <kbd>C</kbd> collision · <kbd>⌘K</kbd> palette
      </>;
  }

  return (
    <div style={{
      height: 22, background: "#222238",
      borderBottom: "1px solid #3a3a50",
      display: "flex", alignItems: "center",
      padding: "0 10px", fontSize: 10,
      color, fontFamily: "monospace",
      whiteSpace: "nowrap", overflow: "hidden",
      flexShrink: 0,
    }}>
      <style>{`
        kbd { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
              border-radius: 2px; padding: 0 4px; font-size: 9px;
              font-family: monospace; margin: 0 2px; color: #eee; }
      `}</style>
      {hint}
    </div>
  );
}

/**
 * Status bar — always-visible bottom strip with zoom %, cursor tile
 * coords, the currently picked GID (thumbnail), entity + tint counts,
 * save state, and map name. Modeled after Adobe's bottom status bar:
 * every segment is a contextual affordance.
 */
function StatusBar() {
  const state = useEditorState();
  const [zoom, setZoom] = useState(1);
  const [cursorTile, setCursorTile] = useState<{ x: number; y: number } | null>(null);
  const [pickedGid, setPickedGid] = useState(0);
  const [mapId, setMapId] = useState<string>(() =>
    typeof localStorage !== "undefined" ? (localStorage.getItem("editor_current_map") || "mauville") : "mauville",
  );
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Poll scene state every 200ms — cheap and avoids threading events for
  // every frame of a zoom drag.
  useEffect(() => {
    const tick = () => {
      const g = (window as any).__EDITOR_GAME__;
      const scene = g?.scene?.getScene("EditorScene");
      if (scene) {
        setZoom(scene.currentZoom ?? 1);
        setPickedGid(scene.selectedTileGid ?? 0);
      }
    };
    tick();
    const h = setInterval(tick, 200);
    return () => clearInterval(h);
  }, []);

  // Hover tile tracking (same event the hover badge listens to)
  useEffect(() => {
    const onHover = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setCursorTile(d ? { x: d.x, y: d.y } : null);
    };
    const onSwitch = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.mapId) setMapId(d.mapId);
    };
    const onSaved = () => setLastSavedAt(Date.now());
    window.addEventListener("editor:hover-tile", onHover);
    window.addEventListener(SWITCH_MAP, onSwitch);
    window.addEventListener("editor:saved", onSaved);
    return () => {
      window.removeEventListener("editor:hover-tile", onHover);
      window.removeEventListener(SWITCH_MAP, onSwitch);
      window.removeEventListener("editor:saved", onSaved);
    };
  }, []);

  const tintCount = Object.keys(state.tileTints).length;
  const entityCount = state.entities.length;
  const zoomPct = `${Math.round(zoom * 100)}%`;
  const mapLabel = mapId === "mauville" ? "Mauville" : mapId.charAt(0).toUpperCase() + mapId.slice(1);
  const savedAgo = lastSavedAt
    ? (() => {
        const s = Math.floor((Date.now() - lastSavedAt) / 1000);
        if (s < 5) return "just now";
        if (s < 60) return `${s}s ago`;
        return `${Math.floor(s / 60)}m ago`;
      })()
    : "never";

  const Sep = () => <span style={{ width: 1, height: 10, background: "#444", margin: "0 6px" }} />;

  return (
    <div style={{
      height: 22, background: "#2d2d44", display: "flex", alignItems: "center",
      padding: "0 10px", fontSize: 10, color: "#aaa",
      borderTop: "1px solid #3a3a50", flexShrink: 0, gap: 0,
      fontFamily: "monospace",
    }}>
      {/* Zoom — clickable to reset */}
      <span
        title="Zoom (click = 100%, shift-click = fit)"
        style={{ cursor: "pointer", color: "#ccc", minWidth: 44, textAlign: "left" }}
        onClick={(e) => {
          if (e.shiftKey) emitEditorEvent("editor:fit-map", {});
          else window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
        }}
      >{zoomPct}</span>
      <Sep />

      {/* Cursor coords */}
      <span style={{ minWidth: 80, color: cursorTile ? "#ccc" : "#555" }}>
        {cursorTile ? `Tile ${cursorTile.x}, ${cursorTile.y}` : "—"}
      </span>
      <Sep />

      {/* Picked GID thumbnail + number */}
      <span style={{ color: "#ccc", display: "flex", alignItems: "center", gap: 4 }}>
        GID
        {pickedGid > 0 ? (
          <span style={{
            width: 14, height: 14, display: "inline-block",
            background: `url("/game/tilesets/mauville_bottom.png") no-repeat`,
            backgroundPosition: `-${((pickedGid - 1) % 16) * 16}px -${Math.floor((pickedGid - 1) / 16) * 16}px`,
            imageRendering: "pixelated",
            border: "1px solid #4a4a6a", borderRadius: 1,
          }} />
        ) : null}
        <span>{pickedGid || "—"}</span>
      </span>
      <Sep />

      {/* Entities + tints */}
      <span>{entityCount} entities</span>
      <Sep />
      <span>{tintCount} tints</span>
      <Sep />

      {/* Selection */}
      {state.selectedEntityId ? (
        <span style={{ color: "#4a9eed" }}>
          Selected: {state.selectedEntityId}
          {state.selectedEntityIds.length > 1 ? ` (+${state.selectedEntityIds.length - 1})` : ""}
        </span>
      ) : <span style={{ color: "#555" }}>no selection</span>}

      {/* Right side */}
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 0 }}>
        <span style={{ color: state.dirty ? "#f59e0b" : "#22c55e" }}>
          {state.dirty ? "● unsaved" : "● saved"}
        </span>
        <Sep />
        <span style={{ color: "#777" }}>{savedAgo}</span>
        <Sep />
        <span style={{ color: "#ccc" }}>{mapLabel}</span>
      </span>
    </div>
  );
}

/** Context menu overlay */
function ContextMenu({ x, y, entityId, onClose }: { x: number; y: number; entityId: string | null; onClose: () => void }) {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const entity = entityId ? state.entities.find((e) => e.id === entityId) : null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div style={{
        position: "fixed", top: y, left: x, zIndex: 9999,
        background: "#1a1a30", border: "1px solid #4a4a6a", borderRadius: 4,
        padding: "4px 0", minWidth: 160, boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
      }}>
        {entity ? (
          <>
            <div style={{ padding: "4px 12px", fontSize: 9, color: "#666", fontWeight: 700 }}>{entity.id}</div>
            <MenuItem label="Select" onClick={() => { dispatch({ type: "SELECT_ENTITY", id: entity.id }); onClose(); }} />
            <MenuItem label="Jump to Entity" onClick={() => {
              emitEditorEvent(JUMP_TO_TILE, { x: entity.x, y: entity.y });
              dispatch({ type: "SELECT_ENTITY", id: entity.id });
              onClose();
            }} />
            <MenuSep />
            <MenuItem label="Duplicate" onClick={() => {
              const newEntity = { ...entity, id: entity.id + "_copy", x: entity.x + 1, y: entity.y };
              dispatch({ type: "ADD_ENTITY", entity: newEntity });
              onClose();
            }} />
            <MenuItem label="Delete" shortcut="Del" onClick={() => {
              dispatch({ type: "DELETE_ENTITY", id: entity.id, entity });
              onClose();
            }} />
          </>
        ) : (
          <>
            <MenuItem label="Deselect All" shortcut="Esc" onClick={() => { dispatch({ type: "DESELECT" }); onClose(); }} />
            <MenuItem label="Reset View" onClick={() => {
              emitEditorEvent(JUMP_TO_TILE, { x: 70, y: 60 });
              onClose();
            }} />
          </>
        )}
      </div>
    </>
  );
}

/** Inner app with context */
function EditorInner() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entityId: string | null } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);
  const [dialogPreview, setDialogPreview] = useState<{ lines: string[]; speaker?: string; page: number } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    return !localStorage.getItem("editor_onboarding_done");
  });
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(300);
  const [tintPopup, setTintPopup] = useState<{
    // The "primary" tile (last clicked) — drives the popup sliders
    x: number; y: number; layer: string; screenX: number; screenY: number; mapId: string;
    // All selected tiles (for multi-tint via Shift+click)
    selected: Array<{ x: number; y: number; layer: string; mapId: string }>;
  } | null>(null);
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number; gid: number; hasTopSprite: boolean; screenX: number; screenY: number } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  /**
   * Pending placement — picked from the command palette, dropped on the
   * next tile click. Supports every entity type, not just pokémon.
   * Each variant carries just enough info to instantiate a default
   * entity. Esc cancels.
   */
  type Placement =
    | { kind: "species"; species: PokemonSpecies }
    | { kind: "npc"; spriteKey: string }
    | { kind: "item"; itemId: string; itemName: string; itemIcon?: string }
    | { kind: "sign" }
    | { kind: "wild-pokemon"; species: PokemonSpecies }
    | { kind: "hidden-item"; itemId: string; itemName: string }
    | { kind: "warp" }
    | { kind: "gate" }
    | { kind: "pokedex-entry"; pokedexNumber: number; name: string; pokemon: string };
  const [pendingPlacement, setPendingPlacement] = useState<Placement | null>(null);
  /** Shadow of the Phaser stamp block state. null = no block. */
  const [blockStatus, setBlockStatus] = useState<{ width: number; height: number } | null>(null);
  /** Shadow of the Phaser multi-select queue for stamp/eraser. */
  const [pendingOp, setPendingOp] = useState<{ mode: "paint" | "erase"; count: number } | null>(null);

  // Listen for stamp block + pending-op state changes.
  useEffect(() => {
    const onBlock = (e: Event) => {
      const d = (e as CustomEvent).detail as { width: number; height: number } | null;
      setBlockStatus(d);
    };
    const onCopied = (e: Event) => {
      const d = (e as CustomEvent).detail as { width: number; height: number };
      setBlockStatus({ width: d.width, height: d.height });
    };
    const onPending = (e: Event) => {
      const d = (e as CustomEvent).detail as { mode: "paint" | "erase"; count: number } | null;
      setPendingOp(d);
    };
    window.addEventListener("editor:block-status", onBlock);
    window.addEventListener("editor:block-copied", onCopied);
    window.addEventListener("editor:pending-op-status", onPending);
    return () => {
      window.removeEventListener("editor:block-status", onBlock);
      window.removeEventListener("editor:block-copied", onCopied);
      window.removeEventListener("editor:pending-op-status", onPending);
    };
  }, []);

  // Placement commit — next tile click drops a new entity. Every entity
  // type is supported; each kind shapes the default entity. Esc cancels.
  useEffect(() => {
    if (!pendingPlacement) return;
    const onTileSelected = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x: number; y: number } | null;
      if (!detail) return;
      const pp = pendingPlacement;
      const tag = Date.now().toString(36);
      let entity: EditorEntity | null = null;
      switch (pp.kind) {
        case "species":
        case "pokedex-entry": {
          const dex = pp.kind === "species" ? pp.species.dex : pp.pokedexNumber;
          const name = pp.kind === "species" ? pp.species.name : pp.name;
          const slug = pp.kind === "species" ? pp.species.slug : pp.pokemon;
          entity = {
            id: `pkmn_${slug}_${detail.x}_${detail.y}_${tag}`,
            type: "pokemon-npc",
            x: detail.x, y: detail.y,
            pokedexNumber: dex,
            pokemon: { pokedexNumber: dex, speciesName: name, projectName: name },
            spriteKey: slug,
          };
          break;
        }
        case "wild-pokemon": {
          entity = {
            id: `wild_${pp.species.slug}_${detail.x}_${detail.y}_${tag}`,
            type: "wild-pokemon",
            x: detail.x, y: detail.y,
            pokedexNumber: pp.species.dex,
            pokemon: { pokedexNumber: pp.species.dex, speciesName: pp.species.name, projectName: pp.species.name },
            spriteKey: pp.species.slug,
          };
          break;
        }
        case "npc": {
          entity = {
            id: `npc_${pp.spriteKey}_${detail.x}_${detail.y}_${tag}`,
            type: "npc",
            x: detail.x, y: detail.y,
            spriteKey: pp.spriteKey,
            facingDirection: "down",
            dialog: [],
          };
          break;
        }
        case "item": {
          entity = {
            id: `pickup_${pp.itemId}_${detail.x}_${detail.y}_${tag}`,
            type: "pickup",
            x: detail.x, y: detail.y,
            itemId: pp.itemId,
            pickup: { itemId: pp.itemId },
          };
          break;
        }
        case "hidden-item": {
          entity = {
            id: `hidden_${pp.itemId}_${detail.x}_${detail.y}_${tag}`,
            type: "hidden-item",
            x: detail.x, y: detail.y,
            itemId: pp.itemId,
          };
          break;
        }
        case "sign": {
          entity = {
            id: `sign_${detail.x}_${detail.y}_${tag}`,
            type: "sign",
            x: detail.x, y: detail.y,
            text: [""],
          };
          break;
        }
        case "warp": {
          entity = {
            id: `warp_${detail.x}_${detail.y}_${tag}`,
            type: "warp",
            x: detail.x, y: detail.y,
            targetMap: "",
            spawnX: 0, spawnY: 0,
            spawnFacing: "down",
          };
          break;
        }
        case "gate": {
          entity = {
            id: `gate_${detail.x}_${detail.y}_${tag}`,
            type: "gate",
            x: detail.x, y: detail.y,
            gateType: "locked",
          };
          break;
        }
      }
      if (entity) {
        dispatch({ type: "ADD_ENTITY", entity });
        dispatch({ type: "SELECT_ENTITY", id: entity.id });
      }
      setPendingPlacement(null);
    };
    window.addEventListener("editor:tile-selected", onTileSelected);
    return () => {
      window.removeEventListener("editor:tile-selected", onTileSelected);
    };
  }, [pendingPlacement, dispatch]);

  // Esc cancels placement before it hits any other tier (popup, block,
  // selection). Also clears if user switches map etc.
  useEffect(() => {
    if (!pendingPlacement) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setPendingPlacement(null);
        emitEditorEvent("editor:placement-preview", null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [pendingPlacement]);

  // Double-click on an entity → open (un-collapse) the right properties
  // panel and make sure the entity is selected. Mirrors Adobe's
  // "double-click drills into the object" convention.
  useEffect(() => {
    const onDouble = (e: Event) => {
      const detail = (e as CustomEvent).detail as { entityId?: string };
      if (!detail?.entityId) return;
      setRightCollapsed(false);
      dispatch({ type: "SELECT_ENTITY", id: detail.entityId });
    };
    window.addEventListener("editor:entity-double-click", onDouble);
    return () => window.removeEventListener("editor:entity-double-click", onDouble);
  }, []);

  // Load data on mount
  useEffect(() => {
    fetch("/api/editor/data")
      .then((r) => r.json())
      .then((data) => {
        if (data.entities) {
          dispatch({ type: "LOAD_DATA", entities: data.entities });
          if (data.catalog) {
            dispatch({ type: "LOAD_CATALOG", catalog: data.catalog });
          }
          if (data.availableSprites) {
            dispatch({ type: "LOAD_SPRITES", sprites: data.availableSprites });
          }
        } else {
          dispatch({ type: "SET_ERROR", error: data.error || "No entities in response" });
        }
      })
      .catch((e) => dispatch({ type: "SET_ERROR", error: e.message }));

    // Load tile tints from /game/tile-tints.json
    fetch("/game/tile-tints.json", { cache: "no-cache" })
      .then((r) => r.ok ? r.json() : { tints: {} })
      .then((data) => {
        if (data && data.tints) dispatch({ type: "LOAD_TILE_TINTS", tints: data.tints });
      })
      .catch(() => {});
  }, []);

  // Listen for tint-click events from EditorScene. With the inline tint
  // inspector in the right sidebar, the FIRST click in a tint multi-
  // select just refreshes the inspector; only subsequent append clicks
  // (shift+click / magic wand) keep the floating popup open for batch
  // operations across several tiles at once.
  useEffect(() => {
    const onTintClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const mapId = localStorage.getItem("editor_current_map") || "mauville";
      const storageMapId = mapId === "mauville" ? "overworld" : mapId;
      const tile = { x: detail.x, y: detail.y, layer: detail.layer, mapId: storageMapId };
      // Every tint click also refreshes the inline inspector
      emitEditorEvent("editor:tile-selected", { x: tile.x, y: tile.y });
      if (!detail.append) return; // single-tile tint stays in the inspector
      setTintPopup((prev) => {
        if (prev) {
          const k = `${tile.mapId}:${tile.layer}:${tile.x},${tile.y}`;
          const existingKeys = new Set(prev.selected.map((t) => `${t.mapId}:${t.layer}:${t.x},${t.y}`));
          const selected = existingKeys.has(k) ? prev.selected : [...prev.selected, tile];
          return { ...prev, ...tile, screenX: detail.screenX, screenY: detail.screenY, selected };
        }
        return {
          ...tile,
          screenX: detail.screenX, screenY: detail.screenY,
          selected: [tile],
        };
      });
    };
    window.addEventListener("editor:tint-click", onTintClick);

    // Sync tool changes initiated by Phaser (e.g., eyedropper auto-switches
    // to stamp after picking a tile) back to React state so the toolbar UI
    // reflects the actual active tool.
    const onSetTool = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tool) dispatch({ type: "SET_TOOL", tool: detail.tool });
    };
    window.addEventListener("editor:set-tool", onSetTool);

    // Track whether the cursor is inside the main game canvas. Both Phaser's
    // hover events AND the visibility check use this flag — so when outside
    // the canvas, no badge ever shows even if Phaser emits a stale event.
    const insideCanvas = { current: true };

    const onHoverTile = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Drop the event if cursor isn't inside the canvas right now
      if (!insideCanvas.current) { setHoverTile(null); return; }
      setHoverTile(detail);
    };
    window.addEventListener("editor:hover-tile", onHoverTile);

    const onMouseMove = (e: MouseEvent) => {
      let mainCanvas: HTMLCanvasElement | null = null;
      let maxArea = 0;
      for (const c of document.querySelectorAll("canvas")) {
        const r = c.getBoundingClientRect();
        const a = r.width * r.height;
        if (a > maxArea) { maxArea = a; mainCanvas = c as HTMLCanvasElement; }
      }
      if (!mainCanvas) return;
      const r = mainCanvas.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right &&
                     e.clientY >= r.top && e.clientY <= r.bottom;
      insideCanvas.current = inside;
      if (!inside) setHoverTile(null);
    };
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("editor:tint-click", onTintClick);
      window.removeEventListener("editor:set-tool", onSetTool);
      window.removeEventListener("editor:hover-tile", onHoverTile);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  // Stash tile tints on window so EditorScene can refresh when needed.
  // We pass the raw HSL adjust; EditorScene applies it via Phaser preFX
  // ColorMatrix which supports real hue rotation / desaturation / brightening
  // (unlike the multiplicative setTint which can only darken).
  useEffect(() => {
    const resolved: Record<string, { adjust: { h: number; s: number; l: number; a: number }; rot?: number; flipX?: boolean; flipY?: boolean }> = {};
    for (const key in state.tileTints) {
      const entry = state.tileTints[key];
      let adj = { h: entry.h ?? 0, s: entry.s ?? 0, l: entry.l ?? 0, a: entry.a ?? 1 };
      if (entry.presetId) {
        const preset = state.catalog?.tintPresets?.find((p) => p.id === entry.presetId);
        if (preset) adj = preset.adjust;
      }
      resolved[key] = {
        adjust: adj,
        rot: entry.rot,
        flipX: entry.flipX,
        flipY: entry.flipY,
      };
    }
    (window as any).__EDITOR_TILE_TINTS__ = resolved;
    emitEditorEvent("editor:refresh-tints", {});
  }, [state.tileTints, state.catalog]);

  // Listen for show-history, show-relationships, and preview-dialog events
  useEffect(() => {
    const histHandler = () => setShowHistory(true);
    const relHandler = () => setShowRelationships(true);
    const dialogHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.lines) setDialogPreview({ lines: detail.lines, speaker: detail.speaker, page: 0 });
    };
    window.addEventListener("editor:show-history", histHandler);
    window.addEventListener("editor:show-relationships", relHandler);
    window.addEventListener("editor:preview-dialog", dialogHandler);
    return () => {
      window.removeEventListener("editor:show-history", histHandler);
      window.removeEventListener("editor:show-relationships", relHandler);
      window.removeEventListener("editor:preview-dialog", dialogHandler);
    };
  }, []);

  // Listen for right-click context menu from Phaser
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Only intercept right-clicks on the canvas
      if (e.target instanceof HTMLCanvasElement) {
        e.preventDefault();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          entityId: state.selectedEntityId,
        });
      }
    };
    window.addEventListener("contextmenu", handler);
    return () => window.removeEventListener("contextmenu", handler);
  }, [state.selectedEntityId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inTextInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;

      // Ctrl/Cmd shortcuts always work (even in text inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPaletteOpen(true); return; }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") { e.preventDefault(); dispatch({ type: "REDO" }); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); dispatch({ type: "UNDO" }); }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); dispatch({ type: "REDO" }); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); window.dispatchEvent(new CustomEvent("editor:trigger-save")); }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && !inTextInput) {
        e.preventDefault();
        if (state.selectedEntityId) {
          const entity = state.entities.find((ent) => ent.id === state.selectedEntityId);
          if (entity) {
            const newEntity = { ...entity, id: entity.id + "_copy", x: entity.x + 1 };
            dispatch({ type: "ADD_ENTITY", entity: newEntity });
          }
        }
      }

      // Skip non-modifier shortcuts when typing in text fields
      if (inTextInput) return;

      if (e.key === "Escape") {
        // Tiered Esc — pops one level of UI/selection per press so the user
        // can unwind without blowing away everything at once. First match
        // wins; stop after handling.
        // Level 1: any modal/popup/overlay
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (dialogPreview) { setDialogPreview(null); return; }
        if (deleteConfirm) { setDeleteConfirm(null); return; }
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (showHistory) { setShowHistory(false); return; }
        if (showRelationships) { setShowRelationships(false); return; }
        if (tintPopup) {
          setTintPopup(null);
          emitEditorEvent("editor:tint-close", {});
          return;
        }
        if (contextMenu) { setContextMenu(null); return; }
        // Level 2: Shift+click multi-select queue (stamp/eraser)
        if (pendingOp) {
          emitEditorEvent("editor:clear-pending-ops", {});
          return;
        }
        // Level 3: copied stamp block (tells Phaser to drop it)
        if (blockStatus) {
          emitEditorEvent("editor:clear-block-selection", {});
          return;
        }
        // Level 3: multi-entity selection → reduce to primary selection
        if (state.selectedEntityIds.length > 0) {
          for (const id of state.selectedEntityIds) {
            dispatch({ type: "TOGGLE_SELECT", id });
          }
          return;
        }
        // Level 4: single entity selection → full deselect
        if (state.selectedEntityId) {
          dispatch({ type: "DESELECT" });
          return;
        }
      }
      // Old tool-switch shortcuts (1–5) removed — there's a single Edit mode now
      if (e.key === "?" || (e.shiftKey && e.key === "/")) setShowShortcuts((p) => !p);
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedEntityId) {
          setDeleteConfirm(state.selectedEntityId);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    state.selectedEntityId, state.selectedEntityIds, state.entities,
    blockStatus, pendingOp, tintPopup, contextMenu, deleteConfirm,
    showShortcuts, showHistory, showRelationships, dialogPreview,
    paletteOpen,
  ]);

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
      <ModifierBar />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left panel with collapse toggle */}
        {!leftCollapsed ? (
          <>
            <div style={{ width: leftWidth, flexShrink: 0, display: "flex", flexDirection: "column" }}>
              <LeftPanel />
            </div>
            {/* Drag handle */}
            <div
              style={{ width: 4, cursor: "col-resize", background: "#2a2a40", flexShrink: 0 }}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = leftWidth;
                const onMove = (ev: MouseEvent) => { ev.preventDefault(); setLeftWidth(Math.max(140, Math.min(400, startW + ev.clientX - startX))); };
                const onUp = () => { document.body.style.userSelect = ""; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                document.body.style.userSelect = "none";
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
            />
          </>
        ) : (
          <div onClick={() => setLeftCollapsed(false)}
            style={{ width: 20, background: "#1e1e30", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #2a2a40", flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "#888", writingMode: "vertical-lr" }}>Panel</span>
          </div>
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minWidth: 0, overflow: "hidden" }}>
          {/* Collapse toggles overlay */}
          <div style={{ position: "absolute", top: 4, left: 4, zIndex: 20, display: "flex", gap: 2 }}>
            <span onClick={() => setLeftCollapsed(!leftCollapsed)} title={leftCollapsed ? "Show left panel" : "Hide left panel"}
              style={{ fontSize: 10, color: "#666", cursor: "pointer", background: "#1a1a2e", border: "1px solid #333", borderRadius: 2, padding: "1px 4px" }}>
              {leftCollapsed ? "▸" : "◂"}
            </span>
            <span onClick={() => setRightCollapsed(!rightCollapsed)} title={rightCollapsed ? "Show right panel" : "Hide right panel"}
              style={{ fontSize: 10, color: "#666", cursor: "pointer", background: "#1a1a2e", border: "1px solid #333", borderRadius: 2, padding: "1px 4px" }}>
              {rightCollapsed ? "◂" : "▸"}
            </span>
          </div>
          <Viewport />
          <BottomPanel />
        </div>
        {/* Right panel with collapse toggle */}
        {!rightCollapsed ? (
          <>
            <div
              style={{ width: 6, cursor: "col-resize", background: "#2a2a40", flexShrink: 0 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#4a4a6a"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#2a2a40"; }}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = rightWidth;
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#6a6a8a";
                const onMove = (ev: MouseEvent) => {
                  ev.preventDefault();
                  setRightWidth(Math.max(180, Math.min(600, startW + (startX - ev.clientX))));
                };
                const onUp = () => {
                  el.style.background = "#2a2a40";
                  document.body.style.userSelect = "";
                  document.body.style.cursor = "";
                  window.removeEventListener("mousemove", onMove);
                  window.removeEventListener("mouseup", onUp);
                };
                document.body.style.userSelect = "none";
                document.body.style.cursor = "col-resize";
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
            />
            <div style={{ width: rightWidth, minWidth: 0, flexShrink: 0, overflow: "hidden" }}>
              <RightPanel />
            </div>
          </>
        ) : (
          <div onClick={() => setRightCollapsed(false)}
            style={{ width: 20, background: "#1e1e30", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #2a2a40", flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "#888", writingMode: "vertical-lr" }}>Props</span>
          </div>
        )}
      </div>
      <StatusBar />
      {paletteOpen && (
        <CommandPalette
          items={buildPaletteItems({
            state, dispatch,
            jumpTo: (x, y) => emitEditorEvent(JUMP_TO_TILE, { x, y }),
            switchMap: (id) => emitEditorEvent(SWITCH_MAP, { mapId: id }),
            triggerSave: () => window.dispatchEvent(new CustomEvent("editor:trigger-save")),
            exportPng: () => emitEditorEvent("editor:export-png", {}),
            fitMap: () => emitEditorEvent("editor:fit-map", {}),
            magicWand: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" })),
            openTint: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "t" })),
            zoom100: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" })),
            showHistory: () => window.dispatchEvent(new CustomEvent("editor:show-history")),
            showRelationships: () => window.dispatchEvent(new CustomEvent("editor:show-relationships")),
            toggleLayer: (layer) => {
              const visible = !state.layers[layer as keyof typeof state.layers];
              dispatch({ type: "TOGGLE_LAYER", layer: layer as any });
              emitEditorEvent(TOGGLE_LAYER_EVENT, { layer, visible });
            },
            applySpecies: (sp) => {
              // If a pokémon entity is selected, re-link it to the chosen
              // species. Otherwise enter placement mode.
              const sel = state.selectedEntityId
                ? state.entities.find((e) => e.id === state.selectedEntityId)
                : null;
              if (sel && (sel.type === "pokemon-npc" || sel.type === "wild-pokemon")) {
                dispatch({
                  type: "UPDATE_FIELD",
                  id: sel.id,
                  field: "pokemon",
                  value: {
                    pokedexNumber: sp.dex,
                    speciesName: sp.name,
                    projectName: sel.pokemon?.projectName ?? sp.name,
                  },
                  oldValue: sel.pokemon,
                });
                return;
              }
              setPendingPlacement({ kind: "species", species: sp });
            },
            startPlacement: (p) => setPendingPlacement(p),
          })}
          onClose={() => setPaletteOpen(false)}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          entityId={contextMenu.entityId}
          onClose={() => setContextMenu(null)}
        />
      )}
      {dialogPreview && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998 }} onClick={() => setDialogPreview(null)} />
          <div style={{
            position: "fixed", bottom: "15%", left: "50%", transform: "translateX(-50%)", zIndex: 9999,
            background: "#1a1a30", border: "2px solid #4a4a6a", borderRadius: 8, padding: 0,
            width: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", overflow: "hidden",
          }}>
            {dialogPreview.speaker && (
              <div style={{ background: "#2a2a50", padding: "4px 12px", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                {dialogPreview.speaker}
              </div>
            )}
            <div style={{ padding: "12px 16px", fontSize: 12, color: "#fff", minHeight: 48, fontFamily: "'Press Start 2P', monospace", lineHeight: 1.8 }}>
              {dialogPreview.lines[dialogPreview.page] || "..."}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderTop: "1px solid #2a2a40" }}>
              <span style={{ fontSize: 9, color: "#666" }}>
                {dialogPreview.page + 1} / {dialogPreview.lines.length}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <span onClick={() => setDialogPreview({ ...dialogPreview, page: Math.max(0, dialogPreview.page - 1) })}
                  style={{ fontSize: 9, color: dialogPreview.page > 0 ? "#4a9eed" : "#444", cursor: "pointer" }}>Prev</span>
                <span onClick={() => {
                  if (dialogPreview.page < dialogPreview.lines.length - 1) {
                    setDialogPreview({ ...dialogPreview, page: dialogPreview.page + 1 });
                  } else {
                    setDialogPreview(null);
                  }
                }} style={{ fontSize: 9, color: "#4a9eed", cursor: "pointer" }}>
                  {dialogPreview.page < dialogPreview.lines.length - 1 ? "Next" : "Close"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
      {showRelationships && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998 }} onClick={() => setShowRelationships(false)} />
          <div style={{
            position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", zIndex: 9999,
            background: "#1a1a30", border: "1px solid #4a4a6a", borderRadius: 8, padding: 16,
            width: 500, maxHeight: "70vh", display: "flex", flexDirection: "column",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Entity Relationships</span>
              <span onClick={() => setShowRelationships(false)} style={{ cursor: "pointer", color: "#666" }}>x</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {(() => {
                const givers = state.entities.filter((e) => e.autoGive);
                const pokemon = state.entities.filter((e) => e.type === "wild-pokemon" || e.type === "pokemon-npc");
                const items = state.entities.filter((e) => e.type === "hidden-item" || e.type === "pickup");
                return (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#4a9eed", marginBottom: 4 }}>KEY ITEM GIVERS ({givers.length}) {"→"} CONNECTED badge</div>
                    {givers.map((g) => (
                      <div key={g.id} style={{ fontSize: 9, color: "#ccc", padding: "2px 0" }}>
                        {g.id} {"→"} gives <span style={{ color: "#f59e0b" }}>{g.autoGive?.itemId}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", margin: "8px 0 4px" }}>POKEMON ({pokemon.length}) {"→"} POKEDEX badge</div>
                    {pokemon.slice(0, 10).map((p) => (
                      <div key={p.id} style={{ fontSize: 9, color: "#ccc", padding: "2px 0" }}>
                        {p.id} at ({p.x}, {p.y}) {p.pokemon ? `- ${p.pokemon.speciesName}` : ""}
                      </div>
                    ))}
                    {pokemon.length > 10 && <div style={{ fontSize: 9, color: "#666" }}>...and {pokemon.length - 10} more</div>}
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#ec4899", margin: "8px 0 4px" }}>ITEMS ({items.length})</div>
                    {items.map((it) => (
                      <div key={it.id} style={{ fontSize: 9, color: "#ccc", padding: "2px 0" }}>
                        {it.id} at ({it.x}, {it.y}) {it.itemId ? `- ${it.itemId}` : ""}
                      </div>
                    ))}
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", margin: "8px 0 4px" }}>BADGE CHAIN SUMMARY</div>
                    <div style={{ fontSize: 9, color: "#aaa", lineHeight: 1.6 }}>
                      GYM: gym puzzle completion<br />
                      PUBLICATION: {state.entities.filter(e => e.dialog?.some(d => d.includes("paper"))).length} paper-related NPCs<br />
                      CONNECTED: {givers.length} key item givers<br />
                      POKEDEX: {pokemon.length} Pokemon encounters<br />
                      BLOGGER: {state.entities.filter(e => e.dialog?.some(d => d.includes("blog"))).length} blog-related NPCs<br />
                      ENGINEER: TM collection<br />
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}
      {showOnboarding && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9998 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999,
            background: "#1a1a30", border: "1px solid #8b5cf6", borderRadius: 12, padding: 24,
            width: 420, boxShadow: "0 8px 32px rgba(139,92,246,0.3)",
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#8b5cf6", marginBottom: 12 }}>Welcome to the World Designer IDE</div>
            <div style={{ fontSize: 11, color: "#ccc", lineHeight: 1.8, marginBottom: 16 }}>
              <div><b>1.</b> <span style={{ color: "#4a9eed" }}>Navigate:</span> Left-drag to pan, scroll to zoom, click minimap to jump</div>
              <div><b>2.</b> <span style={{ color: "#22c55e" }}>Edit:</span> Click entities to select, edit properties in the right panel</div>
              <div><b>3.</b> <span style={{ color: "#f59e0b" }}>Save:</span> Ctrl+S saves changes to TypeScript source files</div>
              <div style={{ marginTop: 8, color: "#888", fontSize: 10 }}>
                Press <b>?</b> anytime for keyboard shortcuts. Use the toolbar tools (1-5) for Select, Move, Stamp, Eraser, Eyedropper.
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 9, color: "#666", cursor: "pointer" }}>
                <input type="checkbox" onChange={(e) => {
                  if (e.target.checked) localStorage.setItem("editor_onboarding_done", "1");
                }} style={{ marginRight: 4 }} />
                Don't show again
              </label>
              <button onClick={() => { setShowOnboarding(false); localStorage.setItem("editor_onboarding_done", "1"); }} style={{
                background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6,
                padding: "8px 24px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>Got it!</button>
            </div>
          </div>
        </>
      )}
      {showShortcuts && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998 }} onClick={() => setShowShortcuts(false)} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999,
            background: "#1a1a30", border: "1px solid #4a4a6a", borderRadius: 8, padding: 20,
            width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Keyboard Shortcuts</div>
            {[
              ["1", "Select tool"],
              ["2", "Move tool"],
              ["3", "Stamp tool (tile painting)"],
              ["4", "Eraser tool"],
              ["5", "Eyedropper tool"],
              ["Ctrl+Z", "Undo"],
              ["Ctrl+Y / Ctrl+Shift+Z", "Redo"],
              ["Ctrl+S", "Save to source files"],
              ["Ctrl+D", "Duplicate entity"],
              ["Delete", "Delete entity (with confirm)"],
              ["Escape", "Deselect / close menu"],
              ["Ctrl+Click", "Toggle collision tile"],
              ["Arrow Keys", "Pan camera"],
              ["Scroll Wheel", "Zoom in/out"],
              ["Left-Drag", "Pan map"],
              ["Right-Click", "Context menu"],
              ["?", "Toggle this help"],
            ].map(([key, desc]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 10, borderBottom: "1px solid #2a2a40" }}>
                <span style={{ fontFamily: "monospace", color: "#4a9eed", fontWeight: 700 }}>{key}</span>
                <span style={{ color: "#aaa" }}>{desc}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {showHistory && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998 }} onClick={() => setShowHistory(false)} />
          <div style={{
            position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", zIndex: 9999,
            background: "#1a1a30", border: "1px solid #4a4a6a", borderRadius: 8, padding: 16,
            width: 400, maxHeight: "70vh", display: "flex", flexDirection: "column",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Undo History ({state.undoStack.length} actions)</span>
              <span onClick={() => setShowHistory(false)} style={{ cursor: "pointer", color: "#666" }}>×</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {state.undoStack.length === 0 && <div style={{ fontSize: 11, color: "#555", padding: 8 }}>No actions recorded</div>}
              {[...state.undoStack].reverse().map((entry, i) => {
                const a = entry.action;
                let desc: string = a.type;
                if (a.type === "MOVE_ENTITY") desc = `Move ${a.id} → (${a.x}, ${a.y})`;
                if (a.type === "UPDATE_FIELD") desc = `${a.id}.${a.field} = ${JSON.stringify(a.value).substring(0, 30)}`;
                if (a.type === "DELETE_ENTITY") desc = `Delete ${a.id}`;
                if (a.type === "ADD_ENTITY") desc = `Add ${a.entity.id}`;
                return (
                  <div key={i} style={{
                    padding: "4px 8px", fontSize: 10, borderBottom: "1px solid #2a2a40",
                    color: i === 0 ? "#fff" : "#888",
                  }}>
                    <span style={{ color: "#4a9eed", marginRight: 4 }}>#{state.undoStack.length - i}</span>
                    {desc}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
      {deleteConfirm && (() => {
        const entity = state.entities.find((e) => e.id === deleteConfirm);
        if (!entity) return null;
        return (
          <>
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998 }} onClick={() => setDeleteConfirm(null)} />
            <div style={{
              position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999,
              background: "#1a1a30", border: "1px solid #4a4a6a", borderRadius: 8, padding: 20,
              minWidth: 280, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Delete Entity?</div>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 16 }}>
                Are you sure you want to delete <span style={{ color: "#ef4444", fontWeight: 700 }}>{entity.id}</span>?
                <br /><span style={{ fontSize: 9, color: "#666" }}>This can be undone with Ctrl+Z.</span>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setDeleteConfirm(null)} style={{
                  background: "#2a2a40", color: "#ccc", border: "1px solid #3a3a50", borderRadius: 4,
                  padding: "6px 16px", fontSize: 11, cursor: "pointer",
                }}>Cancel</button>
                <button onClick={() => {
                  dispatch({ type: "DELETE_ENTITY", id: entity.id, entity });
                  setDeleteConfirm(null);
                }} style={{
                  background: "#ef4444", color: "#fff", border: "none", borderRadius: 4,
                  padding: "6px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}>Delete</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Pending placement HUD — shows which entity is about to drop on
          the next tile click. Follows the cursor. Esc cancels. */}
      {pendingPlacement && (() => {
        // Compute display info per placement kind.
        let title = "Place entity";
        let subtitle = "Click a tile · Esc cancels";
        let iconUrl: string | null = null;
        let iconBg = "#22c55e";
        const pp = pendingPlacement;
        if (pp.kind === "species") {
          title = `${pp.species.name} (#${String(pp.species.dex).padStart(3, "0")})`;
          subtitle = "Place pokémon NPC · Esc cancels";
          iconUrl = pp.species.spriteUrl;
        } else if (pp.kind === "wild-pokemon") {
          title = `Wild ${pp.species.name} (#${String(pp.species.dex).padStart(3, "0")})`;
          subtitle = "Place wild encounter · Esc cancels";
          iconUrl = pp.species.spriteUrl;
          iconBg = "#a855f7";
        } else if (pp.kind === "pokedex-entry") {
          title = `${pp.name} (#${String(pp.pokedexNumber).padStart(3, "0")}) · project`;
          subtitle = "Place portfolio pokémon NPC · Esc cancels";
          iconUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pp.pokedexNumber}.png`;
        } else if (pp.kind === "npc") {
          title = `NPC: ${pp.spriteKey}`;
          subtitle = "Place NPC · Esc cancels";
          iconUrl = `/game/sprites/emerald/${pp.spriteKey}.png`;
          iconBg = "#3b82f6";
        } else if (pp.kind === "item" || pp.kind === "hidden-item") {
          title = pp.kind === "hidden-item" ? `Hidden: ${pp.itemName}` : pp.itemName;
          subtitle = pp.kind === "hidden-item" ? "Place hidden item · Esc cancels" : "Place pickup · Esc cancels";
          iconBg = pp.kind === "hidden-item" ? "#ec4899" : "#f97316";
        } else if (pp.kind === "sign") {
          title = "Sign";
          subtitle = "Place sign (edit text after) · Esc cancels";
          iconBg = "#f59e0b";
        } else if (pp.kind === "warp") {
          title = "Warp";
          subtitle = "Place warp (configure target after) · Esc cancels";
          iconBg = "#8b5cf6";
        } else if (pp.kind === "gate") {
          title = "Gate";
          subtitle = "Place gate (configure after) · Esc cancels";
          iconBg = "#dc2626";
        }
        return (
          <div style={{
            position: "fixed",
            left: Math.min((hoverTile?.screenX ?? 200) + 24, window.innerWidth - 280),
            top: Math.min((hoverTile?.screenY ?? 200) + 24, window.innerHeight - 70),
            zIndex: 9997,
            background: "rgba(20, 20, 30, 0.92)",
            color: iconBg,
            fontFamily: "monospace",
            fontSize: 11,
            padding: "6px 10px",
            borderRadius: 4,
            border: `1px solid ${iconBg}`,
            pointerEvents: "none",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {iconUrl ? (
              <img src={iconUrl} alt="" style={{ width: 32, height: 32, imageRendering: "pixelated" }} />
            ) : (
              <div style={{ width: 32, height: 32, background: iconBg, opacity: 0.3, borderRadius: 4 }} />
            )}
            <div>
              <div style={{ fontWeight: 700 }}>{title}</div>
              <div style={{ fontSize: 9, color: "#888" }}>{subtitle}</div>
            </div>
          </div>
        );
      })()}

      {/* Pending multi-select queue HUD (stamp/eraser Shift+click). Commits
          with Enter, cancels with Esc. Sits just below the block HUD. */}
      {pendingOp && (
        <div style={{
          position: "fixed",
          left: 240, top: blockStatus ? 74 : 48, zIndex: 9996,
          background: "rgba(20, 20, 30, 0.85)",
          color: pendingOp.mode === "paint" ? "#22c55e" : "#ef4444",
          fontFamily: "monospace",
          fontSize: 11,
          padding: "4px 8px",
          borderRadius: 4,
          border: "1px solid #3a3a50",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          <span style={{ fontWeight: 700 }}>
            {pendingOp.count} tile{pendingOp.count === 1 ? "" : "s"} queued for {pendingOp.mode}
          </span>
          <span style={{ color: "#888", marginLeft: 10, fontSize: 10 }}>
            Enter = commit · Esc = cancel · Shift+click to toggle
          </span>
        </div>
      )}

      {/* Stamp block status HUD — sits in the top-left of the viewport and
          shows dimensions plus keyboard hints for rotate/flip. Hidden when
          no block is copied. */}
      {blockStatus && (
        <div style={{
          position: "fixed",
          left: 240, top: 48, zIndex: 9996,
          background: "rgba(20, 20, 30, 0.85)",
          color: "#4a9eed",
          fontFamily: "monospace",
          fontSize: 11,
          padding: "4px 8px",
          borderRadius: 4,
          border: "1px solid #3a3a50",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          <span style={{ fontWeight: 700 }}>Stamp block: {blockStatus.width}×{blockStatus.height}</span>
          <span style={{ color: "#888", marginLeft: 10, fontSize: 10 }}>
            Click = paste · ⌘+drag = paint-paste · R = rotate · F = flip X · ⇧F = flip Y · Esc = clear
          </span>
        </div>
      )}

      {/* Tile Tint popup */}
      {/* Hovered tile coordinate badge — follows the cursor. Hidden
          during placement mode so the species HUD is unobstructed. */}
      {hoverTile && !pendingPlacement && (
        <div style={{
          position: "fixed",
          left: Math.min(hoverTile.screenX + 18, window.innerWidth - 180),
          top: Math.min(hoverTile.screenY + 18, window.innerHeight - 60),
          zIndex: 9997,
          pointerEvents: "none",
          background: "rgba(0, 0, 0, 0.85)",
          color: "#ffd700",
          fontFamily: "monospace",
          fontSize: 12,
          fontWeight: 700,
          padding: "4px 8px",
          borderRadius: 4,
          border: "1px solid #4a4a6a",
          whiteSpace: "nowrap",
        }}>
          <div>Tile ({hoverTile.x}, {hoverTile.y})</div>
          <div style={{ fontSize: 10, color: "#aaa", fontWeight: 400 }}>
            GID: {hoverTile.gid}{hoverTile.hasTopSprite ? " · has top sprite" : ""}
          </div>
        </div>
      )}

      {tintPopup && (
        <TintPopup
          key={`${tintPopup.mapId}:${tintPopup.x},${tintPopup.y}:${tintPopup.selected.length}`}
          popup={tintPopup}
          tileTints={state.tileTints}
          tintPresets={state.catalog?.tintPresets || []}
          onChange={(_key, entry) => {
            // Apply the tint to every selected tile so shift-click multi-select
            // works: all highlighted tiles get the same adjustment.
            for (const t of tintPopup.selected) {
              const k = `${t.mapId}:${t.layer}:${t.x},${t.y}`;
              dispatch({ type: "SET_TILE_TINT", key: k, entry });
            }
          }}
          onClose={() => { setTintPopup(null); emitEditorEvent("editor:tint-close", {}); }}
          onSavePreset={(preset) => {
            dispatch({ type: "ADD_CATALOG_ENTRY", dataType: "tintPresets", entry: preset });
          }}
        />
      )}
    </div>
  );
}

/** Popup shown when the Tint tool clicks a tile — HSL sliders + preset picker. */
function TintPopup({
  popup, tileTints, tintPresets, onChange, onClose, onSavePreset,
}: {
  popup: {
    x: number; y: number; layer: string; screenX: number; screenY: number; mapId: string;
    selected: Array<{ x: number; y: number; layer: string; mapId: string }>;
  };
  tileTints: Record<string, any>;
  tintPresets: { id: string; label: string; adjust: { h: number; s: number; l: number; a: number } }[];
  onChange: (key: string, entry: any) => void;
  onClose: () => void;
  onSavePreset: (preset: { id: string; label: string; adjust: { h: number; s: number; l: number; a: number } }) => void;
}) {
  const [layer, setLayer] = useState(popup.layer);
  const key = `${popup.mapId}:${layer}:${popup.x},${popup.y}`;
  const existing = tileTints[key] || { h: 0, s: 0, l: 0, a: 1 };
  const [h, setH] = useState(existing.h ?? 0);
  const [s, setS] = useState(existing.s ?? 0);
  const [l, setL] = useState(existing.l ?? 0);
  const [a, setA] = useState(existing.a ?? 1);
  const [rot, setRot] = useState(existing.rot ?? 0);
  const [flipX, setFlipX] = useState(existing.flipX ?? false);
  const [flipY, setFlipY] = useState(existing.flipY ?? false);
  const [presetName, setPresetName] = useState("");

  // When the layer changes, reload the sliders from the new key's existing tint
  useEffect(() => {
    const k = `${popup.mapId}:${layer}:${popup.x},${popup.y}`;
    const e = tileTints[k] || { h: 0, s: 0, l: 0, a: 1 };
    setH(e.h ?? 0); setS(e.s ?? 0); setL(e.l ?? 0); setA(e.a ?? 1);
    setRot(e.rot ?? 0); setFlipX(e.flipX ?? false); setFlipY(e.flipY ?? false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer]);

  // Popup position — persisted across opens via localStorage.
  // Default: bottom-left area that rarely covers interesting tiles.
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem("editor_tint_popup_pos");
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.x === "number" && typeof p.y === "number") {
          return {
            x: Math.max(0, Math.min(p.x, window.innerWidth - 340)),
            y: Math.max(0, Math.min(p.y, window.innerHeight - 100)),
          };
        }
      }
    } catch {}
    return {
      x: 240,
      y: Math.max(40, window.innerHeight - 400),
    };
  });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Persist position whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("editor_tint_popup_pos", JSON.stringify(pos));
    } catch {}
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 320, dragRef.current.origX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.origY + dy)),
      });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const applyChange = (nh: number, ns: number, nl: number, na: number, nrot = rot, nfx = flipX, nfy = flipY) => {
    const isDefault = nh === 0 && ns === 0 && nl === 0 && na === 1 && nrot === 0 && !nfx && !nfy;
    if (isDefault) {
      onChange(key, null); // Remove tint
    } else {
      const entry: any = { h: nh, s: ns, l: nl, a: na };
      if (nrot !== 0) entry.rot = nrot;
      if (nfx) entry.flipX = true;
      if (nfy) entry.flipY = true;
      onChange(key, entry);
    }
  };

  return (
      <div style={{
        position: "fixed", left: pos.x, top: pos.y, zIndex: 9999, width: 320,
        background: "#1a1a30", border: "1px solid #4a4a6a", borderRadius: 6, padding: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
      }}>
        <div
          onMouseDown={(e) => {
            dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
          }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, cursor: "move", userSelect: "none" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#e5e5e5" }}>
            {popup.selected.length > 1 ? (
              <>Tint {popup.selected.length} Tiles <span style={{ fontSize: 9, color: "#888" }}>— {popup.layer}</span></>
            ) : (
              <>Tint Tile ({popup.x}, {popup.y}) <span style={{ fontSize: 9, color: "#888" }}>— {popup.layer}</span></>
            )}
          </span>
          <span onClick={onClose} style={{ cursor: "pointer", color: "#666", fontSize: 14 }}>×</span>
        </div>
        <div style={{ fontSize: 8, color: "#666", marginBottom: 6, fontStyle: "italic" }}>
          Tip: Shift+click to add more tiles · Click (no shift) to restart selection
        </div>

        {/* Layer override */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <span style={{ fontSize: 9, color: "#888", width: 60 }}>Layer</span>
          <select value={layer} onChange={(e) => setLayer(e.target.value)}
            style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "2px 5px" }}>
            <option value="ground">Ground (grass/floor/dirt)</option>
            <option value="top">Top (trees/fences/rocks/furniture)</option>
          </select>
        </div>

        {/* Apply preset dropdown */}
        {tintPresets.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: "#888", width: 60 }}>Preset</span>
            <select onChange={(e) => {
              if (!e.target.value) return;
              const preset = tintPresets.find((p) => p.id === e.target.value);
              if (preset) {
                setH(preset.adjust.h); setS(preset.adjust.s); setL(preset.adjust.l); setA(preset.adjust.a);
                onChange(key, { presetId: preset.id });
              }
            }} style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "2px 5px" }}>
              <option value="">— apply preset —</option>
              {tintPresets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        )}

        {/* HSL sliders — double-click a slider to reset it to default. */}
        {[
          { label: "Hue", val: h, setVal: setH, min: -180, max: 180, step: 1, after: "°", defaultVal: 0 },
          { label: "Sat", val: s, setVal: setS, min: -1, max: 1, step: 0.05, after: "", defaultVal: 0 },
          { label: "Light", val: l, setVal: setL, min: -1, max: 1, step: 0.05, after: "", defaultVal: 0 },
          { label: "Alpha", val: a, setVal: setA, min: 0, max: 1, step: 0.05, after: "", defaultVal: 1 },
        ].map((row) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "#888", width: 45 }}>{row.label}</span>
            <input type="range" min={row.min} max={row.max} step={row.step} value={row.val}
              onChange={(e) => {
                const v = Number(e.target.value);
                row.setVal(v);
                const vals = { h, s, l, a, [row.label === "Hue" ? "h" : row.label === "Sat" ? "s" : row.label === "Light" ? "l" : "a"]: v } as any;
                applyChange(vals.h, vals.s, vals.l, vals.a);
              }}
              onDoubleClick={() => {
                row.setVal(row.defaultVal);
                const vals = { h, s, l, a, [row.label === "Hue" ? "h" : row.label === "Sat" ? "s" : row.label === "Light" ? "l" : "a"]: row.defaultVal } as any;
                applyChange(vals.h, vals.s, vals.l, vals.a);
              }}
              title={`Double-click to reset to ${row.defaultVal}`}
              style={{ flex: 1, accentColor: "#4a9eed" }} />
            <span style={{ fontSize: 9, color: "#666", width: 40, textAlign: "right" }}>{row.val.toFixed(2)}{row.after}</span>
          </div>
        ))}

        {/* Rotation & Flip (top layer only — tilemap tiles only support 180° via flip flags) */}
        <div style={{ borderTop: "1px solid #2a2a40", marginTop: 6, paddingTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "#888", width: 45 }}>Rotate</span>
            {[0, 90, 180, 270].map((r) => (
              <button key={r} onClick={() => { setRot(r); applyChange(h, s, l, a, r, flipX, flipY); }}
                disabled={layer === "ground" && r !== 0 && r !== 180}
                style={{
                  flex: 1, background: rot === r ? "#1e3a5f" : "#0d0d1a",
                  color: rot === r ? "#fff" : "#ccc",
                  border: "1px solid " + (rot === r ? "#4a9eed" : "#2a2a40"),
                  borderRadius: 2, fontSize: 9, padding: "3px 0", cursor: "pointer",
                  opacity: (layer === "ground" && r !== 0 && r !== 180) ? 0.3 : 1,
                }}>{r}°</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "#888", width: 45 }}>Flip</span>
            <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#ccc", cursor: "pointer" }}>
              <input type="checkbox" checked={flipX} onChange={(e) => { setFlipX(e.target.checked); applyChange(h, s, l, a, rot, e.target.checked, flipY); }} />
              Horizontal
            </label>
            <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#ccc", cursor: "pointer" }}>
              <input type="checkbox" checked={flipY} onChange={(e) => { setFlipY(e.target.checked); applyChange(h, s, l, a, rot, flipX, e.target.checked); }} />
              Vertical
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, paddingTop: 8, borderTop: "1px solid #2a2a40" }}>
          <button onClick={() => {
            setH(0); setS(0); setL(0); setA(1); setRot(0); setFlipX(false); setFlipY(false);
            onChange(key, null);
          }} style={{ flex: 1, background: "#2a2a40", color: "#ccc", border: "1px solid #3a3a50", borderRadius: 3, padding: "4px 8px", fontSize: 9, cursor: "pointer" }}>
            Clear
          </button>
          <input type="text" placeholder="Preset name..." value={presetName} onChange={(e) => setPresetName(e.target.value)}
            style={{ flex: 2, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 2, color: "#ccc", fontSize: 9, padding: "3px 6px" }} />
          <button onClick={() => {
            if (!presetName.trim()) return;
            const id = presetName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
            onSavePreset({ id, label: presetName, adjust: { h, s, l, a } });
            setPresetName("");
          }} style={{ background: "#22c55e", color: "#000", border: "none", borderRadius: 3, padding: "4px 8px", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
            Save as Preset
          </button>
        </div>
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
