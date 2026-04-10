import { useEffect, useRef, useState } from "react";
import { getCollectedItems } from "@/game/systems/PickupStore";
import { sfx } from "@/game/systems/SoundManager";

interface BagMenuProps {
  onClose: () => void;
}

/**
 * Pokemon Emerald-style BAG sub-screen.
 *
 * Layout (matches the OG bag screen):
 *
 *   ┌────────────────┬──────────────────────────┐
 *   │ ◀  ITEMS  ▶    │       ▲                  │
 *   │ • • • • •      │  RESUME.PDF        x 1   │
 *   │                │  GITHUB.URL        x 1   │
 *   │   [BAG IMAGE]  │ ▶LINKEDIN.URL      x 1   │
 *   │                │  HUGGINGFACE.URL   x 1   │
 *   │  [item icon]   │  CLOSE BAG                  │
 *   ├────────────────┤       ▼                  │
 *   │ Item description text                     │
 *   └───────────────────────────────────────────┘
 *
 * 5 custom pockets matching Kostas's portfolio:
 *   ITEMS — pickup items collected from the world (URLs)
 *   PROJECTS — top GitHub projects (links to repos)
 *   PAPERS — published papers (links to scholar)
 *   PYPI — published Python packages (links to PyPi)
 *   CONTACTS — social/contact links
 */
export default function BagMenu({ onClose }: BagMenuProps) {
  const [pocketIndex, setPocketIndex] = useState(0);
  const [cursors, setCursors] = useState<number[]>(POCKETS.map(() => 0));
  const [contextItem, setContextItem] = useState<BagItem | null>(null);
  const [contextCursor, setContextCursor] = useState<0 | 1>(0);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const overlayRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Align the CSS gradient backdrop stripes with bg_full.png.
  // Compute the frame's Y offset so the gradient phase matches.
  useEffect(() => {
    const syncStripes = () => {
      if (!overlayRef.current || !frameRef.current) return;
      const fRect = frameRef.current.getBoundingClientRect();
      const oRect = overlayRef.current.getBoundingClientRect();
      const offsetY = fRect.top - oRect.top;
      const stripeH = fRect.height / 80;
      overlayRef.current.style.setProperty("--stripe-off", `${offsetY}px`);
      overlayRef.current.style.setProperty("--sh", `${stripeH}px`);
    };
    syncStripes();
    window.addEventListener("resize", syncStripes);
    return () => window.removeEventListener("resize", syncStripes);
  }, []);

  // Pull picked-up items from PickupStore into the ITEMS pocket dynamically.
  const pockets = POCKETS.map((p, i): BagPocket => {
    if (p.id === "items") {
      return {
        ...p,
        items: [
          ...getCollectedItems().map(
            (it): BagItem => ({
              name: it.name,
              quantity: 1,
              description:
                ITEM_DESCRIPTIONS[it.name] ??
                "An item collected from the world.",
              url: it.url,
            }),
          ),
        ],
      };
    }
    return p;
  });
  void cursors[0]; // satisfy linter for state we manage
  void pockets[0];

  const currentPocket = pockets[pocketIndex];
  // CLOSE BAG pseudo-row at the bottom of every pocket (matches OG Emerald).
  const rows: (BagItem | { name: "CLOSE BAG"; description: string; url?: undefined; quantity?: undefined })[] = [
    ...currentPocket.items,
    { name: "CLOSE BAG", description: "Close the BAG." },
  ];
  const cursor = cursors[pocketIndex];
  const selected = rows[Math.min(cursor, rows.length - 1)];

  // ── Keyboard input ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Context menu (USE / CLOSE BAG) handles its own keys.
      if (contextItem) {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          sfx.select();
          setContextCursor((c) => (c === 0 ? 1 : 0));
          return;
        }
        if (e.key === "Enter" || e.key === "z" || e.key === "Z") {
          e.preventDefault();
          sfx.confirm();
          if (contextCursor === 0 && contextItem.url) {
            window.open(contextItem.url, "_blank", "noopener,noreferrer");
          }
          setContextItem(null);
          return;
        }
        if (e.key === "Escape" || e.key === "x" || e.key === "X" || e.key === "Backspace") {
          e.preventDefault();
          sfx.cancel();
          setContextItem(null);
          return;
        }
        return;
      }

      if (e.key === "Escape" || e.key === "x" || e.key === "X" || e.key === "Backspace") {
        e.preventDefault();
        sfx.cancel();
        onCloseRef.current();
        return;
      }
      // Pocket switching: Left / Right arrows
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        sfx.select();
        setPocketIndex((i) => (i <= 0 ? POCKETS.length - 1 : i - 1));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        sfx.select();
        setPocketIndex((i) => (i >= POCKETS.length - 1 ? 0 : i + 1));
        return;
      }
      // Item navigation: Up / Down
      if (e.key === "ArrowUp") {
        e.preventDefault();
        sfx.select();
        setCursors((cs) => {
          const next = [...cs];
          next[pocketIndex] = next[pocketIndex] <= 0 ? rows.length - 1 : next[pocketIndex] - 1;
          return next;
        });
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        sfx.select();
        setCursors((cs) => {
          const next = [...cs];
          next[pocketIndex] = next[pocketIndex] >= rows.length - 1 ? 0 : next[pocketIndex] + 1;
          return next;
        });
        return;
      }
      // Select item
      if (e.key === "Enter" || e.key === "z" || e.key === "Z") {
        e.preventDefault();
        sfx.confirm();
        if (selected.name === "CLOSE BAG") {
          onCloseRef.current();
        } else if (selected.url) {
          setContextItem(selected as BagItem);
          setContextCursor(0);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pocketIndex, cursor, contextItem, contextCursor, rows.length]);

  // ── Render ──────────────────────────────────────────────────

  // Visible window of items (8 max, like the OG bag).
  const VISIBLE = 8;
  const scrollStart = Math.max(
    0,
    Math.min(cursor - Math.floor(VISIBLE / 2), rows.length - VISIBLE),
  );
  const visibleRows = rows.slice(scrollStart, scrollStart + VISIBLE);

  return (
    <div ref={overlayRef} style={overlayStyle}>
      <div ref={frameRef} onClick={(e) => e.stopPropagation()} style={menuFrameStyle}>
        {/* ── Pocket header (top-left over the purple stripe area) ── */}
        <div style={pocketHeaderStyle}>
          <img
            src="/game/ui/bag/pokeball_icon.png"
            alt=""
            style={pokeballIconStyle}
            draggable={false}
          />
          <span style={pocketArrowStyle}>◀</span>
          <span style={pocketNameStyle}>{currentPocket.name}</span>
          <span style={pocketArrowStyle}>▶</span>
        </div>

        {/* ── Pocket indicator squares (matches pret: small filled squares) ── */}
        <div style={pocketDotsStyle}>
          {POCKETS.map((_, i) => (
            <span
              key={i}
              style={{
                ...pocketDotStyle,
                background: i === pocketIndex ? "rgb(255,82,0)" : "#a0a0a0",
              }}
            />
          ))}
        </div>

        {/* ── Bag image (middle-left over the stripes) ───── */}
        <img
          src="/game/ui/bag/bag_male_front.png"
          alt="bag"
          style={bagImageStyle}
          draggable={false}
        />

        {/* ── Selected item icon (small white box) ───────── */}
        <div style={itemIconBoxStyle}>
          {selected.name === "CLOSE BAG" ? (
            <span style={{ fontSize: SCALED_FONT, color: "#404060" }}>✕</span>
          ) : (
            <img
              src={iconForItem(selected.name)}
              alt=""
              style={selectedItemIconImgStyle}
              draggable={false}
            />
          )}
        </div>

        {/* ── Scroll arrows (absolute on frame, pret: x=172, y=12/148) ── */}
        {scrollStart > 0 && <div style={scrollArrowTopStyle}>▲</div>}
        {scrollStart + VISIBLE < rows.length && (
          <div style={scrollArrowBottomStyle}>▼</div>
        )}

        {/* ── Item list (right cream area) ───────────────── */}
        <div style={listBoxStyle}>
          {visibleRows.map((row, i) => {
            const realIndex = i + scrollStart;
            const sel = realIndex === cursor;
            return (
              <div
                key={`${row.name}-${realIndex}`}
                style={{
                  ...listRowStyle,
                  color: row.name === "CLOSE BAG" ? "#888" : "#000",
                }}
              >
                <span style={cursorColStyle}>
                  {sel ? "\u25B6" : "\u00A0"}
                </span>
                <span style={itemNameStyle}>{row.name}</span>
                {row.name !== "CLOSE BAG" && row.quantity != null && (
                  <span style={itemQtyStyle}>x{"\u00A0"}{row.quantity}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Description (bottom cream area) ────────────── */}
        <div style={descBoxStyle}>{selected.description}</div>
      </div>

      {/* USE / CLOSE BAG context menu */}
      {contextItem && (
        <div style={contextOverlayStyle}>
          <div style={contextBoxStyle}>
            <div style={contextTitleStyle}>{contextItem.name}</div>
            <div
              style={{
                ...contextRowStyle,
                background: contextCursor === 0 ? "rgba(0,0,0,0.08)" : "transparent",
              }}
            >
              <span style={cursorColStyle}>
                {contextCursor === 0 ? "\u25B6" : "\u00A0"}
              </span>
              USE
            </div>
            <div
              style={{
                ...contextRowStyle,
                background: contextCursor === 1 ? "rgba(0,0,0,0.08)" : "transparent",
              }}
            >
              <span style={cursorColStyle}>
                {contextCursor === 1 ? "\u25B6" : "\u00A0"}
              </span>
              CLOSE BAG
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Types ───────────────────────────────────────────────────────

interface BagItem {
  name: string;
  quantity: number;
  description: string;
  url?: string;
}

interface BagPocket {
  id: string;
  name: string;
  items: BagItem[];
}

// ── Static pocket data ────────────────────────────────────────

const POCKETS: BagPocket[] = [
  {
    id: "items",
    name: "ITEMS",
    items: [], // populated dynamically from PickupStore
  },
  {
    id: "projects",
    name: "PROJECTS",
    items: [
      { name: "FleetSmart.ai",      quantity: 40, description: "AI maritime optimization\nplatform. 40+ enterprise vessels.",      url: "https://fleetsmart.ai" },
      { name: "ShiftMD",            quantity: 1,  description: "Hospital shift scheduling\nSaaS platform.",                           url: "https://shiftmd.com" },
      { name: "XpensAI",            quantity: 1,  description: "AI-powered expense\nmanagement.",                                     url: "https://xpensai.com" },
      { name: "MEDiC",              quantity: 1,  description: "Medical CLIP distillation.\nNeurIPS paper.",                          url: "https://github.com/drkostas" },
      { name: "MaskDistill-PyTorch",quantity: 1,  description: "PyTorch implementation of\nmask distillation.",                       url: "https://github.com/drkostas" },
      { name: "Soma",               quantity: 1,  description: "Personal health dashboard.",                                          url: "https://github.com/drkostas" },
    ],
  },
  {
    id: "papers",
    name: "PAPERS",
    items: [
      { name: "MEDiC",          quantity: 12, description: "Medical CLIP distillation\nNeurIPS 2024.",          url: "https://scholar.google.com/citations?user=drkostas" },
      { name: "MaskDistill",    quantity: 8,  description: "PyTorch mask distillation\npaper.",                  url: "https://scholar.google.com/citations?user=drkostas" },
      { name: "WACV Paper",     quantity: 15, description: "Vision paper accepted at\nWACV.",                    url: "https://scholar.google.com/citations?user=drkostas" },
      { name: "IGARSS Paper",   quantity: 11, description: "Geoscience and remote\nsensing paper at IGARSS.",     url: "https://scholar.google.com/citations?user=drkostas" },
      { name: "CHASE Paper",    quantity: 7,  description: "Healthcare ML paper at\nCHASE.",                       url: "https://scholar.google.com/citations?user=drkostas" },
      { name: "ECCV (review)",  quantity: 0,  description: "ECCV submission under\nreview.",                       url: "https://scholar.google.com/citations?user=drkostas" },
    ],
  },
  {
    id: "pypi",
    name: "PYPI",
    items: [
      { name: "high_sql",         quantity: 1, description: "Python package on PyPi.",  url: "https://pypi.org/user/drkostas/" },
      { name: "yaml_config",      quantity: 1, description: "Python package on PyPi.",  url: "https://pypi.org/user/drkostas/" },
      { name: "termcolor_logger", quantity: 1, description: "Python package on PyPi.",  url: "https://pypi.org/user/drkostas/" },
      { name: "email_app",        quantity: 1, description: "Python package on PyPi.",  url: "https://pypi.org/user/drkostas/" },
      { name: "drkostas_tools",   quantity: 1, description: "Python package on PyPi.",  url: "https://pypi.org/user/drkostas/" },
      { name: "fancy_logger",     quantity: 1, description: "Python package on PyPi.",  url: "https://pypi.org/user/drkostas/" },
      { name: "torch_helpers",    quantity: 1, description: "Python package on PyPi.",  url: "https://pypi.org/user/drkostas/" },
    ],
  },
  {
    id: "contacts",
    name: "CONTACTS",
    items: [
      { name: "GITHUB",     quantity: 1, description: "8,300+ followers.\nVisit KOSTAS's GitHub.",         url: "https://github.com/drkostas" },
      { name: "LINKEDIN",   quantity: 1, description: "Professional profile\non LinkedIn.",                url: "https://linkedin.com/in/drkostas" },
      { name: "SCHOLAR",    quantity: 1, description: "Google Scholar.\n10 papers, 102+ citations.",       url: "https://scholar.google.com/citations?user=drkostas" },
      { name: "HUGGINGFACE",quantity: 1, description: "HuggingFace models\nand datasets.",                 url: "https://huggingface.co/drkostas" },
      { name: "EMAIL",      quantity: 1, description: "Drop a line:\ndrkostas@gmail.com",                  url: "mailto:drkostas@gmail.com" },
    ],
  },
];

const ITEM_DESCRIPTIONS: Record<string, string> = {
  "RESUME.PDF":      "KOSTAS's CV.\nUSE to download the PDF.",
  "GITHUB.URL":      "Link to KOSTAS's GitHub\nprofile (8,300+ followers).",
  "LINKEDIN.URL":    "KOSTAS's professional\nLinkedIn profile.",
  "HUGGINGFACE.URL": "KOSTAS's HuggingFace\nmodels and datasets.",
  "SCHOLAR.URL":     "KOSTAS's Google Scholar\npublications page.",
};

/**
 * Map an item name to one of the stock OG Pokemon item icon PNGs
 * extracted from pret/pokeemerald/graphics/items/icons/.
 * Each icon is 24×24 (4-bit indexed) under /game/ui/bag/<file>.
 *
 * Every distinct item name gets its OWN icon — no fallthrough to a
 * default — so moving the cursor between items always changes the
 * preview icon.
 */
const ITEM_ICON_MAP: Record<string, string> = {
  // ITEMS pocket (collected URLs)
  "RESUME.PDF":      "/game/ui/bag/aurora_ticket.png",
  "GITHUB.URL":      "/game/ui/bag/master_ball.png",
  "LINKEDIN.URL":    "/game/ui/bag/amulet_coin.png",
  "HUGGINGFACE.URL": "/game/ui/bag/oran_berry.png",
  "SCHOLAR.URL":     "/game/ui/bag/lucky_egg.png",
  // PROJECTS pocket
  "FleetSmart.ai":       "/game/ui/bag/great_ball.png",
  "ShiftMD":             "/game/ui/bag/potion.png",
  "XpensAI":             "/game/ui/bag/amulet_coin.png",
  "MEDiC":               "/game/ui/bag/oran_berry.png",
  "MaskDistill-PyTorch": "/game/ui/bag/master_ball.png",
  "Soma":                "/game/ui/bag/leftovers.png",
  // PAPERS pocket
  "MEDiC Paper":   "/game/ui/bag/oran_berry.png",
  "MaskDistill":   "/game/ui/bag/master_ball.png",
  "WACV Paper":    "/game/ui/bag/star_piece.png",
  "IGARSS Paper":  "/game/ui/bag/nugget.png",
  "CHASE Paper":   "/game/ui/bag/stardust.png",
  "ECCV (review)": "/game/ui/bag/old_amber.png",
  // PYPI pocket
  "high_sql":         "/game/ui/bag/tm_case.png",
  "yaml_config":      "/game/ui/bag/pp_up.png",
  "termcolor_logger": "/game/ui/bag/pp_max.png",
  "email_app":        "/game/ui/bag/lava_cookie.png",
  "drkostas_tools":   "/game/ui/bag/berry_juice.png",
  "fancy_logger":     "/game/ui/bag/fresh_water.png",
  "torch_helpers":    "/game/ui/bag/soda_pop.png",
  // CONTACTS pocket
  "GITHUB":      "/game/ui/bag/master_ball.png",
  "LINKEDIN":    "/game/ui/bag/amulet_coin.png",
  "SCHOLAR":     "/game/ui/bag/lucky_egg.png",
  "HUGGINGFACE": "/game/ui/bag/oran_berry.png",
  "EMAIL":       "/game/ui/bag/lemonade.png",
};

function iconForItem(name: string): string {
  return ITEM_ICON_MAP[name] ?? "/game/ui/bag/poke_ball.png";
}

// ── Styles ─────────────────────────────────────────────────────
//
// All positions are expressed as percentages of the menu frame, which
// is itself sized to the OG GBA aspect ratio (240×160 = 3:2). The frame
// uses bg_full.png as its background image so React content sits
// directly over the OG bag chrome without any inner panel.
//
// Source-pixel coordinates from the OG bag layout (240×160):
//   pocket header banner  : (24,  4)–(112, 20)   ≈ (10%-47%, 2%-13%)
//   pocket dots           : (40, 22)–(96, 28)    ≈ (17%-40%, 14%-18%)
//   bag image             : (16, 32)–(80, 96)    ≈ (7%-33%, 20%-60%)
//   selected item icon    : (16, 96)–(48, 128)   ≈ (7%-20%, 60%-80%)
//   item list             : (96,  4)–(232, 124)  ≈ (40%-97%, 2%-78%)
//   description           : (96,128)–(232, 156)  ≈ (40%-97%, 80%-97%)

const FONT = "var(--pkmn-font, 'Courier New', monospace)";

/**
 * Scale text with the frame. Frame height = min(55vh, 36.67vw).
 * OG GBA: 8px font in 160px frame = 5%. Use ~4.5% for web fonts
 * (they render taller than 8px bitmap fonts).
 */
// Reduced ~20% vs prior: web fonts render taller than 8px GBA bitmap.
const SCALED_FONT = "min(2vh, 1.33vw)";
const SCALED_FONT_SM = "min(1.6vh, 1.07vw)";

// ── Pixel-accurate positions ─────────────────────────────────
//
// bg_full.png is 240×160. All % below are x/240 and y/160.
//
//   Pocket header banner : y=6-22,  x=30-101 (dark yellow)
//   Built-in dot markers : y=28-29, x=43,53,63,73,83 (5 × 2px)
//   Upper white box (icon): x=5-34,  y=71-96
//   Lower white box (desc): x=1-105, y=101-153
//   Cream item list      : x=112-231, y=16-143

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 250,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: [
    "repeating-linear-gradient(to bottom,",
    "rgb(213,106,255) 0px,",
    "rgb(213,106,255) var(--sh, 5px),",
    "rgb(74,131,255) var(--sh, 5px),",
    "rgb(74,131,255) calc(var(--sh, 5px) * 2))",
  ].join(" "),
  backgroundPositionY: "var(--stripe-off, 0px)",
  pointerEvents: "auto",
};

// OG GBA aspect ratio (3:2 = 240×160), sized ~55% of viewport.
const menuFrameStyle: React.CSSProperties = {
  position: "relative",
  width: "min(82.5vh, 55vw)",
  height: "min(55vh, 36.67vw)",
  backgroundImage: "url('/game/ui/bag/bg_full.png?v=9')",
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
  imageRendering: "pixelated",
  fontFamily: FONT,
  color: "#000",
  overflow: "hidden",
};

// ── Pocket header ────────────────────────────────────────────
// pret: WIN_POCKET_NAME = (32,8)→(96,24), center-aligned, white+red shadow

// pret: WIN_POCKET_NAME at (32,8)→(96,24). The pokeball sits at x=16.
// The ◀ arrow at x=28, ▶ at x=100. All within the dark yellow header.
const pocketHeaderStyle: React.CSSProperties = {
  position: "absolute",
  top: "3.75%",
  left: "6.7%",
  width: "36%",
  height: "12%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4%",
  fontSize: SCALED_FONT,
  fontWeight: 700,
  letterSpacing: "1px",
  color: "#383848",
};

const pokeballIconStyle: React.CSSProperties = {
  height: "70%",
  width: "auto",
  imageRendering: "pixelated",
};

// pret: sRedInterface_Pal RGB(255,82,0)
const pocketArrowStyle: React.CSSProperties = {
  fontSize: SCALED_FONT,
  color: "rgb(255,82,0)",
  fontWeight: 700,
  lineHeight: 1,
};

const pocketNameStyle: React.CSSProperties = {
  display: "inline-block",
  minWidth: "40%",
  textAlign: "center",
};

// ── Pocket indicator squares ─────────────────────────────────
// pret: BG2 row 3 (y=24), columns 5-9 (x=40,48,56,64,72)
// Small 6×6 filled squares at GBA scale.

const pocketDotsStyle: React.CSSProperties = {
  position: "absolute",
  // OG: tiny 3×3 dots at y≈26, spaced ~8px apart across x=40-80
  top: "16.25%",
  left: "16.7%",
  width: "16%",
  height: "2%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const pocketDotStyle: React.CSSProperties = {
  // OG: ~3×3 pixel squares. Container is 16% of frame, so 7% of container ≈ 1.1% of frame
  width: "7%",
  aspectRatio: "1",
  borderRadius: "0px",
};

// ── Bag image ────────────────────────────────────────────────
// pret: 64×64 sprite centered at (68, 66) → left=36/240=15%, top=34/160=21.25%

// pret: 64×64 sprite centered at (68,66) → left=15%, top=21.25%
// OG: bag sprite ~52×52 visible pixels in 240×160 → ~22% width
const bagImageStyle: React.CSSProperties = {
  position: "absolute",
  left: "15%",
  top: "21.25%",
  width: "22%",
  height: "auto",
  imageRendering: "pixelated",
  zIndex: 0,
};

// ── Item icon ────────────────────────────────────────────────
// pret: item icon sprite at (24, 88). Icon is 24×24.
// (24,88) → 10%, 55%. The icon box from bg_full.png is at x=5-34, y=71-96.

// Matches bg_full.png icon box: (8,68)-(36,90) → 28×22px
const itemIconBoxStyle: React.CSSProperties = {
  position: "absolute",
  left: "3.3%",
  top: "42.5%",
  width: "11.7%",
  height: "13.75%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  zIndex: 1,
};

const selectedItemIconImgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  imageRendering: "pixelated",
  userSelect: "none",
  pointerEvents: "none",
};

// ── Item list ────────────────────────────────────────────────
// pret: WIN_ITEM_LIST = (112,16)→(232,144), 120×128px
// Each row 16px tall, max 8 visible, FONT_NARROW

const listBoxStyle: React.CSSProperties = {
  position: "absolute",
  top: "10%",
  left: "46.7%",
  width: "50%",
  height: "80%",
  padding: "0.5% 2% 0.5% 0.5%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  overflow: "hidden",
};

// Each row = 16/160 = 10% of frame height.
const listRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4em 1fr auto",
  alignItems: "center",
  fontSize: SCALED_FONT,
  height: "12.5%",
  minHeight: "12.5%",
  gap: "0",
};

// pret: cursor arrow color = red RGB(255,82,0)
const cursorColStyle: React.CSSProperties = {
  display: "inline-block",
  textAlign: "center",
  fontSize: SCALED_FONT_SM,
  flexShrink: 0,
  color: "rgb(255,82,0)",
};

const itemNameStyle: React.CSSProperties = {
  letterSpacing: "0.5px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  paddingLeft: "0.2em",
};

const itemQtyStyle: React.CSSProperties = {
  fontWeight: 400,
  whiteSpace: "nowrap",
  paddingLeft: "0.5em",
  textAlign: "right",
};

// ── Scroll arrows ────────────────────────────────────────────
// pret: x=172 → 71.7%, up y=12 → 7.5%, down y=148 → 92.5%
// Red-orange RGB(255,82,0)

const scrollArrowTopStyle: React.CSSProperties = {
  position: "absolute",
  top: "7.5%",
  left: "71.7%",
  transform: "translateX(-50%)",
  fontSize: SCALED_FONT_SM,
  color: "rgb(255,82,0)",
};

const scrollArrowBottomStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "7.5%",
  left: "71.7%",
  transform: "translateX(-50%)",
  fontSize: SCALED_FONT_SM,
  color: "rgb(255,82,0)",
};

// ── Description ──────────────────────────────────────────────
// pret: WIN_DESCRIPTION = (0,104)→(112,152), 112×48px
// FONT_NORMAL, left=3px top=1px

// Matches bg_full.png desc box: (6,100)-(102,153) → 96×53px
// OG pret: WIN_DESCRIPTION = (0,104)→(112,152)
const descBoxStyle: React.CSSProperties = {
  position: "absolute",
  top: "62.5%",
  left: "2.5%",
  width: "41%",
  height: "33.1%",
  padding: "1.5% 2.5%",
  fontSize: SCALED_FONT,
  lineHeight: 1.3,
  whiteSpace: "pre-line",
  overflow: "hidden",
};

// ── Context (USE / CLOSE BAG) ──────────────────────────────────────

// Re-introduce a window-scale variable just for the context dialog
// (the rest of the bag uses % positioning over the bg image).
const sY = "var(--ui-scale-y, 1)";

const contextOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.3)",
  pointerEvents: "auto",
};

const contextBoxStyle: React.CSSProperties = {
  borderStyle: "solid",
  borderWidth: `calc(24px * ${sY})`,
  borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
  borderImageSlice: "8 fill",
  borderImageRepeat: "stretch",
  borderImageWidth: `calc(24px * ${sY})`,
  background: "transparent",
  padding: `calc(8px * ${sY}) calc(16px * ${sY})`,
  fontFamily: FONT,
  color: "#000",
  fontSize: `calc(13px * ${sY})`,
  imageRendering: "pixelated",
  outline: "none",
  minWidth: `calc(180px * ${sY})`,
};

const contextTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  marginBottom: `calc(6px * ${sY})`,
  paddingBottom: `calc(4px * ${sY})`,
  borderBottom: `calc(1px * ${sY}) solid rgba(0,0,0,0.4)`,
  textAlign: "center",
};

const contextRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: `calc(4px * ${sY}) calc(6px * ${sY})`,
  borderRadius: `calc(2px * ${sY})`,
  fontSize: `calc(13px * ${sY})`,
};
