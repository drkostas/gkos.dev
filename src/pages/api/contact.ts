import type { APIRoute } from "astro";
import { Resend } from "resend";

export const prerender = false;

// Hybrid env access: import.meta.env for dev, process.env for Vercel runtime
const resend = new Resend(
  import.meta.env.RESEND_API_KEY ?? process.env.RESEND_API_KEY,
);

// Very light in-memory rate limit: one submission per IP per 60 seconds.
// Lost on server restart — fine for a small portfolio, not worth a DB.
const recentSubmissions = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60_000;

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const last = recentSubmissions.get(ip);
  if (!last) return false;
  return Date.now() - last < RATE_LIMIT_WINDOW_MS;
}

function markSubmission(ip: string): void {
  recentSubmissions.set(ip, Date.now());
  // Prune old entries occasionally to prevent unbounded growth
  if (recentSubmissions.size > 500) {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    for (const [key, time] of recentSubmissions) {
      if (time < cutoff) recentSubmissions.delete(key);
    }
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, message, website } = body as {
      name?: string;
      email?: string;
      message?: string;
      website?: string; // honeypot — real users won't fill this
    };

    // Honeypot: if a bot filled the hidden field, pretend success but do nothing
    if (website && website.length > 0) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Validation
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: "All fields are required." }),
        { status: 400 },
      );
    }
    if (name.length > 100 || email.length > 200 || message.length > 5000) {
      return new Response(
        JSON.stringify({ ok: false, error: "Please keep your message under 5000 characters." }),
        { status: 400 },
      );
    }
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ ok: false, error: "That email address doesn't look right." }),
        { status: 400 },
      );
    }

    // Rate limit by IP
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Slow down — please wait a minute before sending again." }),
        { status: 429 },
      );
    }

    const fromAddress =
      import.meta.env.RESEND_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "Kostas <contact@gkos.dev>";
    const toAddress =
      import.meta.env.RESEND_TO_EMAIL ?? process.env.RESEND_TO_EMAIL ?? "gkos.mldev@gmail.com";

    // Send the email
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: toAddress,
      replyTo: email,
      subject: `[gkos.dev] Message from ${name}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="border-left: 4px solid #9B7BF7; padding-left: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">New contact form message</p>
            <h2 style="margin: 0; font-size: 18px; color: #111827;">From ${escapeHtml(name)}</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">
              <a href="mailto:${escapeHtml(email)}" style="color: #4f46e5; text-decoration: none;">${escapeHtml(email)}</a>
            </p>
          </div>
          <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #1f2937;">${escapeHtml(message)}</div>
          <p style="margin-top: 32px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            Reply directly to this email to respond to ${escapeHtml(name)}.
          </p>
        </div>
      `,
      text: `New contact form message from ${name} <${email}>\n\n${message}\n\n—\nReply directly to this email to respond.`,
    });

    if (error) {
      console.error("[contact] Resend error:", error);
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to send the message. Please try again or email me directly." }),
        { status: 500 },
      );
    }

    markSubmission(ip);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("[contact] Unexpected error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Something went wrong. Please try again." }),
      { status: 500 },
    );
  }
};
