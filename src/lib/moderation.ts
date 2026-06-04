// Content moderation module — used by the wall, future blog comments, etc.
//
// Two layers:
//   1. Safety — OpenAI Moderations API. Catches hate/harassment/sexual/violence/self-harm.
//   2. Tone — gpt-4o-mini classifier with a custom prompt. Catches generic
//      negativity / rudeness / badmouthing that the safety layer misses.
//
// Both layers FAIL OPEN: if the API key is missing or the call errors, the
// content is allowed through. This keeps the site functional during outages.
//
// Usage:
//   const r = await checkContent(text, "strict");
//   if (!r.ok) return error(r.reason);
//
// Policies:
//   "strict"   — runs both layers. Use for guestbook, blog comments, anywhere
//                you want only kind or constructive content.
//   "standard" — runs only the safety layer. Use for inputs where harsh
//                criticism is acceptable (e.g. internal notes, contact forms).

export type ContentPolicy = "strict" | "standard";

export type ContentTone = "NICE" | "CONSTRUCTIVE";

export type ContentCheckResult =
  | { ok: true; tone?: ContentTone }
  | {
      ok: false;
      category: "safety" | "tone";
      reason: string;
      details?: string;
    };

// --- Tone classifier prompt ---
// Tuned to flag generic negativity (mid/boring/trash) even when polite-sounding,
// while letting genuine constructive criticism (disagreement + specifics) through.
const TONE_SYSTEM_PROMPT = `You classify messages submitted to a public guestbook on a personal portfolio website. The site owner wants ONLY kind comments and polite, specific, actionable feedback. Generic negativity or rudeness should be rejected.

Output exactly one word, one of:

NICE — kind, friendly, supportive, or a simple greeting. Brief positive emoji-only messages count.

CONSTRUCTIVE — contains negative observations, but they are SPECIFIC, POLITE, and ACTIONABLE. The author offers something the owner could act on. Disagreement is fine when respectful and specific.

RUDE — Anything the owner would not want to read on their own wall. This includes:
  - Generic put-downs without specific detail ("mid", "boring", "trash", "eh", "could be better")
  - Insults toward the owner or their work ("you suck", "talentless", "what a waste")
  - Sarcasm, mockery, or condescension
  - Profanity directed at the site, content, or owner
  - Vague negativity without actionable specifics
  - Telling the owner to quit, give up, or stop

Examples:
"Loved the explore mode!" → NICE
"👋" → NICE
"Hi from a fellow PhD!" → NICE
"The mobile menu feels a bit slow on Pixel." → CONSTRUCTIVE
"Disagree with your TypeScript take, but loved the depth." → CONSTRUCTIVE
"Beautiful site. Found a typo in /about, second paragraph." → CONSTRUCTIVE
"Mid portfolio honestly." → RUDE
"Boring." → RUDE
"Could be better." → RUDE
"Fuck this site." → RUDE
"Your code is trash and so are you." → RUDE
"I've seen better from college freshmen." → RUDE
"Saw worse, saw better." → RUDE

Output one word: NICE, CONSTRUCTIVE, or RUDE. Nothing else.`;

function getApiKey(): string | null {
  // Astro/Vite (server-side) and pure Node both work via this fallback chain.
  const fromImport =
    typeof import.meta !== "undefined" && (import.meta as any).env?.OPENAI_API_KEY;
  return fromImport ?? process.env.OPENAI_API_KEY ?? null;
}

async function checkSafety(
  text: string,
  apiKey: string,
): Promise<ContentCheckResult> {
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text,
      }),
    });
    if (!res.ok) {
      console.warn("[moderation] safety API error", res.status);
      return { ok: true }; // fail open
    }
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) return { ok: true };
    if (r.flagged) {
      const flagged = Object.entries(r.categories ?? {})
        .filter(([, v]) => v === true)
        .map(([k]) => k);
      const primary = flagged[0] ?? "policy";
      return {
        ok: false,
        category: "safety",
        reason: `Message flagged (${primary}). Please rephrase and try again.`,
        details: flagged.join(","),
      };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[moderation] safety fetch failed", err);
    return { ok: true }; // fail open
  }
}

async function checkTone(
  text: string,
  apiKey: string,
): Promise<ContentCheckResult> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 5,
        temperature: 0,
        messages: [
          { role: "system", content: TONE_SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) {
      console.warn("[moderation] tone API error", res.status);
      return { ok: true }; // fail open
    }
    const data = await res.json();
    const raw = (data?.choices?.[0]?.message?.content ?? "").trim().toUpperCase();
    // Pick the first word in case the model adds anything extra.
    const tone = raw.split(/\s+|[^A-Z]/)[0];
    if (tone === "NICE") return { ok: true, tone: "NICE" };
    if (tone === "CONSTRUCTIVE") return { ok: true, tone: "CONSTRUCTIVE" };
    if (tone === "RUDE") {
      return {
        ok: false,
        category: "tone",
        reason:
          "This wall is for nice comments and polite, specific feedback. Please rephrase.",
      };
    }
    console.warn("[moderation] tone classifier returned unexpected:", raw);
    return { ok: true }; // fail open on unknown labels
  } catch (err) {
    console.warn("[moderation] tone fetch failed", err);
    return { ok: true }; // fail open
  }
}

export async function checkContent(
  text: string,
  policy: ContentPolicy = "strict",
): Promise<ContentCheckResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[moderation] OPENAI_API_KEY missing — skipping all checks");
    return { ok: true };
  }

  // 1. Safety layer (always)
  const safety = await checkSafety(text, apiKey);
  if (!safety.ok) return safety;

  // 2. Tone layer (only for strict policy)
  if (policy === "strict") {
    return await checkTone(text, apiKey);
  }
  return { ok: true };
}
