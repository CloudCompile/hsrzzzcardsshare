/**
 * Absolute-URL helpers for metadata. Everything social crawlers read (Open Graph,
 * Twitter cards, the sitemap) needs a full URL, so the origin is resolved in one place
 * instead of being re-derived in each route.
 */
export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * A 1200x630 preview image rendered by /api/og. Used wherever a link has no card of its
 * own — the landing page, the agent, a manual builder with no build in the URL — so a
 * shared link still unfurls with the site's art direction rather than a bare title.
 */
export function ogImage({ title, sub, game }: { title: string; sub: string; game?: string }) {
  const query = new URLSearchParams({ title, sub });
  if (game) query.set("game", game);
  return {
    url: `/api/og?${query.toString()}`,
    width: 1200,
    height: 630,
    alt: sub,
  };
}

/** A card image from /api/card, sized for link unfurls. */
export function cardImage(url: string, alt: string) {
  return { url, width: 1200, height: 630, alt };
}
