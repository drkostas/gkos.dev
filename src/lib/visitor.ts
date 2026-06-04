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
export type OSFamily =
  | "macOS"
  | "Windows"
  | "iOS"
  | "iPadOS"
  | "Android"
  | "Linux"
  | "ChromeOS"
  | "other"
  | "bot"
  | "unknown";

export interface VisitorInfo {
  country: string | null; // ISO 3166-1 alpha-2, or null if unknown
  city: string | null; // best-effort from Vercel/Cloudflare; usually null
  region: string | null; // state/province, when available
  deviceType: DeviceType;
  browserFamily: BrowserFamily;
  browserVersion: string | null;
  osFamily: OSFamily;
  userAgent: string | null;
  referrer: string | null;
  acceptLanguage: string | null;
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

/** Classify a User-Agent into device / browser (with version) / OS buckets. */
export function parseUserAgent(ua: string | null): {
  deviceType: DeviceType;
  browserFamily: BrowserFamily;
  browserVersion: string | null;
  osFamily: OSFamily;
} {
  if (!ua) {
    return { deviceType: "unknown", browserFamily: "unknown", browserVersion: null, osFamily: "unknown" };
  }
  const lower = ua.toLowerCase();

  if (/bot|crawler|spider|scraper|curl|wget|python-requests|httpx|fetch\//i.test(lower)) {
    return { deviceType: "bot", browserFamily: "bot", browserVersion: null, osFamily: "bot" };
  }

  const isTablet = /ipad|tablet|playbook|silk/i.test(lower) && !/mobile/i.test(lower);
  const isMobile =
    !isTablet &&
    /android.*mobile|iphone|ipod|windows phone|mobile safari|opera mini|opera mobi|blackberry|iemobile/i.test(
      lower,
    );
  const deviceType: DeviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  // Browser family + version. Order matters since UAs lie.
  let browserFamily: BrowserFamily = "other";
  let browserVersion: string | null = null;
  const matchVersion = (re: RegExp): string | null => {
    const m = ua.match(re);
    return m ? m[1] : null;
  };
  if (/edg(e|a|ios)?\//i.test(ua)) {
    browserFamily = "edge";
    browserVersion = matchVersion(/edg(?:e|a|ios)?\/([\d.]+)/i);
  } else if (/samsungbrowser/i.test(ua)) {
    browserFamily = "samsung";
    browserVersion = matchVersion(/samsungbrowser\/([\d.]+)/i);
  } else if (/opr\/|opera/i.test(ua)) {
    browserFamily = "opera";
    browserVersion = matchVersion(/(?:opr|opera)\/([\d.]+)/i);
  } else if (/firefox|fxios/i.test(ua)) {
    browserFamily = "firefox";
    browserVersion = matchVersion(/(?:firefox|fxios)\/([\d.]+)/i);
  } else if (/chrome|crios/i.test(ua)) {
    browserFamily = "chrome";
    browserVersion = matchVersion(/(?:chrome|crios)\/([\d.]+)/i);
  } else if (/safari/i.test(ua) && !/chrome|crios|fxios|edg/i.test(ua)) {
    browserFamily = "safari";
    browserVersion = matchVersion(/version\/([\d.]+)/i);
  }

  // OS family.
  let osFamily: OSFamily = "other";
  if (/iphone|ipod/i.test(ua)) osFamily = "iOS";
  else if (/ipad/i.test(ua)) osFamily = "iPadOS";
  else if (/android/i.test(ua)) osFamily = "Android";
  else if (/cros/i.test(ua)) osFamily = "ChromeOS";
  else if (/mac os x|macintosh/i.test(ua)) osFamily = "macOS";
  else if (/windows/i.test(ua)) osFamily = "Windows";
  else if (/linux/i.test(ua)) osFamily = "Linux";

  return { deviceType, browserFamily, browserVersion, osFamily };
}

/** One-shot helper: full demographics + raw signals ready for email + DB insert. */
export function getVisitorInfo(req: Request): VisitorInfo {
  const headers = req.headers;
  const ua = headers.get("user-agent");
  const { deviceType, browserFamily, browserVersion, osFamily } = parseUserAgent(ua);
  return {
    country: getCountry(req),
    city: headers.get("x-vercel-ip-city") ?? headers.get("cf-ipcity") ?? null,
    region:
      headers.get("x-vercel-ip-country-region") ??
      headers.get("cf-region-code") ??
      null,
    deviceType,
    browserFamily,
    browserVersion,
    osFamily,
    userAgent: ua,
    referrer: headers.get("referer") ?? null,
    acceptLanguage: headers.get("accept-language") ?? null,
  };
}
