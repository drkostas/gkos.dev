import type { APIRoute } from "astro";
import { readFileSync } from "fs";
import { resolve } from "path";

export const prerender = false;

export const GET: APIRoute = async () => {
  if (!import.meta.env.DEV) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const dataPath = resolve(process.cwd(), "editor-data.json");
    const json = readFileSync(dataPath, "utf-8");
    return new Response(json, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "editor-data.json not found. Run: node scripts/editor-data-export.mjs" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
