import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getRepository } from "@/lib/repositories";
import { ProjectAutopsy } from "@/components/deadfolio/project-autopsy";
import { causes, categories } from "@/lib/schemas/project";
import { siteUrl } from "@/lib/site";
export const dynamic = "force-dynamic";
const find = cache((slug: string) => getRepository().findBySlug(slug));
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await find(slug);
  if (!p) return { title: "Project not found" };
  const title = `${p.title}: Why this ${categories[p.category].toLowerCase()} project ${p.status === "revived" ? "needed a second life" : "stopped"}`;
  const description = `${p.tagline} Cause of death: ${causes[p.primaryCauseOfDeath]}. Read the full postmortem on Deadfolio.`;
  return {
    title,
    description,
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: {
      title,
      description,
      url: `/projects/${p.slug}`,
      type: "article",
      images: [`/projects/${p.slug}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/projects/${p.slug}/opengraph-image`],
    },
  };
}
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await find((await params).slug);
  if (!p) notFound();
  const json = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.tagline,
    author: { "@type": "Person", name: p.creator.name },
    datePublished: p.publishedAt,
    url: `${siteUrl}/projects/${p.slug}`,
    inLanguage: "en",
    ...(p.coverImage ? { image: `${siteUrl}${p.coverImage.url}` } : {}),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(json).replace(/</g, "\\u003c"),
        }}
      />
      <ProjectAutopsy project={p} />
    </>
  );
}
