import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import { unified } from "@astrojs/markdown-remark";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

// Heading autolink config: add a `.heading-anchor` child to each heading
// so it picks up our CSS for hover-reveal + # icon.
const autolinkOptions = {
  behavior: "append",
  properties: {
    className: ["heading-anchor"],
    ariaLabel: "Link to this section",
  },
  content: {
    type: "element",
    tagName: "span",
    properties: { className: ["heading-anchor-icon"] },
    children: [{ type: "text", value: "#" }],
  },
};

export default defineConfig({
  site: "https://gkos.dev",
  output: "server",
  // Astro 6's whitespace handling. Astro 7's default ('jsx') drops the space between a word
  // and an inline element, as in "write to me at <a>...".
  compressHTML: true,
  adapter: vercel({
    imageService: true,
    // Pages are rendered once and then served from Vercel's cache for up to an hour,
    // instead of rendering on every request. A deploy starts a fresh cache. The hour
    // keeps the parts that use today's date current (the month on the home page's
    // calendar, the year in the footer).
    isr: {
      expiration: 3600,
      // These stay on demand, because they read the query string (which a cached render
      // does not see), show live data or the time on every request, or must answer
      // every request on their own.
      exclude: [
        "/blog", // ?category= filters, and a tagline picked per request
        "/stats", // the community wall's message count, read live
        "/changelog", // "3 days ago" labels, counted from the request's time
        "/rss.xml",
        "/explore-editor",
        /^\/_image/,
        /^\/_server-islands\//,
        /^\/api\//,
        /^\/admin/,
      ],
    },
    // The middleware (the visit counter and the admin guard) runs in front of that cache,
    // so a cached page still counts every view. Prerendered pages would skip it.
    middlewareMode: "edge",
  }),
  redirects: {
    "/blog/the-router-that-finished-my-phd": "/blog/per-patch-loss-coupling",
  },
  vite: {
    server: {
      // Allow ngrok / tunnel hosts so the dev server is reachable from a phone.
      // Safe to leave in: only affects `astro dev`, never the production build.
      allowedHosts: [".ngrok-free.app", ".ngrok.app", ".ngrok.io", ".trycloudflare.com"],
    },
  },
  markdown: {
    // The remark and rehype pipeline (Astro 7's default is Sätteri). MDX inherits it.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, autolinkOptions],
        rehypeKatex,
      ],
    }),
  },
  integrations: [
    mdx(),
    sitemap(),
    react(),
  ],
});
