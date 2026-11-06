import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/meta";

/**
 * Only the routes that exist without a UID. Profile links are deliberately left out:
 * Enka's API rules forbid enumerating UIDs, and a sitemap of them would be exactly that.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const updated = new Date();
  return [
    { url: `${origin}/`, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/zzz/manual`, lastModified: updated, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/hsr/manual`, lastModified: updated, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/agent`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
  ];
}
