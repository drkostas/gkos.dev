/**
 * Per-request visitor signals derived from Vercel/Cloudflare-injected headers
 * and the User-Agent string. Cheap, no external lookups, no PII stored.
 *
 * Used by the POST handlers (comments, reactions, wall, cv) to populate the
 * country / device_type / browser_family columns on each row.
 */

export type DeviceType = "mobile" | "tablet" | "desktop" | "bot" | "unknown";
export type BrowserFamily =
  | "chrome"
  | "safari"
  | "firefox"
  | "edge"
  | "opera"
  | "samsung"
  | "other"
  | "bot"
  | "unknown";

export interface VisitorInfo {
  country: string | null; // ISO 3166-1 alpha-2, or null if unknown
  deviceType: DeviceType;
  browserFamily: BrowserFamily;
}

/** Country from Vercel's CF-IPCountry / Vercel-IP-Country headers. */
export function getCountry(req: Request): string | null {
  const headers = req.headers;
  // Vercel uses both names depending on edge routing.
  const candidates = [
    headers.get("x-vercel-ip-country"),
    headers.get("cf-ipcountry"),
    headers.get("x-country"),
  ];
  for (const c of candidates) {
    if (c && c.length === 2 && c !== "XX") return c.toUpperCase();
  }
  return null;
}

/** Classify a User-Agent into a coarse device + browser bucket. */
export function parseUserAgent(ua: string | null): {
  deviceType: DeviceType;
  browserFamily: BrowserFamily;
} {
  if (!ua) return { deviceType: "unknown", browserFamily: "unknown" };
  const lower = ua.toLowerCase();

  // Bot heuristic — quick and lossy but catches the obvious ones.
  if (/bot|crawler|spider|scraper|curl|wget|python-requests|httpx|fetch\//i.test(lower)) {
    return { deviceType: "bot", browserFamily: "bot" };
  }

  const isTablet = /ipad|tablet|playbook|silk/i.test(lower) && !/mobile/i.test(lower);
  const isMobile =
    !isTablet &&
    /android.*mobile|iphone|ipod|windows phone|mobile safari|opera mini|opera mobi|blackberry|iemobile/i.test(
      lower,
    );
  const deviceType: DeviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let browserFamily: BrowserFamily;
  // Order matters: Edge identifies as Chrome+Edg, Samsung as Chrome+SamsungBrowser, etc.
  if (/edg(e|a|ios)?\//.test(lower)) browserFamily = "edge";
  else if (/samsungbrowser/.test(lower)) browserFamily = "samsung";
  else if (/opr\/|opera/.test(lower)) browserFamily = "opera";
  else if (/firefox|fxios/.test(lower)) browserFamily = "firefox";
  else if (/chrome|crios/.test(lower)) browserFamily = "chrome";
  else if (/safari/.test(lower) && !/chrome|crios|fxios|edg/.test(lower)) browserFamily = "safari";
  else browserFamily = "other";

  return { deviceType, browserFamily };
}

/** One-shot helper: country + device + browser, ready to spread onto an insert row. */
export function getVisitorInfo(req: Request): VisitorInfo {
  const ua = req.headers.get("user-agent");
  const { deviceType, browserFamily } = parseUserAgent(ua);
  return {
    country: getCountry(req),
    deviceType,
    browserFamily,
  };
}
