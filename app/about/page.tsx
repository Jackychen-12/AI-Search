import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import { abs } from "@/lib/seo";
import { readArchive } from "@/lib/archive";
import { readLocalItems, readStoreMeta } from "@/lib/localStore";
import { buildDailyCounts } from "@/lib/trends";

export const metadata: Metadata = {
  title: "关于 / 免责声明",
  description: "AI Search 的项目说明、数据来源与版权立场、AI 内容说明与免责声明。",
  alternates: { canonical: abs("/about") },
};

export default function AboutPage() {
  const items = readLocalItems();
  const archive = readArchive();
  const seen = new Set(items.map((i) => i.id));
  const all = [...items, ...archive.filter((a) => !seen.has(a.id))];
  const daily = buildDailyCounts(all);
  const meta = readStoreMeta();
  const totalItems = all.length;
  const totalDays = daily.length;
  const avgDaily = totalDays > 0 ? Math.round(totalItems / totalDays) : 0;
  const sourceSet = new Set(all.map((i) => i.source));
  const topicCount = new Set(all.flatMap((i) => i.tags ?? [])).size;
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-brand-600">
          ← 返回首页
        </Link>
        <h1 className="text-2xl font-bold mt-3 mb-6">关于 AI Search</h1>

        <section className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1.5">这是什么</h2>
            <p>
              AI Search 是一个开源、纯静态的 AI 行业资讯聚合站：每天由 GitHub Actions 自动从公开来源抓取最新资讯，
              自动去重、分类、生成 AI 解读，并发布到 GitHub Pages。所有筛选、搜索、个性化均在浏览器本地完成，
              访客无需登录、不产生任何服务器成本。
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1.5">数据来源与版权</h2>
            <p>
              本站仅聚合各来源的<strong>标题、简短摘要与原文链接</strong>，并清晰标注来源；
              所有内容版权归原作者 / 原媒体所有。点击任意条目可跳转至原文进行阅读与溯源。
              本站不存储、不转载原文全文。若您是版权方、希望调整或移除某来源的展示，
              请通过 <a className="text-brand-600 hover:underline" href="https://github.com/Jackychen-12/AI-Search/issues" target="_blank" rel="noreferrer">GitHub Issues</a> 联系，我们会及时处理。
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1.5">AI 内容说明</h2>
            <p>
              标注为「AI 点评 / AI 导读 / AI 每日必读 / AI 总结」的内容由大语言模型自动生成，
              仅供快速参考，<strong>可能存在错误或偏差</strong>，不代表本站或原作者观点。
              「AI 资讯日报」为系统根据当天收录内容按规则自动汇编，并非由 AI 撰写。
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1.5">免责声明</h2>
            <p>
              本站按「现状」提供，不对信息的准确性、完整性、时效性作任何明示或暗示的保证；
              所载内容不构成投资、法律、医疗或任何专业建议。请以原文及官方信息为准，您据此作出的任何决策与本站无关。
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">产品运营数据</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "累计收录", value: totalItems.toLocaleString(), unit: "条" },
                { label: "覆盖来源", value: sourceSet.size.toString(), unit: "个" },
                { label: "运行天数", value: totalDays.toString(), unit: "天" },
                { label: "日均更新", value: avgDaily.toString(), unit: "条" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-center">
                  <div className="text-xl font-bold text-brand-600 dark:text-brand-500">
                    {s.value}<span className="text-xs font-normal text-gray-400 ml-0.5">{s.unit}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            {meta?.fetchedAt && (
              <p className="text-[11px] text-gray-400 mt-2">数据截至 {new Date(meta.fetchedAt).toLocaleDateString("zh-CN")}</p>
            )}
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">联系与开源</h2>
            <p>
              项目开源于{" "}
              <a className="text-brand-600 hover:underline" href="https://github.com/Jackychen-12/AI-Search" target="_blank" rel="noreferrer">
                github.com/Jackychen-12/AI-Search
              </a>
              （MIT 许可）。问题反馈、来源增删、合作均可通过 Issues 提出。另见{" "}
              <Link href="/privacy" className="text-brand-600 hover:underline">隐私政策</Link>。
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
