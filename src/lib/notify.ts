/**
 * Resend-backed notification helper. Called fire-and-forget after a successful
 * write to the wall / comments / reactions tables (and any other event we
 * decide is interesting). Never blocks the caller — errors log and swallow.
 *
 * Reuses the same RESEND_API_KEY / RESEND_FROM_EMAIL / RESEND_TO_EMAIL env vars
 * that the contact form already uses.
 */

import { Resend } from "resend";
import { hideUrl } from "@/lib/admin-tokens";

type NotifyKind = "comment" | "reaction" | "wall" | "cv" | "moderation_digest";

/** Rich visitor block surfaced at the bottom of every event email. */
export interface VisitorBlock {
  country?: string | null;
  city?: string | null;
  region?: string | null;
  device?: string | null;
  browser?: string | null;
  browserVersion?: string | null;
  os?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  language?: string | null;
}

interface CommentPayload {
  postSlug: string;
  authorName: string | null;
  body: string;
  entityId?: string; // row id — enables one-click "hide" link
  visitor?: VisitorBlock;
}
interface ReactionPayload {
  postSlug: string;
  emoji: "like" | "heart" | "celebrate" | "insightful";
  postTotalAfter: number;
  entityId?: string;
  visitor?: VisitorBlock;
}
interface WallPayload {
  name: string;
  message: string;
  color: string;
  entityId?: string;
  visitor?: VisitorBlock;
}
interface CvPayload {
  ip: string;
  country?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
}
interface ModerationDigestPayload {
  windowHours: number;
  totalBlocks: number;
  sample: { source: string; reason: string; at: string }[];
}

type NotifyPayload =
  | { kind: "comment"; data: CommentPayload }
  | { kind: "reaction"; data: ReactionPayload }
  | { kind: "wall"; data: WallPayload }
  | { kind: "cv"; data: CvPayload }
  | { kind: "moderation_digest"; data: ModerationDigestPayload };

const EMOJI_LABEL: Record<ReactionPayload["emoji"], string> = {
  like: "👍 Like",
  heart: "❤️ Heart",
  celebrate: "🎉 Celebrate",
  insightful: "💡 Insightful",
};

function envVar(name: string): string | undefined {
  return (
    (import.meta.env?.[name] as string | undefined) ??
    process.env[name] ??
    undefined
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function header(title: string, eyebrow: string): string {
  return `
    <div style="border-left: 4px solid #9B7BF7; padding-left: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">${escapeHtml(eyebrow)}</p>
      <h2 style="margin: 0; font-size: 18px; color: #111827;">${escapeHtml(title)}</h2>
    </div>
  `;
}

function footer(href?: string, label?: string): string {
  if (!href || !label) return "";
  return `
    <p style="margin-top: 32px; font-size: 13px;">
      <a href="${href}" style="color: #4f46e5; text-decoration: none;">${escapeHtml(label)} →</a>
    </p>
  `;
}

/** Render the "Hide / Delete" admin link if we can sign one. */
function adminAction(kind: "comment" | "wall" | "reaction", id?: string): string {
  if (!id) return "";
  const url = hideUrl(kind, id);
  if (!url) return "";
  const label = kind === "reaction" ? "Delete this reaction" : `Hide this ${kind === "wall" ? "message" : kind}`;
  return `
    <p style="margin: 12px 0 0 0; font-size: 12px;">
      <a href="${url}" style="color: #b91c1c; text-decoration: none;">${escapeHtml(label)}</a>
    </p>
  `;
}

function frame(body: string): string {
  return `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">${body}</div>`;
}

function countryFlag(iso?: string | null): string {
  if (!iso || iso.length !== 2) return "";
  const cps = iso.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...cps);
}

function titleCase(s?: string | null): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Full HTML visitor block — table with each available signal on its own row. */
function visitorBlock(v?: VisitorBlock): string {
  if (!v) return "";
  const rows: { label: string; value: string }[] = [];
  if (v.country && v.country !== "XX") {
    const flag = countryFlag(v.country);
    const place = [v.city, v.region, v.country].filter(Boolean).join(", ");
    rows.push({ label: "Location", value: `${flag ? flag + " " : ""}${place}` });
  }
  if (v.device) rows.push({ label: "Device", value: titleCase(v.device) });
  if (v.os) rows.push({ label: "OS", value: v.os });
  if (v.browser) {
    const b = titleCase(v.browser) + (v.browserVersion ? ` ${v.browserVersion}` : "");
    rows.push({ label: "Browser", value: b });
  }
  if (v.language) rows.push({ label: "Language", value: v.language.split(",")[0] });
  if (v.referrer) rows.push({ label: "Referrer", value: v.referrer });
  if (v.userAgent) rows.push({ label: "User-Agent", value: v.userAgent.slice(0, 240) });
  if (rows.length === 0) return "";
  return `
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; font-size: 11px; color: #9ca3af; font-family: ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.08em;">Visitor</p>
      <table style="font-size: 12px; color: #4b5563; line-height: 1.5; border-collapse: collapse;">
        ${rows
          .map(
            (r) =>
              `<tr><td style="padding: 2px 12px 2px 0; color: #9ca3af; vertical-align: top; white-space: nowrap;">${escapeHtml(r.label)}</td><td style="padding: 2px 0; word-break: break-all;">${escapeHtml(r.value)}</td></tr>`,
          )
          .join("")}
      </table>
    </div>
  `;
}

/** Plain-text visitor block for the text/plain MIME part. */
function visitorBlockText(v?: VisitorBlock): string {
  if (!v) return "";
  const lines: string[] = [];
  if (v.country && v.country !== "XX") {
    const place = [v.city, v.region, v.country].filter(Boolean).join(", ");
    lines.push(`Location: ${place}`);
  }
  if (v.device) lines.push(`Device: ${titleCase(v.device)}`);
  if (v.os) lines.push(`OS: ${v.os}`);
  if (v.browser) lines.push(`Browser: ${titleCase(v.browser)}${v.browserVersion ? ` ${v.browserVersion}` : ""}`);
  if (v.language) lines.push(`Language: ${v.language.split(",")[0]}`);
  if (v.referrer) lines.push(`Referrer: ${v.referrer}`);
  if (v.userAgent) lines.push(`UA: ${v.userAgent.slice(0, 240)}`);
  return lines.length ? "\n\n" + lines.join("\n") : "";
}

function render(payload: NotifyPayload): { subject: string; html: string; text: string } {
  switch (payload.kind) {
    case "comment": {
      const { postSlug, authorName, body, entityId, visitor } = payload.data;
      const author = authorName || "Anonymous";
      const preview = body.length > 280 ? body.slice(0, 280) + "..." : body;
      const link = `https://gkos.dev/blog/${postSlug}#comments`;
      return {
        subject: `[gkos.dev] New comment on /${postSlug} from ${author}`,
        html: frame(
          header(`${escapeHtml(author)} commented on /${escapeHtml(postSlug)}`, "New blog comment") +
            `<div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #1f2937; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #fafafa;">${escapeHtml(preview)}</div>` +
            footer(link, "Open the post") +
            adminAction("comment", entityId) +
            visitorBlock(visitor),
        ),
        text: `${author} commented on /${postSlug}\n\n${preview}\n\n${link}${visitorBlockText(visitor)}`,
      };
    }
    case "reaction": {
      const { postSlug, emoji, postTotalAfter, entityId, visitor } = payload.data;
      const label = EMOJI_LABEL[emoji];
      const link = `https://gkos.dev/blog/${postSlug}`;
      return {
        subject: `[gkos.dev] ${label} on /${postSlug}`,
        html: frame(
          header(`${label} on /${escapeHtml(postSlug)}`, "New reaction") +
            `<p style="margin: 0; font-size: 15px; color: #1f2937;">Total reactions on this post: <strong>${postTotalAfter}</strong></p>` +
            footer(link, "Open the post") +
            adminAction("reaction", entityId) +
            visitorBlock(visitor),
        ),
        text: `${label} on /${postSlug}\nTotal reactions: ${postTotalAfter}\n${link}${visitorBlockText(visitor)}`,
      };
    }
    case "wall": {
      const { name, message, color, entityId, visitor } = payload.data;
      const preview = message.length > 280 ? message.slice(0, 280) + "..." : message;
      const link = `https://gkos.dev/community-wall`;
      return {
        subject: `[gkos.dev] New wall note from ${name}`,
        html: frame(
          header(`${escapeHtml(name)} left a note`, "New community wall message") +
            `<div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #1f2937; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #fafafa;">${escapeHtml(preview)}</div>` +
            `<p style="margin: 12px 0 0 0; font-size: 12px; color: #9ca3af;">Color: ${escapeHtml(color)}</p>` +
            footer(link, "Open the wall") +
            adminAction("wall", entityId) +
            visitorBlock(visitor),
        ),
        text: `${name} left a wall note\n\n${preview}\n\nColor: ${color}\n${link}${visitorBlockText(visitor)}`,
      };
    }
    case "cv": {
      const { ip, country, userAgent, referrer } = payload.data;
      const flag = countryFlag(country);
      return {
        subject: `[gkos.dev] Resume PDF was downloaded${country ? ` (${country})` : ""}`,
        html: frame(
          header(`${flag ? flag + " " : ""}Someone fetched the resume`, "CV download") +
            `<table style="font-size: 13px; color: #4b5563; line-height: 1.6;">
              ${country ? `<tr><td style="padding-right: 12px; color: #9ca3af;">Country</td><td>${escapeHtml(country)}</td></tr>` : ""}
              ${referrer ? `<tr><td style="padding-right: 12px; color: #9ca3af;">Referrer</td><td>${escapeHtml(referrer)}</td></tr>` : ""}
              ${userAgent ? `<tr><td style="padding-right: 12px; color: #9ca3af; vertical-align: top;">User-Agent</td><td style="word-break: break-all;">${escapeHtml(userAgent.slice(0, 200))}</td></tr>` : ""}
              <tr><td style="padding-right: 12px; color: #9ca3af;">IP hash</td><td><code>${escapeHtml(ip)}</code></td></tr>
            </table>`,
        ),
        text: `CV PDF download${country ? `\nCountry: ${country}` : ""}${referrer ? `\nReferrer: ${referrer}` : ""}${userAgent ? `\nUA: ${userAgent.slice(0, 200)}` : ""}\nIP hash: ${ip}`,
      };
    }
    case "moderation_digest": {
      const { windowHours, totalBlocks, sample } = payload.data;
      return {
        subject: `[gkos.dev] ${totalBlocks} moderation block${totalBlocks === 1 ? "" : "s"} in the last ${windowHours}h`,
        html: frame(
          header(`${totalBlocks} blocked submission${totalBlocks === 1 ? "" : "s"} in the last ${windowHours}h`, "Moderation digest") +
            (sample.length === 0
              ? `<p style="font-size: 14px; color: #4b5563;">Nothing blocked. Just FYI.</p>`
              : `<ul style="margin: 0; padding: 0 0 0 18px; font-size: 13px; color: #1f2937;">
                  ${sample
                    .map(
                      (s) =>
                        `<li style="margin-bottom: 6px;"><strong>${escapeHtml(s.source)}</strong> · <span style="color: #6b7280;">${escapeHtml(s.reason)}</span> · <span style="color: #9ca3af;">${escapeHtml(s.at)}</span></li>`,
                    )
                    .join("")}
                </ul>`),
        ),
        text: `${totalBlocks} blocked submissions in the last ${windowHours}h\n\n${sample.map((s) => `${s.source}: ${s.reason} (${s.at})`).join("\n")}`,
      };
    }
  }
}

/**
 * Send a notification email. Never throws — errors are logged and swallowed
 * so a failed notification can't break the user-facing POST handler.
 *
 * Skips silently if RESEND_API_KEY is missing (e.g. local dev without keys).
 */
export async function notify(payload: NotifyPayload): Promise<void> {
  const apiKey = envVar("RESEND_API_KEY");
  if (!apiKey) {
    console.warn(`[notify:${payload.kind}] RESEND_API_KEY missing — skipping`);
    return;
  }
  const from = envVar("RESEND_FROM_EMAIL") ?? "Kostas <contact@gkos.dev>";
  const to = envVar("RESEND_TO_EMAIL") ?? "gkos.mldev@gmail.com";

  try {
    const resend = new Resend(apiKey);
    const { subject, html, text } = render(payload);
    const { error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) {
      console.error(`[notify:${payload.kind}] Resend error:`, error);
    }
  } catch (err) {
    console.error(`[notify:${payload.kind}] unexpected:`, err);
  }
}
