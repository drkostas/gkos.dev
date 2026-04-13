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

interface TilePaint {
  layer: "Ground" | "Collision";
  x: number;
  y: number;
  gid: number;
}

interface SaveRequest {
  changes: SaveChange[];
  tilePaints?: TilePaint[];
  catalog?: any;
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

/** Apply a facing direction patch — handles both Direction.UP (overworld) and "up" (interiors) formats */
function patchFacingDirection(
  content: string,
  entityId: string,
  newDirection: string,
): { content: string; applied: boolean } {
  const idPattern = new RegExp(`id:\\s*["']${entityId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
  const idMatch = idPattern.exec(content);
  if (!idMatch) return { content, applied: false };

  const searchRegion = content.substring(idMatch.index, idMatch.index + 500);
  const dirLower = newDirection.toLowerCase();

  // Try Direction.ENUM format first (overworld)
  const enumPattern = /facingDirection:\s*Direction\.\w+/;
  const enumMatch = enumPattern.exec(searchRegion);
  if (enumMatch) {
    const dirMap: Record<string, string> = { up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT" };
    const dirEnum = dirMap[dirLower] || "DOWN";
    const fullStart = idMatch.index + enumMatch.index;
    const fullEnd = fullStart + enumMatch[0].length;
    return {
      content: content.substring(0, fullStart) + `facingDirection: Direction.${dirEnum}` + content.substring(fullEnd),
      applied: true,
    };
  }

  // Try string format (interiors): facingDirection: "down"
  const strPattern = /facingDirection:\s*"[^"]*"/;
  const strMatch = strPattern.exec(searchRegion);
  if (strMatch) {
    const fullStart = idMatch.index + strMatch.index;
    const fullEnd = fullStart + strMatch[0].length;
    return {
      content: content.substring(0, fullStart) + `facingDirection: "${dirLower}"` + content.substring(fullEnd),
      applied: true,
    };
  }

  return { content, applied: false };
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

/** Apply a spriteKey patch */
function patchSpriteKey(
  content: string,
  entityId: string,
  newSpriteKey: string,
): { content: string; applied: boolean } {
  const idPattern = new RegExp(`id:\\s*["']${entityId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
  const idMatch = idPattern.exec(content);
  if (!idMatch) return { content, applied: false };

  const searchRegion = content.substring(idMatch.index, idMatch.index + 500);
  const spritePattern = /spriteKey:\s*"[^"]*"/;
  const spriteMatch = spritePattern.exec(searchRegion);
  if (!spriteMatch) return { content, applied: false };

  const fullStart = idMatch.index + spriteMatch.index;
  const fullEnd = fullStart + spriteMatch[0].length;

  return {
    content: content.substring(0, fullStart) + `spriteKey: "${newSpriteKey}"` + content.substring(fullEnd),
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

    // Build source map from editor data (overworld + interior entities)
    for (const entity of editorData.entities) {
      if (entity.sourceFile) {
        entitySourceMap.set(entity.id, {
          file: entity.sourceFile,
          hasOffset: entity.sourceOffset === true,
        });
      }
    }
    // Also map interior entities
    if (editorData.interiors) {
      for (const [, interior] of Object.entries(editorData.interiors as Record<string, any>)) {
        for (const npc of (interior.npcs || [])) {
          if (npc.sourceFile) {
            entitySourceMap.set(npc.id, {
              file: npc.sourceFile,
              hasOffset: false,
            });
          }
        }
      }
    }

    // Consolidate x/y changes per entity — both must be applied together to avoid overwriting
    const positionChanges = new Map<string, { x?: number; y?: number }>();
    const otherChanges: SaveChange[] = [];
    for (const change of body.changes) {
      if (change.field === "x" || change.field === "y") {
        const existing = positionChanges.get(change.entityId) || {};
        existing[change.field] = change.newValue;
        positionChanges.set(change.entityId, existing);
      } else {
        otherChanges.push(change);
      }
    }

    // Helper: load file content for an entity
    const loadFileForEntity = (entityId: string): { filePath: string; source: { file: string; hasOffset: boolean } } | null => {
      const source = entitySourceMap.get(entityId);
      if (!source) {
        results.push({ entityId, field: "position", status: "skipped", message: "No source file mapping" });
        return null;
      }
      const filePath = resolveSourcePath(source.file);
      if (!fileContents.has(filePath)) {
        try {
          fileContents.set(filePath, readFileSync(filePath, "utf-8"));
        } catch {
          results.push({ entityId, field: "position", status: "error", message: `Cannot read ${source.file}` });
          return null;
        }
      }
      return { filePath, source };
    };

    // Apply consolidated position changes
    for (const [entityId, pos] of positionChanges) {
      const loaded = loadFileForEntity(entityId);
      if (!loaded) continue;

      // Find current position from editorData
      let entity = editorData.entities.find((e: any) => e.id === entityId);
      if (!entity && editorData.interiors) {
        for (const interior of Object.values(editorData.interiors as Record<string, any>)) {
          entity = (interior.npcs || []).find((e: any) => e.id === entityId);
          if (entity) break;
        }
      }
      if (!entity) {
        results.push({ entityId, field: "position", status: "error", message: "Entity not found in editor data" });
        continue;
      }

      const newX = pos.x ?? entity.x;
      const newY = pos.y ?? entity.y;
      let content = fileContents.get(loaded.filePath)!;
      const result = patchPosition(content, entityId, newX, newY, loaded.source.hasOffset);
      if (result.applied) {
        fileContents.set(loaded.filePath, result.content);
        results.push({ entityId, field: "position", status: "applied", message: `(${newX}, ${newY})` });
      } else {
        results.push({ entityId, field: "position", status: "error", message: "Pattern not found in source" });
      }
    }

    // Apply other changes (facing, dialog, spriteKey, etc.)
    for (const change of otherChanges) {
      const loaded = loadFileForEntity(change.entityId);
      if (!loaded) continue;

      let content = fileContents.get(loaded.filePath)!;
      let applied = false;

      switch (change.field) {
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
        case "spriteKey": {
          const result = patchSpriteKey(content, change.entityId, change.newValue);
          content = result.content;
          applied = result.applied;
          break;
        }
        default:
          results.push({ entityId: change.entityId, field: change.field, status: "skipped", message: `Field "${change.field}" not yet patchable` });
          continue;
      }

      if (applied) {
        fileContents.set(loaded.filePath, content);
        results.push({ entityId: change.entityId, field: change.field, status: "applied", message: "OK" });
      } else {
        results.push({ entityId: change.entityId, field: change.field, status: "error", message: "Pattern not found in source" });
      }
    }

    // Apply tile paints to mauville.json
    let tilesModified = 0;
    if (body.tilePaints && body.tilePaints.length > 0) {
      const mapPath = resolve(process.cwd(), "public/game/maps/mauville.json");
      try {
        const mapData = JSON.parse(readFileSync(mapPath, "utf-8"));
        for (const paint of body.tilePaints) {
          const layer = mapData.layers.find((l: any) => l.name === paint.layer);
          if (layer && layer.data) {
            const idx = paint.y * mapData.width + paint.x;
            if (idx >= 0 && idx < layer.data.length) {
              layer.data[idx] = paint.gid;
              tilesModified++;
            }
          }
        }
        if (!body.dryRun && tilesModified > 0) {
          writeFileSync(mapPath, JSON.stringify(mapData), "utf-8");
        }
      } catch (e: any) {
        console.error("Failed to save tile paints:", e.message);
      }
    }

    // Apply catalog changes — patch item definitions, pokedex, etc.
    let catalogPatched = 0;
    if (body.catalog) {
      const dataRoot = resolve(process.cwd(), "src/game/data");
      const systemsRoot = resolve(process.cwd(), "src/game/systems");

      // Helper: replace a field value within a block found by an anchor pattern
      function patchFieldInBlock(content: string, anchorPattern: RegExp, fieldPattern: RegExp, replacement: string): string {
        const anchorMatch = anchorPattern.exec(content);
        if (!anchorMatch) return content;
        const searchStart = anchorMatch.index;
        const region = content.substring(searchStart, searchStart + 2000);
        const fieldMatch = fieldPattern.exec(region);
        if (!fieldMatch) return content;
        const absStart = searchStart + fieldMatch.index;
        const absEnd = absStart + fieldMatch[0].length;
        return content.substring(0, absStart) + replacement + content.substring(absEnd);
      }

      // Patch ITEM_DEFINITIONS — update name, pocket, description, url for each item
      if (body.catalog.itemDefinitions) {
        const filePath = resolve(dataRoot, "itemDefinitions.ts");
        let content = readFileSync(filePath, "utf-8");
        for (const item of body.catalog.itemDefinitions) {
          const anchor = new RegExp(`id:\\s*"${item.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
          if (!anchor.test(content)) continue;
          // Patch name
          content = patchFieldInBlock(content, anchor, /name:\s*"[^"]*"/, `name: "${item.name}"`);
          // Patch pocket
          content = patchFieldInBlock(content, anchor, /pocket:\s*"[^"]*"/, `pocket: "${item.pocket}"`);
          // Patch url (if exists)
          if (item.url) {
            content = patchFieldInBlock(content, anchor, /url:\s*"[^"]*"/, `url: "${item.url}"`);
          }
          catalogPatched++;
        }
        if (!body.dryRun) writeFileSync(filePath, content, "utf-8");
      }

      // Patch POKEDEX — update name, description, url, types, status for each entry
      if (body.catalog.pokedex) {
        const filePath = resolve(dataRoot, "pokemon.ts");
        let content = readFileSync(filePath, "utf-8");
        for (const entry of body.catalog.pokedex) {
          const anchor = new RegExp(`number:\\s*${entry.number},\\s*name:\\s*"`);
          if (!anchor.test(content)) continue;
          content = patchFieldInBlock(content, anchor, /name:\s*"[^"]*"/, `name: "${entry.name}"`);
          content = patchFieldInBlock(content, anchor, /description:\s*"[^"]*"/, `description: "${entry.description}"`);
          if (entry.url) {
            content = patchFieldInBlock(content, anchor, /url:\s*"[^"]*"/, `url: "${entry.url}"`);
          }
          content = patchFieldInBlock(content, anchor, /status:\s*"[^"]*"/, `status: "${entry.status}"`);
          catalogPatched++;
        }
        if (!body.dryRun) writeFileSync(filePath, content, "utf-8");
      }

      // Patch STEP_MILESTONES — update steps, itemId, tm, description
      if (body.catalog.stepMilestones) {
        const filePath = resolve(systemsRoot, "StepMilestones.ts");
        let content = readFileSync(filePath, "utf-8");
        for (const tm of body.catalog.stepMilestones) {
          const anchor = new RegExp(`itemId:\\s*"${tm.itemId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
          if (!anchor.test(content)) continue;
          content = patchFieldInBlock(content, anchor, /steps:\s*\d+/, `steps: ${tm.steps}`);
          content = patchFieldInBlock(content, anchor, /tm:\s*"[^"]*"/, `tm: "${tm.tm}"`);
          content = patchFieldInBlock(content, anchor, /description:\s*"[^"]*"/, `description: "${tm.description}"`);
          catalogPatched++;
        }
        if (!body.dryRun) writeFileSync(filePath, content, "utf-8");
      }

      // Patch BADGES — update name, hint
      if (body.catalog.badges) {
        const filePath = resolve(systemsRoot, "BadgeMilestones.ts");
        let content = readFileSync(filePath, "utf-8");
        for (const badge of body.catalog.badges) {
          const anchor = new RegExp(`id:\\s*"${badge.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
          if (!anchor.test(content)) continue;
          content = patchFieldInBlock(content, anchor, /name:\s*"[^"]*"/, `name: "${badge.name}"`);
          content = patchFieldInBlock(content, anchor, /hint:\s*"[^"]*"/, `hint: "${badge.hint}"`);
          catalogPatched++;
        }
        if (!body.dryRun) writeFileSync(filePath, content, "utf-8");
      }

      // Patch RESEARCH LOG — update title, threshold
      if (body.catalog.researchLog) {
        const filePath = resolve(dataRoot, "researchLog.ts");
        let content = readFileSync(filePath, "utf-8");
        for (const entry of body.catalog.researchLog) {
          const anchor = new RegExp(`number:\\s*${entry.number},`);
          if (!anchor.test(content)) continue;
          content = patchFieldInBlock(content, anchor, /title:\s*"[^"]*"/, `title: "${entry.title}"`);
          content = patchFieldInBlock(content, anchor, /threshold:\s*\d+/, `threshold: ${entry.threshold}`);
          catalogPatched++;
        }
        if (!body.dryRun) writeFileSync(filePath, content, "utf-8");
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
