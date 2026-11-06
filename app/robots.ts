import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/meta";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The card and relay routes are compute, not pages: crawlers only waste requests there.
        disallow: ["/api/"],
      },
    ],
    sitemap: `${siteOrigin()}/sitemap.xml`,
    host: siteOrigin(),
  };
}
