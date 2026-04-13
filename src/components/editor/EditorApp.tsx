import { useEffect, useRef, useState } from "react";
import { EditorProvider, useEditorState, useEditorDispatch } from "./state/EditorContext";
import type { EditorEntity } from "./state/editorTypes";
import EditorViewport from "./EditorViewport";
import { emitEditorEvent, TOGGLE_LAYER as TOGGLE_LAYER_EVENT, JUMP_TO_TILE, SWITCH_MAP } from "../../game/editor/EditorEvents";

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
    // Collect changes from undo stack
    const changes = state.undoStack
      .filter((u) => u.action.type === "MOVE_ENTITY" || u.action.type === "UPDATE_FIELD")
      .map((u) => {
        const a = u.action;
        if (a.type === "MOVE_ENTITY") {
          return [
            { entityId: a.id, field: "x", oldValue: a.oldX, newValue: a.x },
            { entityId: a.id, field: "y", oldValue: a.oldY, newValue: a.y },
          ];
        }
        if (a.type === "UPDATE_FIELD") {
          return [{ entityId: a.id, field: a.field, oldValue: a.oldValue, newValue: a.value }];
        }
        return [];
      })
      .flat();

    if (changes.length === 0) {
      console.log("[save] No changes to save");
      return;
    }

    try {
      const r = await fetch("/api/editor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes, dryRun: false }),
      });
      const result = await r.json();
      console.log("[save] Result:", result);
      if (result.success) {
        dispatch({ type: "MARK_CLEAN" });
      }
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
        <MenuItem label={`${state.layers.movement ? "✓ " : "  "}Movement Ranges`} onClick={() => toggleLayer("movement")} />
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
    </div>
  );
}

/** NPC sprite preview — renders first frame of a 144x32 spritesheet */
function SpritePreview({ spriteKey, size = 24 }: { spriteKey: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, overflow: "hidden", flexShrink: 0,
      background: "#0d0d1a", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <img
        src={`/game/sprites/emerald/${spriteKey}.png`}
        alt={spriteKey}
        style={{
          imageRendering: "pixelated",
          width: size * 9, height: size * 2,
          objectFit: "none",
          objectPosition: "0 0",
          clipPath: `inset(0 ${(size * 9) - size}px ${size}px 0)`,
        }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    </div>
  );
}

const ALL_NPC_SPRITES = [
  "boy_1", "boy_2", "boy_3", "girl_1", "girl_2", "girl_3",
  "man_1", "woman_1", "woman_2", "woman_4", "fat_man", "old_man", "old_woman",
  "rich_boy", "school_kid_m", "maniac", "lass", "fisherman", "youngster",
  "beauty", "black_belt", "bug_catcher", "gentleman", "hiker",
  "little_boy", "little_girl", "nurse", "pokefan_f", "pokefan_m", "scientist_1",
  "aqua_member_f", "aqua_member_m", "magma_member_f", "magma_member_m",
  "brendan", "may", "wally", "wattson", "scott",
  "item_ball", "snorlax", "slaking", "slakoth",
  "poochyena_ow", "camerupt", "carvanha", "golbat", "mightyena", "numel", "sharpedo", "wailmer",
];

/** Left panel — Tabbed Asset Library */
function LeftPanel() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const [activeTab, setActiveTab] = useState<"entities" | "sprites" | "tiles">("entities");
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

  const filteredSprites = ALL_NPC_SPRITES.filter((s) =>
    !searchQuery || s.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const tabs = [
    { id: "entities" as const, label: "Entities", count: state.entities.length },
    { id: "sprites" as const, label: "NPC Sprites", count: ALL_NPC_SPRITES.length },
    { id: "tiles" as const, label: "Tiles", count: 0 },
  ];

  return (
    <div style={{ width: 220, background: "#1e1e30", borderRight: "1px solid #2a2a40", display: "flex", flexDirection: "column", flexShrink: 0 }}>
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
                {e.spriteKey && <SpritePreview spriteKey={e.spriteKey} size={18} />}
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
                title={sprite}
                style={{
                  background: "#161628", borderRadius: 3, padding: 4,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  cursor: "grab", border: "1px solid transparent",
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = "#4a9eed"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = "transparent"; }}
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
      {activeTab === "tiles" && (
        <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#555" }}>
          <div style={{ fontSize: 11, marginBottom: 8 }}>Tile Palette</div>
          <img
            src="/game/tilesets/mauville_bottom.png"
            alt="tileset"
            style={{ imageRendering: "pixelated", maxWidth: "100%", border: "1px solid #2a2a40", borderRadius: 3 }}
          />
          <div style={{ fontSize: 9, color: "#666", marginTop: 8, textAlign: "center" }}>
            Tile painting available in Phase 4.
            <br />Select tiles to copy, replace, or modify.
          </div>
        </div>
      )}
    </div>
  );
}

/** Minimap — small overview of the full map with entity dots */
function Minimap() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 180;
  const H = Math.round(W * (120 / 140));

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

    ctx.fillStyle = "#1a2e1a";
    ctx.fillRect(0, 0, W, H);

    // Draw entity dots
    for (const e of state.entities) {
      const px = (e.x / 140) * W;
      const py = (e.y / 120) * H;
      ctx.fillStyle = typeColors[e.type] || "#888";
      const r = state.selectedEntityId === e.id ? 3 : 1.5;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw selected entity highlight
    if (state.selectedEntityId) {
      const sel = state.entities.find((e) => e.id === state.selectedEntityId);
      if (sel) {
        const px = (sel.x / 140) * W;
        const py = (sel.y / 120) * H;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [state.entities, state.selectedEntityId]);

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor(((e.clientX - rect.left) / W) * 140);
    const y = Math.floor(((e.clientY - rect.top) / H) * 120);
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
  const [currentMap, setCurrentMap] = useState("mauville");
  const maps = [
    { id: "mauville", label: "Overworld (140x120)" },
    { id: "pokecenter", label: "Pokemon Center (14x9)" },
    { id: "mart", label: "Mart (11x8)" },
    { id: "gym", label: "Gym (10x21)" },
  ];

  return (
    <select
      value={currentMap}
      onChange={(e) => {
        setCurrentMap(e.target.value);
        emitEditorEvent(SWITCH_MAP, { mapId: e.target.value });
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
    }
  };

  if (!selected) {
    return (
      <div style={{ width: 300, background: "#1e1e30", borderLeft: "1px solid #2a2a40", padding: 12, color: "#555", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
        Click an entity to inspect
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    npc: "#3b82f6", "pokemon-npc": "#06b6d4", pickup: "#f97316",
    "wild-pokemon": "#22c55e", sign: "#f59e0b", "hidden-item": "#ec4899",
    warp: "#8b5cf6", gate: "#dc2626",
  };

  return (
    <div style={{ width: 300, background: "#1e1e30", borderLeft: "1px solid #2a2a40", overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
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
          <PropField label="Movement" value={selected.movementBehavior} type="select"
            options={["STATIONARY", "WANDER", "FACE_RANDOM", "PATROL_H", "PATROL_V", "LOOK_AROUND"]}
            onChange={(v) => updateField("movementBehavior", v, selected.movementBehavior)} />
        )}
        {selected.movementRangeX !== undefined && (
          <PropField label="Range X" value={selected.movementRangeX} type="number"
            onChange={(v) => updateField("movementRangeX", Number(v), selected.movementRangeX)} />
        )}
        {selected.movementRangeY !== undefined && (
          <PropField label="Range Y" value={selected.movementRangeY} type="number"
            onChange={(v) => updateField("movementRangeY", Number(v), selected.movementRangeY)} />
        )}
        {selected.spriteKey && (
          <PropField label="Sprite" value={selected.spriteKey} disabled />
        )}
      </PropSection>

      {(selected.dialog && selected.dialog.length > 0) && (
        <PropSection title={`DIALOG (${selected.dialog.length} slides)`} color="#4a9eed">
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
                  <div style={{ padding: "2px 6px 3px", fontSize: 8, color: "#06b6d4", background: "#0d1a2a" }}>
                    Template: {line.match(/\{\{[^}]+\}\}/g)?.join(", ")}
                  </div>
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
          <PropField label="Item" value={selected.autoGive.itemId}
            onChange={(v) => updateField("autoGive", { ...selected.autoGive, itemId: v }, selected.autoGive)} />
          {selected.autoGive.asideX != null && (
            <>
              <PropField label="Aside X" value={selected.autoGive.asideX} type="number"
                onChange={(v) => updateField("autoGive", { ...selected.autoGive, asideX: Number(v) }, selected.autoGive)} />
              <PropField label="Aside Y" value={selected.autoGive.asideY} type="number"
                onChange={(v) => updateField("autoGive", { ...selected.autoGive, asideY: Number(v) }, selected.autoGive)} />
            </>
          )}
        </PropSection>
      )}

      {selected.pokemon && (
        <PropSection title="POKEMON" color="#22c55e">
          <PropField label="Dex #" value={selected.pokemon.pokedexNumber} type="number" disabled />
          <PropField label="Species" value={selected.pokemon.speciesName} disabled />
          <PropField label="Project" value={selected.pokemon.projectName} disabled />
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
          <PropField label="Item" value={selected.itemId}
            onChange={(v) => updateField("itemId", v, selected.itemId)} />
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

      {selected.hasDialogFn && (
        <div style={{ background: "#2a1a1a", borderRadius: 5, padding: "4px 8px", fontSize: 9, color: "#f59e0b" }}>
          ⚠ Has dynamic dialogFn — edit in source code
        </div>
      )}
      {selected.hasSpawnCondition && (
        <div style={{ background: "#2a1a1a", borderRadius: 5, padding: "4px 8px", fontSize: 9, color: "#f59e0b" }}>
          ⚠ Has spawnCondition — edit in source code
        </div>
      )}

      <PropSection title="SOURCE" color="#666">
        <PropField label="File" value={selected.sourceFile} disabled />
        {selected.sourceOffset && <div style={{ fontSize: 9, color: "#666", paddingLeft: 76 }}>Has +50 offset</div>}
      </PropSection>
    </div>
  );
}

/** Checkpoints tab — save/restore entity state snapshots */
function CheckpointsTab() {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
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
      <div style={{ flex: 1, overflowY: "auto" }}>
        {checkpoints.length === 0 && <div style={{ fontSize: 9, color: "#555" }}>No checkpoints saved</div>}
        {checkpoints.map((cp, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0", fontSize: 9 }}>
            <span style={{ color: "#ccc" }}>{cp.name}</span>
            <span style={{ color: "#555" }}>{cp.time}</span>
            <span style={{ color: "#666" }}>({cp.count})</span>
            <span onClick={() => restoreCheckpoint(i)} style={{ color: "#22c55e", cursor: "pointer" }}>Restore</span>
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
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); dispatch({ type: "UNDO" }); }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); dispatch({ type: "REDO" }); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); /* save handled by toolbar */ }
      if (e.key === "Escape") { dispatch({ type: "DESELECT" }); setContextMenu(null); }
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
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          entityId={contextMenu.entityId}
          onClose={() => setContextMenu(null)}
        />
      )}
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
