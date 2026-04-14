import type { APIRoute } from "astro";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

export const prerender = false;

interface TintEntry {
  presetId?: string;
  h?: number;
  s?: number;
  l?: number;
  a?: number;
}

interface SaveBody {
  tints: Record<string, TintEntry>;
  presets?: {
    id: string;
    label: string;
    adjust: { h: number; s: number; l: number; a: number };
  }[];
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const body: SaveBody = await request.json();

    // Write per-tile tints
    const tintsPath = resolve(process.cwd(), "public/game/tile-tints.json");
    writeFileSync(tintsPath, JSON.stringify({ version: 1, tints: body.tints }, null, 2), "utf-8");

    // Patch tint presets if provided
    if (body.presets) {
      const presetsPath = resolve(process.cwd(), "src/game/data/tintPresets.ts");
      let content = readFileSync(presetsPath, "utf-8");

      // Find TINT_PRESETS object body and replace it
      const re = /TINT_PRESETS:\s*Record<string,\s*TintPreset>\s*=\s*\{/;
      const startMatch = re.exec(content);
      if (startMatch) {
        const bodyStart = startMatch.index + startMatch[0].length;
        let depth = 1;
        let bodyEnd = bodyStart;
        for (let i = bodyStart; i < content.length; i++) {
          if (content[i] === "{") depth++;
          else if (content[i] === "}") { depth--; if (depth === 0) { bodyEnd = i; break; } }
        }

        const indent = "  ";
        let newBody = "\n";
        for (const p of body.presets) {
          newBody += `${indent}${p.id}: {\n`;
          newBody += `${indent}  id: "${p.id}",\n`;
          newBody += `${indent}  label: "${String(p.label).replace(/"/g, '\\"')}",\n`;
          newBody += `${indent}  adjust: { h: ${p.adjust.h}, s: ${p.adjust.s}, l: ${p.adjust.l}, a: ${p.adjust.a} },\n`;
          newBody += `${indent}},\n`;
        }

        content = content.substring(0, bodyStart) + newBody + content.substring(bodyEnd);
        writeFileSync(presetsPath, content, "utf-8");
      }
    }

    return new Response(
      JSON.stringify({ success: true, tintCount: Object.keys(body.tints).length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
