import type { APIRoute } from "astro";
import { getUserTotals } from "@/lib/huggingface";

export const prerender = false;

export const GET: APIRoute = async () => {
  const username =
    import.meta.env.HUGGINGFACE_USERNAME ?? process.env.HUGGINGFACE_USERNAME ?? "drkostas";
  const stats = await getUserTotals(username);

  return new Response(
    JSON.stringify({
      totalDownloads: stats?.totalDownloads ?? 0,
      totalLikes: stats?.totalLikes ?? 0,
      modelCount: stats?.modelCount ?? 0,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
      },
    },
  );
};
