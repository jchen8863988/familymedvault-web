import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const paths = ["", "/apps", "/community", "/privacy", "/terms", "/ampnest/book"];

export default function sitemap(): MetadataRoute.Sitemap {
  const out: MetadataRoute.Sitemap = [];

  for (const path of paths) {
    const suffix = path || "";
    const enUrl =
      suffix === "" ? `${SITE_URL}/` : `${SITE_URL}${suffix}`;
    out.push({
      url: enUrl,
      lastModified: new Date(),
      changeFrequency: suffix === "" ? "weekly" : "weekly",
      priority: suffix === "" ? 1 : 0.75,
    });
    out.push({
      url: `${SITE_URL}/zh${suffix}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: suffix === "" ? 0.95 : 0.65,
    });
  }

  return out;
}
