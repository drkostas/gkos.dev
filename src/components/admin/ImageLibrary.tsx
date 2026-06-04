import { useEffect, useRef, useState } from "react";
import { ImageEditModal } from "./ImageEditModal";

type ImageItem = {
  slug: string;
  name: string;
  size: number;
  mtime: number;
  hasOriginal: boolean;
};

export function ImageLibrary({ folders }: { folders: string[] }) {
  const [slug, setSlug] = useState<string>(folders[0] || "");
  const [customSlug, setCustomSlug] = useState<string>("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<ImageItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSlug = customSlug.trim() || slug;

  async function refresh() {
    if (!activeSlug) return setImages([]);
    setLoading(true);
    const res = await fetch(`/api/admin/list-images?slug=${encodeURIComponent(activeSlug)}`);
    const data = await res.json();
    setImages(data.ok ? data.images : []);
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [slug, customSlug]);

  async function handleUpload(files: FileList | null) {
    if (!files || !files.length || !activeSlug) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", activeSlug);
      await fetch("/api/admin/upload-image", { method: "POST", body: fd });
    }
    setUploading(false);
    refresh();
  }

  async function handleDelete(img: ImageItem) {
    if (!confirm(`Delete ${img.name}?\n\nThis also removes any saved original.`)) return;
    await fetch("/api/admin/delete-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: img.slug, name: img.name }),
    });
    refresh();
  }

  async function handleReset(img: ImageItem) {
    if (!confirm(`Reset ${img.name} back to its original?\n\nYour current crop/resize will be lost.`)) return;
    await fetch("/api/admin/reset-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: img.slug, name: img.name }),
    });
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-primary bg-bg-primary/40 p-4">
        <label className="text-sm text-text-secondary">Folder:</label>
        <select
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setCustomSlug(""); }}
          className="rounded-lg border border-border-primary bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:border-purple-primary focus:outline-none"
        >
          {folders.length === 0 && <option value="">(none yet)</option>}
          {folders.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <span className="text-sm text-text-tertiary">or</span>
        <input
          type="text"
          placeholder="New folder name…"
          value={customSlug}
          onChange={(e) => setCustomSlug(e.target.value)}
          className="rounded-lg border border-border-primary bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:border-purple-primary focus:outline-none"
        />
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!activeSlug || uploading}
            className="rounded-full bg-purple-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-primary/90 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload image"}
          </button>
        </div>
      </div>

      {activeSlug && (
        <p className="text-xs text-text-tertiary">
          Writing to <code className="rounded bg-border-primary/30 px-1 py-0.5 font-mono">/public/blog/{activeSlug}/</code>
        </p>
      )}

      {loading ? (
        <p className="text-sm text-text-tertiary">Loading…</p>
      ) : images.length === 0 ? (
        <p className="text-sm text-text-tertiary">No images in this folder yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div key={`${img.slug}/${img.name}`} className="group overflow-hidden rounded-xl border border-border-primary">
              <div
                className="relative aspect-video cursor-zoom-in overflow-hidden bg-bg-primary"
                onDoubleClick={() => setEditing(img)}
                title="Double-click to edit"
              >
                <img
                  src={`/blog/${img.slug}/${img.name}?mt=${img.mtime}`}
                  alt={img.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {img.hasOriginal && (
                  <span
                    title="Original preserved — all future crops start from the untouched source."
                    className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur-sm"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></svg>
                    Edited
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="truncate font-mono text-xs text-text-primary">{img.name}</p>
                <p className="text-[10px] text-text-tertiary">{(img.size / 1024).toFixed(1)} KB</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(img)}
                    className="flex-1 rounded-full border border-border-primary px-2 py-1 text-[11px] font-medium text-text-secondary hover:border-purple-primary hover:text-purple-primary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(img)}
                    className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(`${img.slug}/${img.name}`); }}
                    className="text-[10px] text-text-tertiary hover:text-purple-primary"
                    title="Copy path relative to /public/blog/"
                  >
                    Copy path
                  </button>
                  {img.hasOriginal && (
                    <>
                      <span className="text-text-tertiary">·</span>
                      <button
                        type="button"
                        onClick={() => handleReset(img)}
                        className="text-[10px] font-medium text-amber-400 hover:text-amber-300"
                        title="Restore the file to its original and discard the edit"
                      >
                        Reset to original
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ImageEditModal
          image={{ ...editing, supportsAlignment: false }}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}
