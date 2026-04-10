/**
 * HuggingFace API helpers. Public API, no auth needed for public models.
 *
 * Fetches download counts, likes, and metadata for models and datasets you own.
 * Used at build time to show live numbers on the Workbench and Projects pages.
 */

export interface ModelStats {
  id: string;
  downloads: number;
  likes: number;
  lastModified: string | null;
  pipelineTag: string | null;
  tags: string[];
}

const HF_API_BASE = "https://huggingface.co/api";

// Module-scoped cache for dev server reloads + dedupe across pages in a build.
type CacheEntry<T> = { value: T; expires: number };
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 1000 * 60 * 30;

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T): void {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

async function fetchHF<T = any>(path: string): Promise<T | null> {
  const cacheKey = `hf:${path}`;
  const cached = getCached<T>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(`${HF_API_BASE}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.warn(`[hf] ${path} → ${response.status}`);
      setCached(cacheKey, null);
      return null;
    }
    const data = (await response.json()) as T;
    setCached(cacheKey, data);
    return data;
  } catch (error) {
    console.warn(`[hf] ${path} failed:`, error);
    setCached(cacheKey, null);
    return null;
  }
}

/**
 * Extract "user/repo" from a HuggingFace URL.
 * e.g. "https://huggingface.co/drkostas/MEDiC-ViT-Base" → "drkostas/MEDiC-ViT-Base"
 */
export function parseHfModelId(url: string): string | null {
  const match = url.match(/huggingface\.co\/([^/]+\/[^/?#]+)/);
  if (!match) return null;
  return match[1];
}

/**
 * Fetch public stats for a single HuggingFace model.
 */
export async function getModelStats(modelId: string): Promise<ModelStats | null> {
  const data = await fetchHF<Record<string, any>>(`/models/${modelId}`);
  if (!data) return null;

  return {
    id: data.id ?? modelId,
    downloads: data.downloads ?? 0,
    likes: data.likes ?? 0,
    lastModified: data.lastModified ?? null,
    pipelineTag: data.pipeline_tag ?? null,
    tags: data.tags ?? [],
  };
}

/**
 * Fetch all public models owned by a HuggingFace user/organization.
 * Returns an array of minimal metadata per model.
 */
export async function getUserModels(
  username: string,
): Promise<ModelStats[]> {
  const data = await fetchHF<Array<Record<string, any>>>(
    `/models?author=${username}&limit=100`,
  );
  if (!data || !Array.isArray(data)) return [];

  return data.map((m) => ({
    id: m.id ?? m.modelId ?? "",
    downloads: m.downloads ?? 0,
    likes: m.likes ?? 0,
    lastModified: m.lastModified ?? null,
    pipelineTag: m.pipeline_tag ?? null,
    tags: m.tags ?? [],
  }));
}

/**
 * Aggregate total downloads and likes across all models by a user.
 */
export async function getUserTotals(username: string): Promise<{
  totalDownloads: number;
  totalLikes: number;
  modelCount: number;
}> {
  const models = await getUserModels(username);
  let totalDownloads = 0;
  let totalLikes = 0;
  for (const m of models) {
    totalDownloads += m.downloads;
    totalLikes += m.likes;
  }
  return {
    totalDownloads,
    totalLikes,
    modelCount: models.length,
  };
}
