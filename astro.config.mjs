import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://gkos.dev",
  output: "server",
  // Vercel adapter — runs API routes as Vercel Functions on Fluid Compute.
  // imageService enables Vercel's built-in image optimization.
  // (Analytics handled by Cloudflare Web Analytics — see Layout.astro.)
  adapter: vercel({
    imageService: true,
  }),
  integrations: [
    tailwind(),
    mdx(),
    sitemap(),
    react(),
  ],
});
