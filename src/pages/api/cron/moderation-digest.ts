/**
 * Daily moderation digest.
 *
 * Fired by Vercel cron at 13:00 UTC (8am ET / 4pm Athens). Queries the
 * moderation_blocks table for entries in the last 24 hours; if any exist,
 * sends a single digest email. If nothing was blocked, silently returns 200
 * without sending — no inbox noise on quiet days.
 *
 * Vercel cron requests include an Authorization: Bearer <CRON_SECRET> header
 * when CRON_SECRET is configured in env. We require it in production so this
 * endpoint can't be hit publicly.
 */

import type { APIRoute } from "astro";
import { getRecentModerationBlocks } from "@/lib/supabase";
import { notify } from "@/lib/notify";

export const prerender = false;

const WINDOW_HOURS = 24;

export const GET: APIRoute = async ({ request }) => {
  // In production, require either a Bearer match against CRON_SECRET or the
  // x-vercel-cron header that Vercel sets on its scheduled invocations.
  if (process.env.NODE_ENV === "production") {
    const cronSecret = process.env.CRON_SECRET;
    const bearer = request.headers.get("authorization");
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
    const bearerOk = cronSecret ? bearer === `Bearer ${cronSecret}` : false;
    if (!bearerOk && !isVercelCron) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const sinceISO = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
  const blocks = await getRecentModerationBlocks(sinceISO, 50);

  if (blocks.length === 0) {
    return new Response(
      JSON.stringify({ status: "ok", sent: false, reason: "no blocks in window" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  await notify({
    kind: "moderation_digest",
    data: {
      windowHours: WINDOW_HOURS,
      totalBlocks: blocks.length,
      sample: blocks.slice(0, 20).map((b) => ({
        source: b.source,
        reason: b.reason,
        at: new Date(b.created_at).toLocaleString("en-GB", {
          timeZone: "Europe/Athens",
          dateStyle: "short",
          timeStyle: "short",
        }),
      })),
    },
  });

  return new Response(
    JSON.stringify({ status: "ok", sent: true, totalBlocks: blocks.length }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
