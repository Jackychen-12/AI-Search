import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/Header";
import TopicFeed from "@/components/TopicFeed";
import Comments from "@/components/Comments";
import { readArchive } from "@/lib/archive";
import { readLocalItems } from "@/lib/localStore";
import { ENTITIES, ENTITY_MAP, entitiesOf, entityCounts } from "@/lib/entities";
import { abs, jsonLdScript } from "@/lib/seo";

export const dynamic = "force-static";

function pool() {
  const arch = readArchive();
  return arch.length > 0 ? arch : readLocalItems();
}

export function generateStaticParams() {
  const counts = entityCounts(pool());
  return ENTITIES.filter((e) => (counts[e.slug] ?? 0) >= 5).map((e) => ({ slug: e.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const e = ENTITY_MAP[params.slug];
  if (!e) return { title: "话题" };
  const description = `${e.name} 相关的 AI 资讯聚合与历史回溯，由 AI Search 自动收录整理。`;
  const url = abs(`/topic/${params.slug}`);
  return {
    title: e.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: `${e.name} · AI Search`, description, url },
  };
}

export default function TopicPage({ params }: { params: { slug: string } }) {
  const ent = ENTITY_MAP[params.slug];
  if (!ent) notFound();
  const items = pool()
    .filter((it) => entitiesOf(it).includes(params.slug))
    .sort((a, b) => (b.publishedAt ?? b.firstSeen ?? "").localeCompare(a.publishedAt ?? a.firstSeen ?? ""));
  const now = Date.now();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${ent.name} · AI Search`,
    url: abs(`/topic/${params.slug}`),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.slice(0, 20).map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: it.sourceUrl,
        name: it.title,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-brand-600">
            ← 返回首页
          </Link>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2 py-0.5 rounded bg-brand-50 text-brand-600 font-medium">话题</span>
          <h1 className="text-2xl font-bold">{ent.name}</h1>
        </div>
        <p className="text-sm text-gray-500 mb-5">共 {items.length} 条相关资讯 · 来自历史归档</p>
        <TopicFeed items={items} now={now} />
        <Comments />
      </main>
    </>
  );
}
