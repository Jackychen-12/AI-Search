import type { Metadata } from "next";
import Header from "@/components/Header";
import GitHubTrendingView from "@/components/GitHubTrendingView";
import { readGhTrending } from "@/lib/ghTrendingStore";
import { abs } from "@/lib/seo";

export const metadata: Metadata = {
  title: "GitHub AI 趋势",
  description:
    "每日追踪 GitHub Trending 上与 AI 应用、Agent 框架、编程 Agent、MCP 直接相关的最热项目：新增 Star、赛道热度、今日突围。",
  alternates: { canonical: abs("/github") },
};

export default function GitHubTrendingPage() {
  return (
    <>
      <Header />
      <GitHubTrendingView snapshot={readGhTrending()} />
    </>
  );
}
