import type { APIRoute } from "astro";
import { spawn } from "node:child_process";
import path from "node:path";
import { BLOG_CONTENT_DIR, assertSafeSlug } from "@/server/adminFs";

export const prerender = false;

/**
 * Revert a blog post MDX to the state in the last git commit.
 *   git checkout HEAD -- src/content/blog/<slug>.mdx
 * Fails if the file isn't tracked (e.g. freshly created, never committed).
 */
export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return new Response("Not Found", { status: 404 });

  const body = await request.json().catch(() => null);
  const { slug } = body || {};
  if (typeof slug !== "string") {
    return new Response(JSON.stringify({ ok: false, error: "Missing slug" }), { status: 400 });
  }
  try {
    assertSafeSlug(slug);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 400 });
  }

  const relPath = path.relative(process.cwd(), path.join(BLOG_CONTENT_DIR, `${slug}.mdx`));
  const { code, stderr } = await runGit(["checkout", "HEAD", "--", relPath]);
  if (code !== 0) {
    return new Response(JSON.stringify({ ok: false, error: stderr || `git exited ${code}` }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

function runGit(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("close", (code) => resolve({ code: code ?? 0, stdout, stderr }));
    child.on("error", (err) => resolve({ code: 1, stdout, stderr: String(err) }));
  });
}
