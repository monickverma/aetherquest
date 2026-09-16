import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/enter", "/enlist"],
        // Private, per-user pages and the JSON API have nothing to index.
        disallow: ["/api/", "/sanctum", "/codex", "/vault"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
