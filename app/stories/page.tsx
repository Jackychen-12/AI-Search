import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import StoriesView from "@/components/StoriesView";
import T from "@/components/T";
import { readArchive } from "@/lib/archive";
import { readLocalItems, readStoreMeta } from "@/lib/localStore";
import { buildStories } from "@/lib/stories";
import { abs } from "@/lib/seo";

export const metadata: Metadata = {
  title: "事件脉络",
  description: "同一 AI 事件的跨源聚合追踪：进展时间轴、信源印证强度、发酵状态，自动聚类生成。",
  alternates: { canonical: abs("/stories") },
};

export default function StoriesPage() {
  const pool = [...readLocalItems(), ...readArchive()];
  const now = readStoreMeta()?.fetchedAt;
  const stories = buildStories(pool, now ? new Date(now).getTime() : undefined);

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-brand-600"><T k="common.back" /></Link>
        </div>
        <h1 className="text-2xl font-bold dark:text-gray-100 mb-1"><T k="stories.title" /></h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6"><T k="stories.subtitle" /></p>
        <StoriesView stories={stories} />
      </main>
    </>
  );
}
