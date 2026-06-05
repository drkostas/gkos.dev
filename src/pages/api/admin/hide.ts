/**
 * One-click moderation. Reached via a signed link in every notification
 * email — e.g. https://gkos.dev/api/admin/hide?kind=comment&id=<uuid>&t=<hmac>.
 *
 * For comments + wall_messages: sets hidden = true (soft-delete; row still in
 * the table for audit / restore).
 *
 * For reactions: deletes the row outright (no hidden column on that table).
 *
 * Auth: HMAC-SHA256 over `${kind}:${id}` using ADMIN_TOKEN_SECRET, first 16
 * hex chars. Without the secret set, the endpoint rejects all requests.
 *
 * Public — but the URL is only printable by the email pipeline (which only
 * runs server-side with the secret available). Anyone with the URL can hide
 * the specific row it points at; nothing else.
 */

import type { APIRoute } from "astro";
import { verifyAdminToken, type AdminAction } from "@/lib/admin-tokens";
import {
  deleteReactionById,
  hideCommentById,
  hideWallMessageById,
} from "@/lib/supabase";

export const prerender = false;

const KINDS: readonly AdminAction[] = ["comment", "wall", "reaction"] as const;

function isKind(s: string): s is AdminAction {
  return (KINDS as readonly string[]).includes(s);
}

function html(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} · gkos.dev</title>
  <meta name="robots" content="noindex">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 32rem; margin: 6rem auto; padding: 0 1.5rem; color: #1f2937; line-height: 1.5; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    p { color: #4b5563; margin: 0.25rem 0; }
    a { color: #4f46e5; }
    .ok { color: #047857; }
    .err { color: #b91c1c; }
  </style>
</head>
<body>
  ${body}
  <p style="margin-top: 2rem;"><a href="https://gkos.dev/stats">← back to stats</a></p>
</body>
</html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const GET: APIRoute = async ({ url }) => {
  const kind = url.searchParams.get("kind") ?? "";
  const id = url.searchParams.get("id") ?? "";
  const token = url.searchParams.get("t") ?? "";

  if (!isKind(kind)) {
    return html("Invalid", `<h1 class="err">Invalid kind</h1>`, 400);
  }
  if (!id || id.length < 8 || id.length > 40) {
    return html("Invalid", `<h1 class="err">Invalid id</h1>`, 400);
  }
  if (!verifyAdminToken(kind, id, token)) {
    return html("Forbidden", `<h1 class="err">Bad or missing token</h1>`, 403);
  }

  let ok = false;
  let label = "";
  if (kind === "comment") {
    ok = await hideCommentById(id);
    label = "Comment hidden";
  } else if (kind === "wall") {
    ok = await hideWallMessageById(id);
    label = "Wall message hidden";
  } else if (kind === "reaction") {
    ok = await deleteReactionById(id);
    label = "Reaction deleted";
  }

  if (!ok) {
    return html("Error", `<h1 class="err">Couldn't ${kind === "reaction" ? "delete" : "hide"} that ${kind}</h1><p>Check the server logs.</p>`, 500);
  }
  return html(label, `<h1 class="ok">${label}</h1><p>It won't show on the site anymore.</p><p style="font-size: 0.85rem; color: #6b7280; font-family: ui-monospace, monospace;">${kind} · ${id}</p>`);
};
