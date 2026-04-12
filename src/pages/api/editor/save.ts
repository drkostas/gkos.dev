import type { APIRoute } from "astro";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

export const prerender = false;

const MAUVILLE_OFFSET = 50;

interface SaveChange {
  entityId: string;
  field: string;
  oldValue: any;
  newValue: any;
}

interface SaveRequest {
  changes: SaveChange[];
  dryRun?: boolean;
}

interface PatchResult {
  entityId: string;
  field: string;
  status: "applied" | "skipped" | "error";
  message: string;
}

/** Map entity source file names to actual paths */
function resolveSourcePath(sourceFile: string): string {
  const root = resolve(process.cwd(), "src/game/data");
  return resolve(root, sourceFile);
}

/** Apply position patch to an NPC in a TS source file */
function patchPosition(
  content: string,
  entityId: string,
  newX: number,
  newY: number,
  hasOffset: boolean,
): { content: string; applied: boolean } {
  // Subtract offset for Mauville NPCs
  const fileX = hasOffset ? newX - MAUVILLE_OFFSET : newX;
  const fileY = hasOffset ? newY - MAUVILLE_OFFSET : newY;

  // Find the entity block by ID, then find the position line near it
  const idPattern = new RegExp(`id:\\s*["']${entityId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
  const idMatch = idPattern.exec(content);
  if (!idMatch) return { content, applied: false };

  // Look for position: { x: N, y: N } within 500 chars after the id
  const searchStart = idMatch.index;
  const searchRegion = content.substring(searchStart, searchStart + 500);
  const posPattern = /position:\s*\{\s*x:\s*(-?\d+)\s*,\s*y:\s*(-?\d+)\s*\}/;
  const posMatch = posPattern.exec(searchRegion);

  if (!posMatch) return { content, applied: false };

  const fullMatchStart = searchStart + posMatch.index;
  const fullMatchEnd = fullMatchStart + posMatch[0].length;
  const replacement = `position: { x: ${fileX}, y: ${fileY} }`;

  return {
    content: content.substring(0, fullMatchStart) + replacement + content.substring(fullMatchEnd),
    applied: true,
  };
}

/** Apply a facing direction patch */
function patchFacingDirection(
  content: string,
  entityId: string,
  newDirection: string,
): { content: string; applied: boolean } {
  const idPattern = new RegExp(`id:\\s*["']${entityId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
  const idMatch = idPattern.exec(content);
  if (!idMatch) return { content, applied: false };

  const searchRegion = content.substring(idMatch.index, idMatch.index + 500);
  const facingPattern = /facingDirection:\s*Direction\.\w+/;
  const facingMatch = facingPattern.exec(searchRegion);
  if (!facingMatch) return { content, applied: false };

  const dirMap: Record<string, string> = {
    up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT",
  };
  const dirEnum = dirMap[newDirection.toLowerCase()] || "DOWN";
  const fullStart = idMatch.index + facingMatch.index;
  const fullEnd = fullStart + facingMatch[0].length;

  return {
    content: content.substring(0, fullStart) + `facingDirection: Direction.${dirEnum}` + content.substring(fullEnd),
    applied: true,
  };
}

/** Apply a dialog text patch */
function patchDialog(
  content: string,
  entityId: string,
  newDialog: string[],
): { content: string; applied: boolean } {
  const idPattern = new RegExp(`id:\\s*["']${entityId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
  const idMatch = idPattern.exec(content);
  if (!idMatch) return { content, applied: false };

  // Find dialog: [...] after the ID — use bracket depth parsing
  const afterId = content.substring(idMatch.index);
  const dialogStart = afterId.indexOf("dialog:");
  if (dialogStart === -1 || dialogStart > 1000) return { content, applied: false };

  const absDialogStart = idMatch.index + dialogStart;
  const bracketStart = content.indexOf("[", absDialogStart);
  if (bracketStart === -1) return { content, applied: false };

  // Find matching ]
  let depth = 0;
  let bracketEnd = bracketStart;
  for (let i = bracketStart; i < content.length; i++) {
    if (content[i] === "[") depth++;
    if (content[i] === "]") {
      depth--;
      if (depth === 0) {
        bracketEnd = i + 1;
        break;
      }
    }
  }

  const newDialogStr = "[\n" + newDialog.map((l) => `      "${l.replace(/"/g, '\\"')}",`).join("\n") + "\n    ]";
  const replacement = "dialog: " + newDialogStr;

  // Replace from "dialog:" to the closing "]"
  return {
    content: content.substring(0, absDialogStart) + replacement + content.substring(bracketEnd),
    applied: true,
  };
}

/** Apply a sign text patch */
function patchSignText(
  content: string,
  entityId: string,
  newText: string[],
  signIndex: number,
): { content: string; applied: boolean } {
  // Signs are in arrays like MAUVILLE_SIGNS_RAW, ROUTE_SIGNS
  // We need to find the sign by its array index
  // For now, find by text pattern matching near the sign array
  // This is a simplified approach — full implementation in P1G
  return { content, applied: false };
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const body: SaveRequest = await request.json();
    const results: PatchResult[] = [];

    // Group changes by source file
    const fileContents = new Map<string, string>();
    const entitySourceMap = new Map<string, { file: string; hasOffset: boolean }>();

    // Load entity data to get source file info
    const editorDataPath = resolve(process.cwd(), "editor-data.json");
    let editorData: any;
    try {
      editorData = JSON.parse(readFileSync(editorDataPath, "utf-8"));
    } catch {
      return new Response(JSON.stringify({ error: "editor-data.json not found. Run: node scripts/editor-data-export.mjs" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build source map from editor data
    for (const entity of editorData.entities) {
      if (entity.sourceFile) {
        entitySourceMap.set(entity.id, {
          file: entity.sourceFile,
          hasOffset: entity.sourceOffset === true,
        });
      }
    }

    // Apply changes
    for (const change of body.changes) {
      const source = entitySourceMap.get(change.entityId);
      if (!source) {
        results.push({ entityId: change.entityId, field: change.field, status: "skipped", message: "No source file mapping" });
        continue;
      }

      const filePath = resolveSourcePath(source.file);

      // Load file content (cached across changes to same file)
      if (!fileContents.has(filePath)) {
        try {
          fileContents.set(filePath, readFileSync(filePath, "utf-8"));
        } catch {
          results.push({ entityId: change.entityId, field: change.field, status: "error", message: `Cannot read ${source.file}` });
          continue;
        }
      }

      let content = fileContents.get(filePath)!;
      let applied = false;

      switch (change.field) {
        case "x":
        case "y": {
          const entity = editorData.entities.find((e: any) => e.id === change.entityId);
          if (entity) {
            const newX = change.field === "x" ? change.newValue : entity.x;
            const newY = change.field === "y" ? change.newValue : entity.y;
            const result = patchPosition(content, change.entityId, newX, newY, source.hasOffset);
            content = result.content;
            applied = result.applied;
          }
          break;
        }
        case "facingDirection": {
          const result = patchFacingDirection(content, change.entityId, change.newValue);
          content = result.content;
          applied = result.applied;
          break;
        }
        case "dialog": {
          const result = patchDialog(content, change.entityId, change.newValue);
          content = result.content;
          applied = result.applied;
          break;
        }
        default:
          results.push({ entityId: change.entityId, field: change.field, status: "skipped", message: `Field "${change.field}" not yet patchable` });
          continue;
      }

      if (applied) {
        fileContents.set(filePath, content);
        results.push({ entityId: change.entityId, field: change.field, status: "applied", message: "OK" });
      } else {
        results.push({ entityId: change.entityId, field: change.field, status: "error", message: "Pattern not found in source" });
      }
    }

    // Write modified files (unless dry run)
    if (!body.dryRun) {
      for (const [path, content] of fileContents) {
        writeFileSync(path, content, "utf-8");
      }
    }

    const applied = results.filter((r) => r.status === "applied").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;

    return new Response(JSON.stringify({
      success: errors === 0,
      message: body.dryRun
        ? `Dry run: ${applied} would be applied, ${skipped} skipped, ${errors} errors`
        : `Saved: ${applied} applied, ${skipped} skipped, ${errors} errors`,
      results,
      filesModified: body.dryRun ? 0 : fileContents.size,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
