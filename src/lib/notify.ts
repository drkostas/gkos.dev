/**
 * Resend-backed notification helper. Called fire-and-forget after a successful
 * write to the wall / comments / reactions tables (and any other event we
 * decide is interesting). Never blocks the caller — errors log and swallow.
 *
 * Reuses the same RESEND_API_KEY / RESEND_FROM_EMAIL / RESEND_TO_EMAIL env vars
 * that the contact form already uses.
 */

import { Resend } from "resend";

type NotifyKind = "comment" | "reaction" | "wall" | "cv" | "moderation_digest";

interface CommentPayload {
  postSlug: string;
  authorName: string | null;
  body: string;
  country?: string | null;
}
interface ReactionPayload {
  postSlug: string;
  emoji: "like" | "heart" | "celebrate" | "insightful";
  postTotalAfter: number;
  country?: string | null;
}
interface WallPayload {
  name: string;
  message: string;
  color: string;
  country?: string | null;
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

function frame(body: string): string {
  return `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">${body}</div>`;
}

function countryLabel(country?: string | null): string {
  if (!country || country === "XX") return "";
  return ` <span style="font-size: 12px; color: #9ca3af;">· ${escapeHtml(country)}</span>`;
}

function render(payload: NotifyPayload): { subject: string; html: string; text: string } {
  switch (payload.kind) {
    case "comment": {
      const { postSlug, authorName, body, country } = payload.data;
      const author = authorName || "Anonymous";
      const preview = body.length > 220 ? body.slice(0, 220) + "..." : body;
      const link = `https://gkos.dev/blog/${postSlug}#comments`;
      return {
        subject: `[gkos.dev] New comment on /${postSlug} from ${author}`,
        html: frame(
          header(`${escapeHtml(author)} commented on /${escapeHtml(postSlug)}${countryLabel(country)}`, "New blog comment") +
            `<div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #1f2937; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #fafafa;">${escapeHtml(preview)}</div>` +
            footer(link, "Open the post"),
        ),
        text: `${author} commented on /${postSlug}${country ? ` (${country})` : ""}\n\n${preview}\n\n${link}`,
      };
    }
    case "reaction": {
      const { postSlug, emoji, postTotalAfter, country } = payload.data;
      const label = EMOJI_LABEL[emoji];
      const link = `https://gkos.dev/blog/${postSlug}`;
      return {
        subject: `[gkos.dev] ${label} on /${postSlug}`,
        html: frame(
          header(`${label} on /${escapeHtml(postSlug)}${countryLabel(country)}`, "New reaction") +
            `<p style="margin: 0; font-size: 15px; color: #1f2937;">Total reactions on this post: <strong>${postTotalAfter}</strong></p>` +
            footer(link, "Open the post"),
        ),
        text: `${label} on /${postSlug}${country ? ` (${country})` : ""}\nTotal reactions: ${postTotalAfter}\n${link}`,
      };
    }
    case "wall": {
      const { name, message, color, country } = payload.data;
      const preview = message.length > 280 ? message.slice(0, 280) + "..." : message;
      const link = `https://gkos.dev/community-wall`;
      return {
        subject: `[gkos.dev] New wall note from ${name}`,
        html: frame(
          header(`${escapeHtml(name)} left a note${countryLabel(country)}`, "New community wall message") +
            `<div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #1f2937; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #fafafa;">${escapeHtml(preview)}</div>` +
            `<p style="margin: 12px 0 0 0; font-size: 12px; color: #9ca3af;">Color: ${escapeHtml(color)}</p>` +
            footer(link, "Open the wall"),
        ),
        text: `${name} left a wall note${country ? ` (${country})` : ""}\n\n${preview}\n\nColor: ${color}\n${link}`,
      };
    }
    case "cv": {
      const { ip, country, userAgent, referrer } = payload.data;
      return {
        subject: `[gkos.dev] Resume PDF was downloaded`,
        html: frame(
          header(`Someone fetched the resume${countryLabel(country)}`, "CV download") +
            `<table style="font-size: 13px; color: #4b5563; line-height: 1.6;">
              <tr><td style="padding-right: 12px; color: #9ca3af;">IP hash</td><td><code>${escapeHtml(ip)}</code></td></tr>
              ${country ? `<tr><td style="padding-right: 12px; color: #9ca3af;">Country</td><td>${escapeHtml(country)}</td></tr>` : ""}
              ${referrer ? `<tr><td style="padding-right: 12px; color: #9ca3af;">Referrer</td><td>${escapeHtml(referrer)}</td></tr>` : ""}
              ${userAgent ? `<tr><td style="padding-right: 12px; color: #9ca3af; vertical-align: top;">User-Agent</td><td style="word-break: break-all;">${escapeHtml(userAgent.slice(0, 200))}</td></tr>` : ""}
            </table>`,
        ),
        text: `CV PDF download\nIP hash: ${ip}${country ? `\nCountry: ${country}` : ""}${referrer ? `\nReferrer: ${referrer}` : ""}${userAgent ? `\nUA: ${userAgent.slice(0, 200)}` : ""}`,
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
