import { useEffect, useRef, useState } from "react";

type ImageItem = { slug: string; name: string; size: number; mtime: number };

/**
 * Hero image picker with thumbnails of images already in the post's folder,
 * plus upload. Value is stored as the path relative to `/public/blog/`, e.g.
 * `how-i-got-here/kostas-speaking.jpg` — which is what the MDX frontmatter
 * schema expects for `imageName`.
 */
export function HeroImagePicker({
  postSlug,
  value,
  onChange,
}: {
  postSlug: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSlug = postSlug || "";

  async function refresh() {
    if (!activeSlug) return;
    setLoading(true);
    const res = await fetch(`/api/admin/list-images?slug=${encodeURIComponent(activeSlug)}`);
    const data = await res.json();
    setImages(data.ok ? data.images : []);
    setLoading(false);
  }

  useEffect(() => { if (open && images.length === 0) refresh(); /* eslint-disable-next-line */ }, [open]);

  async function handleUpload(files: FileList | null) {
    if (!files || !files.length || !activeSlug) return;
    setUploading(true);
    let firstUploadedPath: string | null = null;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", activeSlug);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && !firstUploadedPath) {
        firstUploadedPath = `${activeSlug}/${data.name}`;
      }
    }
    setUploading(false);
    await refresh();
    // Convenience: auto-pick the first newly uploaded image as the hero.
    if (firstUploadedPath) onChange(firstUploadedPath);
  }

  const previewSrc = value ? `/blog/${value}` : null;

  return (
    <div className="space-y-2">
      {/* Preview + current path */}
      <div className="flex items-start gap-3">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt="Hero preview"
            className="h-20 w-28 rounded-lg border border-border-primary object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
          />
        ) : (
          <div className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed border-border-primary text-[10px] uppercase tracking-wider text-text-tertiary">
            No hero
          </div>
        )}
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`${activeSlug || "your-slug"}/hero.png`}
            className="w-full rounded-lg border border-border-primary bg-bg-primary px-3 py-2 font-mono text-xs text-text-primary focus:border-purple-primary focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-full border border-border-primary px-3 py-1 text-xs font-medium text-text-secondary hover:border-purple-primary hover:text-purple-primary"
            >
              {open ? "Close picker" : "Pick from folder"}
            </button>
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
              className="rounded-full bg-purple-primary px-3 py-1 text-xs font-medium text-white hover:bg-purple-primary/90 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload new"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="rounded-full border border-border-primary px-3 py-1 text-xs font-medium text-text-tertiary hover:border-rose-400 hover:text-rose-400"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail picker (expandable) */}
      {open && (
        <div className="rounded-lg border border-border-primary bg-bg-primary/40 p-3">
          {!activeSlug ? (
            <p className="text-xs text-text-tertiary">Save the post once to create its image folder, then pick a hero.</p>
          ) : loading ? (
            <p className="text-xs text-text-tertiary">Loading…</p>
          ) : images.length === 0 ? (
            <p className="text-xs text-text-tertiary">
              No images in <code className="font-mono">/public/blog/{activeSlug}/</code> yet. Upload one above.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {images.map((img) => {
                const pathValue = `${img.slug}/${img.name}`;
                const selected = pathValue === value;
                return (
                  <button
                    key={`${img.slug}/${img.name}`}
                    type="button"
                    onClick={() => { onChange(pathValue); setOpen(false); }}
                    className={
                      "group relative overflow-hidden rounded-md border-2 transition-colors " +
                      (selected ? "border-purple-primary" : "border-transparent hover:border-purple-primary/60")
                    }
                    title={img.name}
                  >
                    <img
                      src={`/blog/${img.slug}/${img.name}?mt=${img.mtime}`}
                      alt={img.name}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[10px] text-white">
                      {img.name}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
