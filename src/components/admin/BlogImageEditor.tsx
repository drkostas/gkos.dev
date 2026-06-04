import { useEffect } from "react";

/**
 * Dev-only: makes every image inside an article's `.prose` block
 * double-click-editable. Clicking takes you to `/admin/images` with the
 * image preselected and the edit modal auto-opened.
 *
 * The component is only imported into `/blog/[slug].astro` when
 * `import.meta.env.DEV` is true, so in production this bundle never ships.
 */
export function BlogImageEditor() {
  useEffect(() => {
    const root = document.querySelector("article .prose");
    if (!root) return;

    const imgs = root.querySelectorAll<HTMLImageElement>("img");
    const listeners: Array<() => void> = [];

    imgs.forEach((img) => {
      img.classList.add("dev-editable-img");
      img.title = (img.title ? img.title + " · " : "") + "Double-click to edit";

      const handler = (e: MouseEvent) => {
        e.preventDefault();
        const src = img.getAttribute("src") || "";
        // Expect paths like /blog/<slug>/<name>.<ext>
        const m = src.match(/^\/blog\/([^/]+)\/([^/?#]+)/);
        if (!m) {
          console.warn("[BlogImageEditor] unrecognized image path:", src);
          return;
        }
        const [, slug, name] = m;
        const url = `/admin/images?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}&auto=1`;
        window.location.href = url;
      };
      img.addEventListener("dblclick", handler);
      listeners.push(() => img.removeEventListener("dblclick", handler));
    });

    return () => listeners.forEach((fn) => fn());
  }, []);

  return null;
}
