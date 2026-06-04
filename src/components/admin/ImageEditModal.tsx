import { useEffect, useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

export type Alignment = "none" | "left" | "center" | "right" | "fullwidth";

export type CropMeta = {
  crop?: { x: number; y: number; width: number; height: number } | null;
  resize?: { width?: number; height?: number } | null;
  naturalSize?: { width: number; height: number } | null;
};

export type EditableImage = {
  slug: string;
  name: string;
  mtime?: number;
  hasOriginal?: boolean;
  /** Saved crop/resize params from the last edit — lets us restore state. */
  meta?: CropMeta;
};

export function ImageEditModal({
  image,
  onClose,
  onSaved,
}: {
  image: EditableImage;
  onClose: () => void;
  onSaved: (info: { path: string }) => void;
}) {
  // Restore saved crop region (as %) if we have meta, otherwise default
  // to full image (100%) on first-time open.
  const initialCrop: Crop = (() => {
    const meta = image.meta;
    if (meta?.crop && meta?.naturalSize?.width && meta?.naturalSize?.height) {
      const c = meta.crop;
      const nw = meta.naturalSize.width;
      const nh = meta.naturalSize.height;
      return {
        unit: "%",
        x: (c.x / nw) * 100,
        y: (c.y / nh) * 100,
        width: (c.width / nw) * 100,
        height: (c.height / nh) * 100,
      };
    }
    return { unit: "%", x: 0, y: 0, width: 100, height: 100 };
  })();
  const initialResize = image.meta?.resize?.width ? String(image.meta.resize.width) : "";

  const [crop, setCrop] = useState<Crop>(initialCrop);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [cropEnabled, setCropEnabled] = useState(true);
  const [resizeWidth, setResizeWidth] = useState<string>(initialResize);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const imgRef = useRef<HTMLImageElement>(null);
  const liveRef = useRef({ completedCrop, cropEnabled, resizeWidth, saving });
  liveRef.current = { completedCrop, cropEnabled, resizeWidth, saving };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Enter") {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === "TEXTAREA") return;
        if (liveRef.current.saving) return;
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReset() {
    if (!confirm("Reset this image to its untouched original?\n\nYour current crop/resize will be discarded.")) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/reset-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: image.slug, name: image.name }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok || !data.ok) {
      setError(data.error || "Reset failed");
      return;
    }
    // After reset there's nothing left to edit — close the modal and let the
    // parent refresh the visible image. onSaved bumps the file's visual cache.
    onSaved({ path: `/blog/${image.slug}/${image.name}` });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const imgEl = imgRef.current;
    if (!imgEl) {
      setSaving(false);
      return;
    }
    const natural = { w: imgEl.naturalWidth, h: imgEl.naturalHeight };
    const displayed = { w: imgEl.width, h: imgEl.height };
    const scaleX = natural.w / displayed.w;
    const scaleY = natural.h / displayed.h;

    const payload: Record<string, unknown> = { slug: image.slug, name: image.name };
    let hasFileEdit = false;

    // Crop only fires when the user actually dragged a new region. If the
    // box wasn't touched, we skip cropping rather than erroring out.
    if (cropEnabled && completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      // Clamp to image bounds so sharp never gets coordinates outside the
      // pixel grid — that's what "extract_area: bad extract area" means.
      const x = clamp(completedCrop.x * scaleX, 0, natural.w - 1);
      const y = clamp(completedCrop.y * scaleY, 0, natural.h - 1);
      const w = clamp(completedCrop.width * scaleX, 1, natural.w - x);
      const h = clamp(completedCrop.height * scaleY, 1, natural.h - y);
      payload.crop = {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
      };
      hasFileEdit = true;
    }

    const w = resizeWidth.trim();
    if (w && !isNaN(Number(w))) {
      payload.resize = { width: Number(w) };
      hasFileEdit = true;
    }

    if (!hasFileEdit) {
      setSaving(false);
      setError("Nothing changed. Drag the crop or set a resize width.");
      return;
    }

    const res = await fetch("/api/admin/crop-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok || !data.ok) {
      setError(data.error || "Edit failed");
      return;
    }
    onSaved({ path: data.path });
  }

  const cacheBust = image.mtime ?? Date.now();

  function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border-primary px-5 py-3">
          <div>
            <h2 className="font-mono text-sm text-text-secondary">{image.slug}/{image.name}</h2>
            {image.hasOriginal && (
              <p className="text-[11px] text-amber-400">Editing from saved original — previous crop will be replaced.</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary">×</button>
        </header>

        <div className="border-b border-border-primary bg-bg-primary/40 px-5 py-3 space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-text-secondary">
              <input
                type="checkbox"
                checked={cropEnabled}
                onChange={(e) => setCropEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border-primary text-purple-primary focus:ring-purple-primary/30"
              />
              Crop
            </label>
            <label className="flex items-center gap-2 text-text-secondary">
              Resize width:
              <input
                type="number"
                min={50}
                placeholder="(optional)"
                value={resizeWidth}
                onChange={(e) => setResizeWidth(e.target.value)}
                className="w-28 rounded-lg border border-border-primary bg-bg-primary px-2 py-1 text-sm"
              />
              <span className="text-text-tertiary">px</span>
            </label>
            <p className="ml-auto text-xs text-text-tertiary">
              {cropEnabled ? "Drag the handles to define the crop." : "Resize only — full image will be resized."}
              <span className="ml-2 font-mono">·&nbsp;Enter&nbsp;save · Esc&nbsp;close</span>
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-black/20 p-6">
          {cropEnabled ? (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
            >
              <img
                ref={imgRef}
                src={`/api/admin/get-original?slug=${encodeURIComponent(image.slug)}&name=${encodeURIComponent(image.name)}&mt=${cacheBust}`}
                alt={image.name}
                className="max-h-[60vh] w-auto"
              />
            </ReactCrop>
          ) : (
            <img
              ref={imgRef}
              src={`/api/admin/get-original?slug=${encodeURIComponent(image.slug)}&name=${encodeURIComponent(image.name)}&mt=${cacheBust}`}
              alt={image.name}
              className="mx-auto max-h-[60vh] w-auto"
            />
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-border-primary px-5 py-3">
          {image.hasOriginal && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
              title="Discard the current crop/resize and restore the untouched original file"
            >
              Reset to original
            </button>
          )}
          {error && <span className="text-xs text-rose-400">{error}</span>}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-border-primary px-4 py-1.5 text-sm text-text-secondary">Cancel</button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-purple-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
