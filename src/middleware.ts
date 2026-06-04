import { defineMiddleware } from "astro:middleware";

/**
 * Admin dev-only guard.
 *
 * All /admin/* pages and /api/admin/* endpoints are 404'd unless we're in
 * `astro dev`. `import.meta.env.DEV` is a Vite-replaced constant: at build
 * time it becomes a literal `false`, so in the production bundle the check
 * collapses to `return 404` — zero runtime overhead, zero risk of misflag.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const path = new URL(context.request.url).pathname;
  const isAdmin = path.startsWith("/admin") || path.startsWith("/api/admin");
  if (isAdmin && !import.meta.env.DEV) {
    return new Response("Not Found", { status: 404 });
  }
  return next();
});
