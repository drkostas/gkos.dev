import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const changelog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/changelog" }),
  schema: z.object({
    title: z.string(),
    publishedAt: z.coerce.date(),
    summary: z.string().optional(),
    imageName: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    publishedAt: z.coerce.date(),
    summary: z.string(),
    imageName: z.string().optional(),
    imageAlt: z.string().optional(),
    categories: z.array(z.string()).default([]),
    canonicalUrl: z.string().optional(),
    draft: z.boolean().default(false),
    audioFile: z.string().optional(),
  }),
});

export const collections = { changelog, blog };
