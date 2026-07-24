import Header from "@/components/Header";
import DataSourceBanner from "@/components/DataSourceBanner";
import DailyView from "@/components/DailyView";
import T from "@/components/T";
import { getDaily, getDailies, listDailyDates } from "@/lib/dailyData";
import Link from "next/link";
import type { Metadata } from "next";
import { abs } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI 资讯日报",
  description: "每天根据当天新收录的公开资讯自动汇编的 AI 日报：今日精选 + 分板块重点 + 快讯。",
  alternates: { canonical: abs("/daily") },
  openGraph: { images: ["/posters/daily-latest.png"] },
};

export default async function DailyLatest() {
  const dates = listDailyDates(); // newest-first
  const latest = dates[0]; // newest date that actually has items
  const { daily, source, fallbackReason } = await getDaily(latest);
  const { items: archive } = await getDailies(14);
  const older = dates.length > 1 ? dates[1] : null;

  return (
    <>
      <Header />
      <DataSourceBanner source={source} reason={fallbackReason} />
      <main className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        <DailyView daily={daily} prevDate={older} nextDate={null} />
        <aside className="card p-4 h-fit">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-500 rounded-sm" />
            <T k="daily.archive" />
          </h3>
          <ul className="space-y-1.5 text-sm">
            {archive.map((d) => (
              <li key={d.date}>
                <Link
                  href={`/daily/${d.date}`}
                  className="flex items-baseline gap-2 text-gray-700 dark:text-gray-300 hover:text-brand-600"
                >
                  <span className="font-mono text-xs text-gray-400 shrink-0">{d.date}</span>
                  {d.leadTitle && <span className="truncate">{d.leadTitle}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </>
  );
}
