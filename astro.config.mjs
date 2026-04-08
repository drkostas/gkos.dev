import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://gkos.dev",
  integrations: [
    tailwind(),
    mdx(),
    sitemap(),
    react(),
  ],
});
