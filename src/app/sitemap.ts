import type { MetadataRoute } from "next";
import { getRepository } from "@/lib/repositories";
import { siteUrl } from "@/lib/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    ...["", "/graveyard", "/about", "/bury"].map((p) => ({
      url: `${siteUrl}${p}`,
    })),
    ...(await getRepository().findPublished()).map((p) => ({
      url: `${siteUrl}/projects/${p.slug}`,
      lastModified: p.publishedAt || p.createdAt,
    })),
  ];
}
