import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/enlist`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/enter`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
