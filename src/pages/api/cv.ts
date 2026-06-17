/**
 * CV download endpoint.
 *
 * Public links pointed at /api/cv get a 302 to the actual PDF. Every fetch
 * also fires a Resend notification so we know when a recruiter (or anyone)
 * has pulled the resume.
 *
 * In-memory IP cooldown of 10 minutes prevents notification spam if the same
 * person refreshes or the PDF is fetched multiple times in quick succession
 * (some browsers do a HEAD + GET, some preview the file inline).
 */

import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { getCountry, getVisitorInfo } from "@/lib/visitor";
import { notify } from "@/lib/notify";
import { addCvDownload } from "@/lib/supabase";

export const prerender = false;

const PDF_PATH = "/kostas-georgiou-resume.pdf";
const COOLDOWN_MS = 10 * 60 * 1000; // 10 min per IP-hash
const recentNotifies = new Map<string, number>();

const IP_HASH_SALT =
  process.env.IP_HASH_SALT ?? "portfolio-v2-reactions-default-salt";

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

function hashIp(ip: string, ua: string): string {
  return createHash("sha256")
    .update(`${ip}|${ua}|${IP_HASH_SALT}`)
    .digest("hex")
    .slice(0, 24);
}

function shouldNotify(ipHash: string): boolean {
  const now = Date.now();
  const last = recentNotifies.get(ipHash) ?? 0;
  if (now - last < COOLDOWN_MS) return false;
  recentNotifies.set(ipHash, now);
  // Periodic cleanup of stale entries.
  if (recentNotifies.size > 500) {
    const cutoff = now - COOLDOWN_MS;
    for (const [key, time] of recentNotifies) {
      if (time < cutoff) recentNotifies.delete(key);
    }
  }
  return true;
}

function isLikelyBot(ua: string | null): boolean {
  if (!ua) return true;
  return /bot|crawler|spider|scraper|curl|wget|python-requests|httpx|fetch\//i.test(ua);
}

export const GET: APIRoute = async ({ request, redirect }) => {
  const ua = request.headers.get("user-agent") ?? "";
  const ip = getClientIp(request);
  const ipHash = hashIp(ip, ua);
  const country = getCountry(request);
  const referrer = request.headers.get("referer") ?? null;

  // Don't count bots in either the notification or the Supabase counter.
  if (!isLikelyBot(ua)) {
    // Persist every non-bot download. The unique index on (ip_hash, day_bucket)
    // dedups same-day refreshes for free, so the count reflects unique
    // visitor-days, not raw fetch count.
    const visitor = getVisitorInfo(request);
    void addCvDownload(
      ipHash,
      {
        country: visitor.country,
        deviceType: visitor.deviceType,
        browserFamily: visitor.browserFamily,
      },
      referrer,
    );

    // Notify only on the first download from this IP within the in-process
    // cooldown window (10 min). Cheaper than hitting Supabase to dedup.
    if (shouldNotify(ipHash)) {
      void notify({
        kind: "cv",
        data: {
          ip: ipHash,
          visitor: {
            country: visitor.country,
            city: visitor.city,
            region: visitor.region,
            device: visitor.deviceType,
            browser: visitor.browserFamily,
            browserVersion: visitor.browserVersion,
            os: visitor.osFamily,
            userAgent: visitor.userAgent,
            referrer,
            language: visitor.acceptLanguage,
          },
        },
      });
    }
  }

  return redirect(PDF_PATH, 302);
};
