import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getRepository } from "@/lib/repositories";
import { ProjectAutopsy } from "@/components/deadfolio/project-autopsy";
import { causes, categories } from "@/lib/schemas/project";
import { getLocale } from "@/lib/i18n/server";
import { localePath, translate } from "@/lib/i18n/dictionaries";
import { siteUrl } from "@/lib/site";
export const dynamic = "force-dynamic";
const find = cache((slug: string) => getRepository().findBySlug(slug));
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { slug } = await params;
  const p = await find(slug);
  if (!p) return { title: "Project not found" };
  const title =
    locale === "pt"
      ? `${p.title}: o postmortem do projeto`
      : `${p.title}: Why this ${categories[p.category].toLowerCase()} project ${p.status === "revived" ? "needed a second life" : "stopped"}`;
  const description = `${p.tagline} ${translate(locale, "Cause of death")}: ${translate(locale, causes[p.primaryCauseOfDeath])}. Deadfolio.`;
  return {
    title,
    description,
    alternates: {
      canonical: localePath(locale, `/projects/${p.slug}`),
      languages: {
        en: `/projects/${p.slug}`,
        "pt-BR": `/pt/projects/${p.slug}`,
        "x-default": `/projects/${p.slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: localePath(locale, `/projects/${p.slug}`),
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
  const locale = await getLocale();
  const json = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.tagline,
    author: { "@type": "Person", name: p.creator.name },
    datePublished: p.publishedAt,
    url: `${siteUrl}${localePath(locale, `/projects/${p.slug}`)}`,
    inLanguage: locale === "pt" ? "pt-BR" : "en",
    image: `${siteUrl}/projects/${p.slug}/opengraph-image`,
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
