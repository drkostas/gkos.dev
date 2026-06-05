/**
 * One-click "hide / delete" tokens for moderation links in notification emails.
 *
 * Token = first 16 hex chars of HMAC-SHA256(`${kind}:${id}`, ADMIN_TOKEN_SECRET).
 * Short enough to fit cleanly in a URL, long enough that brute-forcing it
 * within Vercel's request budget is infeasible.
 *
 * Verification is constant-time (timingSafeEqual) to avoid leaks via timing.
 *
 * Without ADMIN_TOKEN_SECRET set, signing returns null and verification
 * rejects everything — endpoint stays safe even if the secret is missing.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type AdminAction = "comment" | "wall" | "reaction";

function getSecret(): string | null {
  return (
    (import.meta.env?.ADMIN_TOKEN_SECRET as string | undefined) ??
    process.env.ADMIN_TOKEN_SECRET ??
    null
  );
}

export function signAdminToken(kind: AdminAction, id: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(`${kind}:${id}`).digest("hex").slice(0, 16);
}

export function verifyAdminToken(
  kind: AdminAction,
  id: string,
  token: string,
): boolean {
  if (!token || token.length !== 16) return false;
  const expected = signAdminToken(kind, id);
  if (!expected) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex"));
  } catch {
    return false;
  }
}

/** Build the full hide URL surfaced in notification emails. */
export function hideUrl(kind: AdminAction, id: string): string | null {
  const token = signAdminToken(kind, id);
  if (!token) return null;
  const qs = new URLSearchParams({ kind, id, t: token }).toString();
  return `https://gkos.dev/api/admin/hide?${qs}`;
}
