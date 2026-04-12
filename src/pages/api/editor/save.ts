import type { APIRoute } from "astro";

export const prerender = false;

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

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const body: SaveRequest = await request.json();

    // Phase 1: dry run only — log changes and return success
    // Phase 1G will implement actual file patching
    console.log(`[editor/save] ${body.changes.length} changes (dry run: ${body.dryRun ?? true})`);
    for (const c of body.changes) {
      console.log(`  ${c.entityId}.${c.field}: ${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: body.dryRun ? "Dry run — no files modified" : "Saved (TODO: implement file patching)",
      changesApplied: body.changes.length,
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
