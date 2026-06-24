import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
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
  adapter: vercel({
    imageService: true,
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
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, autolinkOptions],
      rehypeKatex,
    ],
  },
  integrations: [
    tailwind(),
    mdx({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, autolinkOptions],
        rehypeKatex,
      ],
    }),
    sitemap(),
    react(),
  ],
});
