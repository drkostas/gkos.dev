import type { APIRoute } from "astro";
import { execSync } from "child_process";

export const prerender = false;

export const POST: APIRoute = async () => {
  if (!import.meta.env.DEV) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    execSync("node scripts/editor-data-export.mjs", {
      cwd: process.cwd(),
      timeout: 10000,
      stdio: "pipe",
    });
    return new Response(JSON.stringify({ success: true }), {
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
