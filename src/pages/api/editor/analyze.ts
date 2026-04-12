import type { APIRoute } from "astro";
import { execSync } from "child_process";
import { resolve } from "path";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const script = resolve(process.cwd(), "scripts/map-analyzer.mjs");

    let cmd = `node "${script}" --quiet`;
    if (body.testTile) {
      cmd = `node "${script}" --test ${body.testTile} --quiet`;
    }

    const output = execSync(cmd, {
      encoding: "utf-8",
      timeout: 30000,
      cwd: process.cwd(),
    });

    // Try to read generated JSON
    const dataPath = resolve(process.cwd(), "game-map-data.json");
    const { readFileSync } = await import("fs");
    const analysis = JSON.parse(readFileSync(dataPath, "utf-8"));

    return new Response(JSON.stringify({
      success: true,
      safeTileCount: analysis.safePlacementTileCount,
      reachableTiles: analysis.reachableTiles,
      warnings: analysis.warnings?.length || 0,
      output: output.slice(0, 2000),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
