import { useEffect, useRef, useState } from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  frontmatterPlugin,
  toolbarPlugin,
  diffSourcePlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertCodeBlock,
  ListsToggle,
  DiffSourceToggleWrapper,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { ImageEditModal, type EditableImage } from "./ImageEditModal";
import { HeroImagePicker } from "./HeroImagePicker";

type Frontmatter = {
  title: string;
  publishedAt: string; // ISO-like
  summary: string;
  imageName?: string;
  categories: string[];
  draft: boolean;
};

type Props = {
  slug?: string; // undefined = new post
  initialFrontmatter: Frontmatter;
  initialBody: string;
  knownCategories: string[];
};

type Alignment = "none" | "left" | "center" | "right" | "fullwidth";
type Spacing = { top: number; right: number; bottom: number; left: number };
type Dimensions = { width?: number; height?: number };

/** Unified history snapshot — text body + all side state. Cmd+Z / Cmd+Shift+Z
 *  walk this single stack so you can always undo the last thing you did,
 *  whatever it was (typing, alignment, margin, image resize). */
type Snapshot = {
  markdown: string;
  alignment: Record<string, Alignment>;
  spacing: Record<string, Spacing>;
  width: Record<string, Dimensions>;
};

/** Parse existing alignment classes out of the initial MDX body so we don't
 *  lose them when @mdxeditor round-trips through its Lexical tree (which
 *  strips `class` attributes on image nodes). */
function parseInitialAlignments(body: string): Record<string, Alignment> {
  const map: Record<string, Alignment> = {};
  const re = /<img\s+[^>]*src="([^"]+)"[^>]*class="img-(\w+)"[^>]*\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const [, src, a] = m;
    if (a === "left" || a === "right" || a === "center" || a === "fullwidth") {
      map[src] = a;
    }
  }
  return map;
}

/** Parse existing inline `margin: ... em` styles off image tags so user-set
 *  spacing survives reloads (mdxeditor strips inline styles on round-trip). */
function parseInitialSpacings(body: string): Record<string, Spacing> {
  const map: Record<string, Spacing> = {};
  const re = /<img\s+[^>]*src="([^"]+)"[^>]*style="[^"]*margin:\s*([^;"]+)[^"]*"[^>]*\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const [, src, marginStr] = m;
    const parts = marginStr.trim().split(/\s+/).map((p) => parseFloat(p));
    if (parts.some((p) => isNaN(p))) continue;
    if (parts.length === 1) map[src] = { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    else if (parts.length === 2) map[src] = { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    else if (parts.length === 3) map[src] = { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
    else if (parts.length >= 4) map[src] = { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  }
  return map;
}

/** Parse existing inline width/height HTML attrs so we restore the size
 *  user picked last session (mdxeditor strips these on round-trip). */
function parseInitialDimensions(body: string): Record<string, Dimensions> {
  const map: Record<string, Dimensions> = {};
  const tagRe = /<img\s+[^>]*\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(body)) !== null) {
    const tag = m[0];
    const src = tag.match(/src="([^"]+)"/)?.[1];
    if (!src) continue;
    const w = tag.match(/\swidth="(\d+(?:\.\d+)?)"/)?.[1];
    const h = tag.match(/\sheight="(\d+(?:\.\d+)?)"/)?.[1];
    if (w || h) {
      map[src] = {
        width: w ? Number(w) : undefined,
        height: h ? Number(h) : undefined,
      };
    }
  }
  return map;
}

/** Read width/height from a live DOM img — prefers HTML attrs, falls back
 *  to the inline `style="width: Xpx; height: Ypx"` that mdxeditor's drag
 *  handles typically set. */
function readImgDimensions(img: HTMLImageElement): Dimensions | null {
  let width: number | undefined;
  let height: number | undefined;
  const wAttr = img.getAttribute("width");
  const hAttr = img.getAttribute("height");
  if (wAttr) width = parseFloat(wAttr);
  if (hAttr) height = parseFloat(hAttr);
  if (!width && img.style.width) {
    const n = parseFloat(img.style.width);
    if (!isNaN(n)) width = n;
  }
  if (!height && img.style.height) {
    const n = parseFloat(img.style.height);
    if (!isNaN(n)) height = n;
  }
  if (!width && !height) return null;
  return { width, height };
}

/** Structural equality for unified snapshots so we skip no-op history pushes. */
function snapshotEqual(a: Snapshot, b: Snapshot): boolean {
  if (a.markdown !== b.markdown) return false;
  return (
    JSON.stringify(a.alignment) === JSON.stringify(b.alignment) &&
    JSON.stringify(a.spacing) === JSON.stringify(b.spacing) &&
    JSON.stringify(a.width) === JSON.stringify(b.width)
  );
}

/** Default margin for an image given its alignment. Mirrors the CSS defaults
 *  so the toolbar inputs start at the visible values instead of 0/0/0/0. */
function defaultSpacing(align: Alignment): Spacing {
  switch (align) {
    case "left":       return { top: 0.5, right: 1.5, bottom: 1, left: 0 };
    case "right":      return { top: 0.5, right: 0,   bottom: 1, left: 1.5 };
    case "center":     return { top: 1,   right: 0,   bottom: 1, left: 0 };
    case "fullwidth":  return { top: 1,   right: 0,   bottom: 1, left: 0 };
    default:           return { top: 0,   right: 0,   bottom: 0, left: 0 };
  }
}

export function PostEditor({ slug, initialFrontmatter, initialBody, knownCategories }: Props) {
  const [fm, setFm] = useState<Frontmatter>(initialFrontmatter);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "deleting">("idle");
  const [error, setError] = useState<string>("");
  const [editingImage, setEditingImage] = useState<EditableImage | null>(null);
  // Source of truth for per-image alignment. Seeded from initial MDX, updated
  // when the user changes alignment via the toolbar. Applied to markdown right
  // before the post is saved to disk.
  const [alignmentByPath, setAlignmentByPath] = useState<Record<string, Alignment>>(
    () => parseInitialAlignments(initialBody),
  );
  const [spacingByPath, setSpacingByPath] = useState<Record<string, Spacing>>(
    () => parseInitialSpacings(initialBody),
  );
  const [widthByPath, setWidthByPath] = useState<Record<string, Dimensions>>(
    () => parseInitialDimensions(initialBody),
  );
  // Unified undo/redo. Every meaningful change — text, alignment, margin,
  // image width/height — pushes a full snapshot here. Cmd+Z / Cmd+Shift+Z
  // walk the pointer. One stack, no "which system handled this?" confusion.
  const historyRef = useRef<Snapshot[]>([{
    markdown: initialBody,
    alignment: parseInitialAlignments(initialBody),
    spacing: parseInitialSpacings(initialBody),
    width: parseInitialDimensions(initialBody),
  }]);
  const historyPtrRef = useRef(0);
  const suspendHistoryRef = useRef(false);
  const pushTimerRef = useRef<number | null>(null);
  // Track the image the user has currently clicked in the WYSIWYG so the
  // toolbar can show alignment options scoped to that image.
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const editorRef = useRef<MDXEditorMethods>(null);
  const editorHostRef = useRef<HTMLElement | null>(null);
  // Refs that shadow state so toolbar closures (inside mdxeditor's plugin
  // system, which doesn't re-run on React re-renders) can read the latest
  // values. Declared BEFORE the sync assignments below.
  const alignmentRef = useRef(alignmentByPath);
  const selectedSrcRef = useRef<string | null>(null);
  const spacingRef = useRef(spacingByPath);
  const widthRef = useRef(widthByPath);
  alignmentRef.current = alignmentByPath;
  selectedSrcRef.current = selectedImageSrc;
  spacingRef.current = spacingByPath;
  widthRef.current = widthByPath;
  const isNew = !slug;

  function updateField<K extends keyof Frontmatter>(key: K, value: Frontmatter[K]) {
    setFm((prev) => ({ ...prev, [key]: value }));
  }

  /** Build a snapshot of the current editor + side-state. */
  function currentSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
    return {
      markdown: overrides.markdown ?? editorRef.current?.getMarkdown() ?? initialBody,
      alignment: overrides.alignment ?? alignmentByPath,
      spacing: overrides.spacing ?? spacingByPath,
      width: overrides.width ?? widthByPath,
    };
  }

  /** Push a snapshot onto the unified history. If the head matches, no-op.
   *  Any "future" entries past the pointer are dropped (classic branching). */
  function pushSnapshot(next: Snapshot) {
    if (suspendHistoryRef.current) return;
    const stack = historyRef.current;
    const truncated = stack.slice(0, historyPtrRef.current + 1);
    const head = truncated[truncated.length - 1];
    if (head && snapshotEqual(head, next)) return;
    const out = [...truncated, next];
    const MAX = 100;
    historyRef.current = out.length > MAX ? out.slice(-MAX) : out;
    historyPtrRef.current = historyRef.current.length - 1;
  }

  /** Debounced push — for text typing / drag-resize where lots of events
   *  arrive in quick succession. 400ms of quiet flushes the snapshot. */
  function schedulePush(next: Snapshot) {
    if (pushTimerRef.current !== null) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      pushSnapshot(next);
      pushTimerRef.current = null;
    }, 400);
  }

  /** Immediate push — for discrete toolbar clicks. Flushes any pending
   *  debounced push first so ordering is preserved. */
  function flushAndPush(next: Snapshot) {
    if (pushTimerRef.current !== null) {
      window.clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    }
    pushSnapshot(next);
  }

  function applySnapshot(snap: Snapshot) {
    // Preserve scroll so Cmd+Z doesn't jump to top when setMarkdown
    // rebuilds the Lexical tree.
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    suspendHistoryRef.current = true;
    setAlignmentByPath(snap.alignment);
    setSpacingByPath(snap.spacing);
    setWidthByPath(snap.width);
    // Re-feed the markdown into the editor only when it actually differs —
    // alignment/margin-only undos shouldn't rebuild the Lexical tree.
    if (editorRef.current && snap.markdown !== editorRef.current.getMarkdown()) {
      editorRef.current.setMarkdown(snap.markdown);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
        suspendHistoryRef.current = false;
      });
    });
  }

  function undoAll(): boolean {
    if (historyPtrRef.current <= 0) return false;
    historyPtrRef.current -= 1;
    applySnapshot(historyRef.current[historyPtrRef.current]);
    return true;
  }
  function redoAll(): boolean {
    if (historyPtrRef.current >= historyRef.current.length - 1) return false;
    historyPtrRef.current += 1;
    applySnapshot(historyRef.current[historyPtrRef.current]);
    return true;
  }

  /** Recording setters for the toolbar. Push immediately — these are
   *  discrete user actions. Spacing also runs through the debounce because
   *  numeric inputs fire onChange per keystroke. */
  function setAlignmentAndRecord(fn: (prev: Record<string, Alignment>) => Record<string, Alignment>) {
    setAlignmentByPath((prev) => {
      const next = fn(prev);
      flushAndPush(currentSnapshot({ alignment: next }));
      return next;
    });
  }
  function setSpacingAndRecord(fn: (prev: Record<string, Spacing>) => Record<string, Spacing>) {
    setSpacingByPath((prev) => {
      const next = fn(prev);
      schedulePush(currentSnapshot({ spacing: next }));
      return next;
    });
  }

  /** Swap the block containing a given image with the block above or below
   *  in the markdown source. Uses the editor's current content so the move
   *  reflects whatever the user just typed. */
  function moveImageBlock(src: string, direction: "up" | "down") {
    const ed = editorRef.current;
    if (!ed) return;
    const md = ed.getMarkdown();
    const blocks = md.split(/\n{2,}/);
    const idx = blocks.findIndex((b) =>
      b.includes(`src="${src}"`) ||
      b.includes(`src="${src}?`) ||
      b.includes(`](${src})`) ||
      b.includes(`](${src}?`),
    );
    if (idx === -1) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= blocks.length) return;
    [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
    const next = blocks.join("\n\n");
    ed.setMarkdown(next);
    flushAndPush(currentSnapshot({ markdown: next }));
  }

  /** Return the pixel width that represents "100%" for a given image.
   *  For a solo image this is the editor's content area. For an image
   *  inside an .img-row the effective slot is the grid column it
   *  occupies, so the slider stays responsive across its full range. */
  function contentWidth(src?: string): number {
    const host = editorHostRef.current;
    if (src && host) {
      const imgs = host.querySelectorAll<HTMLImageElement>("img");
      for (const img of Array.from(imgs)) {
        const clean = (img.getAttribute("src") || "").split("?")[0];
        if (clean !== src) continue;
        const row = img.closest<HTMLElement>(".img-row");
        if (row) {
          // Read the actual resolved grid columns. Lexical wraps inline
          // markdown images in inline spans (clientWidth: 0), so walking
          // the ancestor chain is unreliable — parse the grid template
          // instead. The first non-zero entry is the column width.
          const cols = getComputedStyle(row).gridTemplateColumns.split(/\s+/);
          for (const c of cols) {
            const px = parseFloat(c);
            if (!isNaN(px) && px > 0) return px;
          }
          // Fallback: assume 2 columns with a 1rem gap.
          const gap = parseFloat(getComputedStyle(row).columnGap) || 16;
          return Math.max(1, (row.clientWidth - gap) / 2);
        }
        break;
      }
    }
    const content = host?.querySelector<HTMLElement>('[contenteditable="true"]');
    return content?.clientWidth || 700;
  }

  function applyWidthPreset(src: string, percent: number) {
    const px = Math.round((contentWidth(src) * percent) / 100);
    setWidthByPath((prev) => {
      const next = { ...prev, [src]: { width: px } };
      // Slider drag fires many events; debounce so one drag = one undo step.
      schedulePush(currentSnapshot({ width: next }));
      return next;
    });
  }

  async function handleSave() {
    setStatus("saving");
    setError("");

    // Safety check: if the editor ref isn't live yet, we'd silently save
    // stale initialBody. Bail loudly instead.
    if (!editorRef.current) {
      setStatus("error");
      setError("Editor not ready yet. Try again in a second.");
      console.error("[save] editorRef.current is null");
      return;
    }

    // Get the editor's current markdown, then stamp in alignment classes +
    // inline margins from our out-of-band maps.
    let content = editorRef.current.getMarkdown();

    const allPaths = new Set([
      ...Object.keys(alignmentByPath),
      ...Object.keys(spacingByPath),
      ...Object.keys(widthByPath),
    ]);
    for (const path of allPaths) {
      content = applyImageAttrs(content, path, {
        alignment: alignmentByPath[path] ?? "none",
        spacing: spacingByPath[path],
        dimensions: widthByPath[path],
      });
    }
    // Undo mdxeditor's JSX-comment escaping so MDX stays parseable.
    content = content.replace(/\{\/\\\*/g, "{/*").replace(/\\\*\/\}/g, "*/}");

    // Strip cache-bust `?t=...` query strings we add on image refresh.
    // mdxeditor serializes them into the markdown source, and having them
    // persisted makes future lookups (by clean path) fall through.
    content = content.replace(/(src="\/blog\/[^"?]+)\?[^"]*"/g, '$1"');
    content = content.replace(/(\]\(\/blog\/[^)?\s]+)\?[^)\s]*(\))/g, '$1$2');

    try {
      const res = await fetch("/api/admin/save-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug || undefined,
          frontmatter: fm,
          content,
          isNew,
        }),
      });
      const data = await res.json().catch(() => ({ ok: false, error: "Response was not JSON" }));
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error || `Save failed (HTTP ${res.status})`);
        return;
      }
      setStatus("saved");
      if (isNew && data.slug) {
        window.location.href = `/admin/blog/${data.slug}`;
        return;
      }
      // Keep the success indicator visible for a noticeable moment.
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("[save] network/fetch error", err);
      setStatus("error");
      setError(String(err));
    }
  }

  async function handleDelete() {
    if (!slug) return;
    if (!confirm(`Delete "${fm.title}"? This removes the MDX file. Images stay.`)) return;
    setStatus("deleting");
    try {
      const res = await fetch("/api/admin/delete-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error || "Delete failed");
        return;
      }
      window.location.href = "/admin";
    } catch (err) {
      setStatus("error");
      setError(String(err));
    }
  }

  async function handleRevert() {
    if (!slug) return;
    if (!confirm(`Revert "${fm.title}" to its last committed state?\n\nThis discards unsaved changes and any saves since the last git commit.`)) return;
    try {
      const res = await fetch("/api/admin/revert-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error || "Revert failed (is the file tracked in git?)");
        return;
      }
      // Easiest way to reflect the file-on-disk state: reload the page,
      // which re-reads the MDX via the Astro page frontmatter.
      window.location.reload();
    } catch (err) {
      setStatus("error");
      setError(String(err));
    }
  }

  function addCategory(cat: string) {
    const trimmed = cat.trim().toLowerCase();
    if (!trimmed) return;
    if (fm.categories.includes(trimmed)) return;
    updateField("categories", [...fm.categories, trimmed]);
  }

  function removeCategory(cat: string) {
    updateField("categories", fm.categories.filter((c) => c !== cat));
  }

  // Keyboard shortcuts. We use capture phase so our handlers fire BEFORE
  // any internal mdxeditor binding, giving us a single source of truth for
  // undo/redo across text + alignment + margin + width.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
        return;
      }
      if (key === "z" && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        redoAll();
        return;
      }
      if (key === "z") {
        e.preventDefault();
        e.stopPropagation();
        undoAll();
      }
    }
    // Capture-phase listener on document beats mdxeditor's own keybindings.
    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fm, slug]);

  // Keep DOM image classes in sync with alignmentByPath so the WYSIWYG
  // editor visually reflects the alignment the user picked. This is on top
  // of what gets persisted into markdown on save — two independent pieces
  // of plumbing because @mdxeditor/editor drops classes from image nodes.
  useEffect(() => {
    const host = editorHostRef.current;
    if (!host) return;

    const ALIGN_CLASSES = ["img-left", "img-right", "img-center", "img-fullwidth"];

    const WRAPPER_CLASSES = ["img-wrap-left", "img-wrap-right", "img-wrap-center", "img-wrap-fullwidth"];

    function applyAll() {
      host!.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
        const src = img.getAttribute("src") || "";
        const cleanSrc = src.split("?")[0];
        img.classList.remove(...ALIGN_CLASSES);
        const a = alignmentByPath[cleanSrc];
        if (a && a !== "none") img.classList.add(`img-${a}`);
        // mdxeditor wraps images in a container that blocks float — mirror
        // the alignment onto the wrapper so the layout actually happens.
        const wrapper = img.closest<HTMLElement>('[class*="imageWrapper"]');
        if (wrapper) {
          wrapper.classList.remove(...WRAPPER_CLASSES);
          if (a && a !== "none") wrapper.classList.add(`img-wrap-${a}`);
        }
        // Custom margin: set on BOTH the wrapper (for float positioning)
        // and the img itself (so it matches the published rendering).
        const sp = spacingByPath[cleanSrc];
        if (sp) {
          const margin = `${sp.top}em ${sp.right}em ${sp.bottom}em ${sp.left}em`;
          img.style.margin = margin;
          if (wrapper) wrapper.style.margin = margin;
        } else {
          img.style.removeProperty("margin");
          if (wrapper) wrapper.style.removeProperty("margin");
        }

        // Apply width/height from our out-of-band map. Guard each write so
        // setting the same value doesn't re-fire the MutationObserver.
        const dim = widthByPath[cleanSrc];
        const wantW = dim?.width ? String(Math.round(dim.width)) : "";
        const wantH = dim?.height ? String(Math.round(dim.height)) : "";
        if (wantW && img.style.width !== `${wantW}px`) img.style.width = `${wantW}px`;
        if (!wantW && img.style.width) img.style.removeProperty("width");
        if (wantW && img.getAttribute("width") !== wantW) img.setAttribute("width", wantW);
        if (!wantW && img.hasAttribute("width")) img.removeAttribute("width");
        if (wantH && img.style.height !== `${wantH}px`) img.style.height = `${wantH}px`;
        if (!wantH && img.style.height) img.style.removeProperty("height");
        if (wantH && img.getAttribute("height") !== wantH) img.setAttribute("height", wantH);
        if (!wantH && img.hasAttribute("height")) img.removeAttribute("height");
      });
    }

    function captureDimensions() {
      // Record any in-editor resize (mdxeditor drag handles set inline
      // width/height on the img) into widthByPath. Push to unified history
      // too so Cmd+Z can revert the resize.
      let changed: Record<string, Dimensions> | null = null;
      host!.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
        const src = (img.getAttribute("src") || "").split("?")[0];
        if (!src.startsWith("/blog/")) return;
        const dims = readImgDimensions(img);
        const prev = (changed || widthByPath)[src];
        if (dims) {
          if (!prev || prev.width !== dims.width || prev.height !== dims.height) {
            changed = { ...(changed || widthByPath), [src]: dims };
          }
        }
      });
      if (changed) {
        setWidthByPath(changed);
        // Drag-resize fires many style mutations — debounce the history push
        // so a single drag is a single undo step.
        schedulePush(currentSnapshot({ width: changed }));
      }
    }

    applyAll();
    captureDimensions();
    const obs = new MutationObserver(() => {
      applyAll();
      captureDimensions();
    });
    obs.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "style", "width", "height"],
    });
    return () => obs.disconnect();
  }, [alignmentByPath, spacingByPath, widthByPath]);

  // Double-click any image in the WYSIWYG body → open the crop modal.
  // We attach the listener once on the editor host; event delegation catches
  // images that are added/moved later as the MDX tree updates.
  useEffect(() => {
    const host = editorHostRef.current;
    if (!host) return;

    async function onDbl(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const img = target.closest("img") as HTMLImageElement | null;
      if (!img) return;
      const src = img.getAttribute("src") || "";
      const m = src.match(/^\/blog\/([^/]+)\/([^/?#]+)/);
      if (!m) return;
      e.preventDefault();
      const [, imgSlug, imgName] = m;
      const fullPath = `/blog/${imgSlug}/${imgName}`;
      // Read current alignment from our out-of-band map (the editor itself
      // doesn't preserve the class attribute). Use a ref so the one-time-mounted
      // listener always sees the latest state.
      const current: Alignment = alignmentRef.current[fullPath] ?? "none";

      // Fetch persisted crop metadata so the modal can restore the region.
      let meta;
      let hasOriginal = false;
      try {
        const res = await fetch(`/api/admin/list-images?slug=${encodeURIComponent(imgSlug)}`);
        const data = await res.json();
        if (data?.ok) {
          const found = (data.images || []).find((it: any) => it.name === imgName);
          meta = found?.meta;
          hasOriginal = !!found?.hasOriginal;
        }
      } catch { /* best-effort */ }

      setEditingImage({
        slug: imgSlug,
        name: imgName,
        mtime: Date.now(),
        hasOriginal,
        meta,
        supportsAlignment: true,
        currentAlignment: current,
      });
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const img = target.closest("img") as HTMLImageElement | null;
      if (img) {
        const src = img.getAttribute("src") || "";
        const m = src.match(/^\/blog\/([^/]+)\/([^/?#]+)/);
        if (m) {
          setSelectedImageSrc(`/blog/${m[1]}/${m[2]}`);
          return;
        }
      }
      // Clicked outside an image — but leave the selection intact if the
      // click is in our alignment toolbar area (prevents the dropdown from
      // collapsing when you actually click an option).
      const inAlignmentToolbar = target.closest("[data-align-toolbar]");
      if (!inAlignmentToolbar) setSelectedImageSrc(null);
    }

    host.addEventListener("dblclick", onDbl);
    host.addEventListener("click", onClick);
    // Clear selection when clicking outside the editor entirely.
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      const inHost = host.contains(t);
      const inAlignmentToolbar = (t instanceof HTMLElement) && t.closest("[data-align-toolbar]");
      if (!inHost && !inAlignmentToolbar) setSelectedImageSrc(null);
    }
    document.addEventListener("click", onDocClick);
    return () => {
      host.removeEventListener("dblclick", onDbl);
      host.removeEventListener("click", onClick);
      document.removeEventListener("click", onDocClick);
    };
  }, []);

  function handleImageEdited(info: { path: string; alignment: Alignment; alignmentTouched: boolean }) {
    // 1. Refresh the file-on-disk changes visually.
    const host = editorHostRef.current;
    if (host && editingImage) {
      const { slug: s, name: n } = editingImage;
      const pattern = `/blog/${s}/${n}`;
      host.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
        if ((img.getAttribute("src") || "").startsWith(pattern)) {
          img.src = `${pattern}?t=${Date.now()}`;
        }
      });
    }

    // 2. Remember the alignment; stamped into markdown at post-save time.
    if (info.alignmentTouched) {
      setAlignmentByPath((prev) => {
        const next = { ...prev };
        if (info.alignment === "none") delete next[info.path];
        else next[info.path] = info.alignment;
        return next;
      });
    }

    setEditingImage(null);
  }

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border-primary bg-bg-primary/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-sm text-text-secondary hover:text-text-primary">← Back to dashboard</a>
          {slug && (
            <>
              <span className="text-text-tertiary">/</span>
              <code className="rounded bg-border-primary/30 px-1.5 py-0.5 font-mono text-xs text-text-secondary">{slug}.mdx</code>
              <a href={`/blog/${slug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-text-secondary hover:text-purple-primary">View post ↗</a>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {status === "saving" && <span className="text-xs text-text-tertiary">Saving…</span>}
          {status === "saved" && <span className="text-xs font-medium text-emerald-400">Saved ✓</span>}
          {status === "error" && (
            <span className="max-w-[320px] truncate rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300" title={error}>
              ✕ {error || "Save failed"}
            </span>
          )}
          {!isNew && (
            <>
              <button
                type="button"
                onClick={handleRevert}
                className="rounded-full border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-amber-400 hover:text-amber-400"
                title="Restore the MDX file from the last git commit"
              >
                Revert
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={status === "deleting"}
                className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
              >
                {status === "deleting" ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving"}
            className="rounded-full bg-purple-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-purple-primary/90 disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : isNew ? "Create" : "Save"}
            <kbd className="ml-2 hidden font-mono text-[10px] opacity-60 sm:inline">⌘S</kbd>
          </button>
        </div>
      </div>

      {/* Frontmatter form */}
      <section className="space-y-4 rounded-xl border border-border-primary bg-bg-primary/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">Frontmatter</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title (required)">
            <input
              type="text"
              value={fm.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-purple-primary focus:outline-none"
            />
          </Field>
          <Field label="Published at">
            <input
              type="datetime-local"
              value={isoToLocal(fm.publishedAt)}
              onChange={(e) => updateField("publishedAt", localToIso(e.target.value))}
              className="w-full rounded-lg border border-border-primary bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-purple-primary focus:outline-none"
            />
          </Field>
        </div>
        <Field label="Summary">
          <textarea
            value={fm.summary}
            onChange={(e) => updateField("summary", e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-border-primary bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-purple-primary focus:outline-none"
          />
        </Field>
        <Field label="Hero image">
          <HeroImagePicker
            postSlug={slug || ""}
            value={fm.imageName || ""}
            onChange={(v) => updateField("imageName", v)}
          />
        </Field>
        <Field label="Categories">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {fm.categories.map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1 rounded-full border border-purple-primary/40 bg-purple-primary/10 px-2 py-0.5 text-xs text-purple-primary">
                  {cat}
                  <button type="button" onClick={() => removeCategory(cat)} className="text-purple-primary/70 hover:text-purple-primary" aria-label={`Remove ${cat}`}>×</button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {knownCategories.filter((c) => !fm.categories.includes(c)).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => addCategory(cat)}
                  className="rounded-full border border-border-primary px-2 py-0.5 text-xs text-text-tertiary hover:border-purple-primary hover:text-purple-primary"
                >
                  + {cat}
                </button>
              ))}
              <input
                type="text"
                placeholder="New category…"
                className="rounded-full border border-border-primary bg-bg-primary px-2 py-0.5 text-xs text-text-primary focus:border-purple-primary focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
            </div>
          </div>
        </Field>
        <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={fm.draft}
            onChange={(e) => updateField("draft", e.target.checked)}
            className="h-4 w-4 rounded border-border-primary text-purple-primary focus:ring-purple-primary/30"
          />
          Draft (not published, excluded from blog list and RSS)
        </label>
      </section>

      {/* Body editor — card is sized to hold the img-row breakout (up to
           1100px) without clipping. Regular prose text is constrained to
           the published column width (768px) by AdminLayout CSS so line
           wrapping matches the blog page 1:1. */}
      <section
        ref={(node) => { editorHostRef.current = node; }}
        className="mx-auto w-full max-w-[1132px] rounded-xl border border-border-primary bg-white text-slate-900"
      >
        <MDXEditor
          ref={editorRef}
          markdown={initialBody}
          onChange={(md) => {
            // Unified history capture for text edits (typing, paste,
            // image drag-resize via Lexical). Debounced so 30 keystrokes
            // become one undo step.
            if (suspendHistoryRef.current) return;
            schedulePush(currentSnapshot({ markdown: md }));
          }}
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            imagePlugin({
              disableImageResize: true,
              disableImageSettingsButton: true,
              imageUploadHandler: async (image) => {
                const fd = new FormData();
                fd.append("file", image);
                fd.append("slug", slug || slugifyTitle(fm.title));
                const res = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error || "Upload failed");
                return data.path;
              },
            }),
            tablePlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: "ts" }),
            codeMirrorPlugin({
              codeBlockLanguages: { js: "JavaScript", ts: "TypeScript", tsx: "TSX", bash: "Bash", python: "Python", css: "CSS", html: "HTML", json: "JSON", md: "Markdown", "": "Plain" },
            }),
            frontmatterPlugin(),
            markdownShortcutPlugin(),
            diffSourcePlugin({ viewMode: "rich-text" }),
            toolbarPlugin({
              toolbarContents: () => (
                <DiffSourceToggleWrapper>
                  <UndoRedo />
                  <BoldItalicUnderlineToggles />
                  <BlockTypeSelect />
                  <CreateLink />
                  <InsertImage />
                  <InsertTable />
                  <InsertCodeBlock />
                  <ListsToggle />
                  {selectedImageSrc && (
                    <AlignmentToolbar
                      src={selectedImageSrc}
                      current={alignmentByPath[selectedImageSrc] ?? "none"}
                      spacing={spacingByPath[selectedImageSrc] ?? defaultSpacing(alignmentByPath[selectedImageSrc] ?? "none")}
                      widthPercent={(() => {
                        const w = widthByPath[selectedImageSrc]?.width;
                        if (!w) return null;
                        return Math.max(5, Math.min(100, Math.round((w / contentWidth(selectedImageSrc)) * 100)));
                      })()}
                      onChange={(a) => {
                        // Read current selection via ref — toolbar closure can be stale.
                        const sel = selectedSrcRef.current;
                        if (!sel) return;
                        setAlignmentAndRecord((prev) => {
                          const next = { ...prev };
                          if (a === "none") delete next[sel];
                          else next[sel] = a;
                          return next;
                        });
                      }}
                      onSpacingChange={(sp) => {
                        const sel = selectedSrcRef.current;
                        if (!sel) return;
                        setSpacingAndRecord((prev) => ({ ...prev, [sel]: sp }));
                      }}
                      onSpacingReset={() => {
                        const sel = selectedSrcRef.current;
                        if (!sel) return;
                        setSpacingAndRecord((prev) => {
                          const next = { ...prev };
                          delete next[sel];
                          return next;
                        });
                      }}
                      onMoveUp={() => { const sel = selectedSrcRef.current; if (sel) moveImageBlock(sel, "up"); }}
                      onMoveDown={() => { const sel = selectedSrcRef.current; if (sel) moveImageBlock(sel, "down"); }}
                      onWidthPreset={(pct) => { const sel = selectedSrcRef.current; if (sel) applyWidthPreset(sel, pct); }}
                      onWidthReset={() => {
                        const sel = selectedSrcRef.current;
                        if (!sel) return;
                        setWidthByPath((prev) => {
                          const next = { ...prev };
                          delete next[sel];
                          flushAndPush(currentSnapshot({ width: next }));
                          return next;
                        });
                      }}
                    />
                  )}
                  <BreakWrapButton editorRef={editorRef} />
                </DiffSourceToggleWrapper>
              ),
            }),
          ]}
          contentEditableClassName="prose prose-lg max-w-none px-4 py-8 prose-p:leading-8 prose-a:text-purple-primary prose-a:font-medium prose-headings:tracking-tighter prose-headings:font-medium prose-headings:scroll-mt-24 prose-strong:font-medium prose-code:text-sm prose-img:drama-shadow prose-img:rounded-xl"
        />
      </section>

      {editingImage && (
        <ImageEditModal
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSaved={handleImageEdited}
        />
      )}
    </div>
  );
}

/** Inserts a `<div class="clear-wrap" />` at the cursor so text after the
 *  aligned image falls BELOW instead of wrapping. Always visible in the
 *  toolbar because "I want to stop wrap here" may happen anywhere. */
function BreakWrapButton({ editorRef }: { editorRef: React.RefObject<MDXEditorMethods> }) {
  return (
    <button
      type="button"
      className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-purple-primary hover:text-purple-primary"
      title="Break wrap: inserts a divider so text after floated images starts below"
      onClick={() => {
        const ed = editorRef.current;
        if (!ed) return;
        // insertMarkdown places the raw string at the current selection.
        // We surround with blank lines so MDX parses the HTML as its own block.
        (ed as any).insertMarkdown?.('\n\n<div class="clear-wrap"></div>\n\n');
      }}
    >
      Break wrap
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-text-tertiary">{label}</span>
      {children}
    </label>
  );
}

function isoToLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.valueOf())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (isNaN(d.valueOf())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "");
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Conditional toolbar insert: shown only when an image is selected in the
 * WYSIWYG. Writes alignment out-of-band (see PostEditor's `alignmentByPath`)
 * because @mdxeditor/editor drops `class` attributes on round-trip.
 */
function AlignmentToolbar({
  src,
  current,
  spacing,
  widthPercent,
  onChange,
  onSpacingChange,
  onSpacingReset,
  onMoveUp,
  onMoveDown,
  onWidthPreset,
  onWidthReset,
}: {
  src: string;
  current: Alignment;
  spacing: Spacing;
  widthPercent: number | null;
  onChange: (a: Alignment) => void;
  onSpacingChange: (sp: Spacing) => void;
  onSpacingReset: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onWidthPreset: (pct: number) => void;
  onWidthReset: () => void;
}) {
  const opts: { key: Alignment; label: string; icon: string }[] = [
    { key: "none",       label: "None",       icon: "⌫" },
    { key: "left",       label: "Left",       icon: "⇤" },
    { key: "center",     label: "Center",     icon: "↔" },
    { key: "right",      label: "Right",      icon: "⇥" },
    { key: "fullwidth",  label: "Full width", icon: "⇔" },
  ];
  function setSide(side: keyof Spacing, value: number) {
    onSpacingChange({ ...spacing, [side]: value });
  }
  return (
    <div
      data-align-toolbar
      className="ml-2 flex flex-wrap items-center gap-2 border-l border-zinc-300 pl-2"
      title={`Image: ${src.split("/").pop()}`}
    >
      {/* Move block up/down */}
      <div className="flex items-center gap-1" title="Move this image above or below the adjacent block">
        <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Move</span>
        <button type="button" onClick={onMoveUp} title="Move up"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-600 hover:border-purple-primary hover:text-purple-primary">
          ↑
        </button>
        <button type="button" onClick={onMoveDown} title="Move down"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-600 hover:border-purple-primary hover:text-purple-primary">
          ↓
        </button>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Align</span>
        {opts.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={current === o.key}
            title={o.label}
            className={
              "rounded-md border px-2 py-1 text-xs font-medium transition-colors " +
              (current === o.key
                ? "border-purple-primary bg-purple-primary text-white"
                : "border-zinc-300 bg-white text-zinc-600 hover:border-purple-primary hover:text-purple-primary")
            }
          >
            <span className="font-mono">{o.icon}</span>
            <span className="ml-1 hidden sm:inline">{o.label}</span>
          </button>
        ))}
      </div>

      {/* Width slider */}
      <div className="flex items-center gap-2" title="Width as a percentage of the post column">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Width</span>
        <input
          type="range"
          min={5}
          max={100}
          step={1}
          value={widthPercent ?? 100}
          onChange={(e) => onWidthPreset(Number(e.target.value))}
          className="h-1 w-28 cursor-pointer accent-purple-primary"
        />
        <span className="w-10 text-right font-mono text-xs tabular-nums text-zinc-600">
          {widthPercent !== null ? `${widthPercent}%` : "auto"}
        </span>
        <button
          type="button"
          onClick={onWidthReset}
          title="Reset to the image's natural size"
          className="rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 hover:border-amber-400 hover:text-amber-500"
        >
          auto
        </button>
      </div>

      {/* Margin em */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Margin em</span>
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <label key={side} className="flex items-center gap-1 text-xs text-zinc-600" title={`Margin-${side} (em)`}>
            <span className="font-mono uppercase">{side.charAt(0)}</span>
            <input
              type="number"
              step={0.25}
              min={0}
              max={5}
              value={spacing[side]}
              onChange={(e) => setSide(side, Number(e.target.value))}
              className="w-14 rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs"
            />
          </label>
        ))}
        <button
          type="button"
          onClick={onSpacingReset}
          title="Reset margins to the alignment's defaults"
          className="rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 hover:border-amber-400 hover:text-amber-500"
        >
          reset
        </button>
      </div>
    </div>
  );
}

/** Update image attributes (alignment + spacing) on any image matching
 *  `path`. Because `@mdxeditor/editor` strips class/style when it round-trips
 *  through its Lexical tree, we stamp these in at post-save time.
 *
 *  The regex tolerates an optional `?<anything>` cache-bust query on the
 *  src — we also strip those below so the saved markdown stays clean. */
function applyImageAttrs(
  markdown: string,
  path: string,
  opts: { alignment?: Alignment; spacing?: Spacing; dimensions?: Dimensions },
): string {
  const { alignment = "none", spacing, dimensions } = opts;
  const escPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mdRegex = new RegExp(`!\\[([^\\]]*)\\]\\(${escPath}(?:\\?[^)\\s]*)?(?:\\s+"[^"]*")?\\)`, "g");
  const htmlRegex = new RegExp(`<img\\s+([^>]*?)\\s*/?>`, "g");

  const cls = alignment === "none" ? "" : ` class="img-${alignment}"`;
  const style = spacing
    ? ` style="margin: ${spacing.top}em ${spacing.right}em ${spacing.bottom}em ${spacing.left}em"`
    : "";
  const widthAttr = dimensions?.width ? ` width="${Math.round(dimensions.width)}"` : "";
  const heightAttr = dimensions?.height ? ` height="${Math.round(dimensions.height)}"` : "";

  function buildHtml(alt: string) {
    return `<img src="${path}" alt="${alt.replace(/"/g, "&quot;")}"${widthAttr}${heightAttr}${cls}${style} />`;
  }

  let out = markdown;
  const hasAnyAttr = alignment !== "none" || !!spacing || !!dimensions;

  // No attributes at all → prefer markdown syntax (cleaner source).
  if (!hasAnyAttr) {
    out = out.replace(htmlRegex, (match, inner) => {
      if (!inner.match(new RegExp(`src="${escPath}(?:\\?[^"]*)?"`))) return match;
      const altMatch = inner.match(/alt="([^"]*)"/);
      const alt = altMatch ? altMatch[1] : "";
      return `![${alt}](${path})`;
    });
    return out;
  }

  // At least one attribute set → HTML form. Convert markdown first, then swap HTML.
  out = out.replace(mdRegex, (_m, alt) => buildHtml(alt));
  out = out.replace(htmlRegex, (match, inner) => {
    if (!inner.match(new RegExp(`src="${escPath}(?:\\?[^"]*)?"`))) return match;
    const altMatch = inner.match(/alt="([^"]*)"/);
    const alt = altMatch ? altMatch[1] : "";
    return buildHtml(alt);
  });
  return out;
}
