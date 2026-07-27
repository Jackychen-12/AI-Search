export type Locale = "zh" | "en";

const dict: Record<string, Record<Locale, string>> = {
  // Nav
  "nav.home": { zh: "首页", en: "Home" },
  "nav.daily": { zh: "日报", en: "Daily" },
  "nav.weekly": { zh: "周报", en: "Weekly" },
  "nav.trends": { zh: "趋势", en: "Trends" },
  "nav.topics": { zh: "话题", en: "Topics" },
  "nav.stories": { zh: "事件", en: "Stories" },
  "site.subtitle": { zh: "AI 行业资讯聚合", en: "AI News Aggregator" },

  // Search
  "search.placeholder": { zh: "搜索 AI 资讯、模型、工具...", en: "Search AI news, models, tools..." },
  "search.keyword": { zh: "搜索关键词", en: "Search keyword" },

  // Sidebar
  "sidebar.trending": { zh: "本周最热", en: "Trending This Week" },
  "sidebar.trending.desc": { zh: "按 GitHub Star / Hacker News 讨论热度排序", en: "Ranked by GitHub Stars / HN points" },
  "sidebar.sources": { zh: "数据来源", en: "Data Sources" },
  "sidebar.topics": { zh: "热门话题", en: "Hot Topics" },
  "sidebar.viewall": { zh: "查看全部", en: "View All" },
  "sidebar.sources.filter": { zh: "点击筛选", en: "Click to filter" },
  "sidebar.sources.clear": { zh: "← 清除来源筛选", en: "← Clear source filter" },
  "sidebar.sources.notUpdated": { zh: "个未更新", en: "not updated" },
  "sidebar.sources.count": { zh: "个来源", en: "sources" },

  // Feed
  "feed.showing": { zh: "显示", en: "Showing" },
  "feed.items": { zh: "条", en: "items" },
  "feed.latest": { zh: "最新", en: "Latest" },
  "feed.hottest": { zh: "最热", en: "Hottest" },
  "feed.all": { zh: "全部", en: "All" },
  "feed.today": { zh: "今日新增", en: "New Today" },
  "feed.bookmarks": { zh: "收藏", en: "Bookmarks" },
  "feed.unread": { zh: "未读", en: "Unread" },
  "feed.personalize": { zh: "个性化", en: "Personalize" },
  "feed.export": { zh: "导出收藏", en: "Export" },
  "feed.exported": { zh: "已复制 ✓", en: "Copied ✓" },
  "feed.source": { zh: "来源", en: "Source" },
  "feed.prevPage": { zh: "上一页", en: "Prev" },
  "feed.nextPage": { zh: "下一页", en: "Next" },
  "feed.empty.bookmarks": { zh: "还没有收藏。点卡片右上角的 ★ 收藏感兴趣的内容。", en: "No bookmarks yet. Star items you like." },
  "feed.empty.today": { zh: "今天还没有新增内容。", en: "No new items today." },
  "feed.empty.unread": { zh: "没有未读内容了。", en: "All caught up!" },
  "feed.empty.default": { zh: "没有匹配的内容，换个关键词或分类试试。", en: "No matches. Try different keywords or categories." },

  // Card
  "card.source": { zh: "来源", en: "Source" },
  "card.ai": { zh: "AI 点评", en: "AI Take" },
  "card.uncategorized": { zh: "未分类", en: "Uncategorized" },
  "card.read": { zh: "已读", en: "Read" },

  // Category
  "cat.all": { zh: "全部", en: "All" },
  "cat.ai-models": { zh: "模型发布/更新", en: "Models" },
  "cat.ai-products": { zh: "产品发布/更新", en: "Products" },
  "cat.industry": { zh: "行业动态", en: "Industry" },
  "cat.paper": { zh: "论文研究", en: "Papers" },
  "cat.tip": { zh: "技巧与观点", en: "Tips & Opinions" },
  "time.24h": { zh: "24 小时", en: "24h" },
  "time.3d": { zh: "3 天", en: "3d" },
  "time.7d": { zh: "7 天", en: "7d" },
  "time.30d": { zh: "30 天", en: "30d" },
  "cat.selected": { zh: "精选", en: "Selected" },
  "cat.selected.hint": { zh: "高质量条目", en: "Curated items" },
  "cat.everything": { zh: "全部", en: "Everything" },
  "cat.everything.hint": { zh: "含未精选的次要条目", en: "Including secondary items" },

  // Hero
  "hero.headline": { zh: "头条", en: "Featured" },

  // TopReads
  "topreads.title": { zh: "AI 每日必读", en: "AI Must-Reads" },
  "topreads.desc": { zh: "由 AI 从今日内容精选", en: "AI-curated from today's content" },

  // Footer
  "footer.about": { zh: "关于", en: "About" },
  "footer.privacy": { zh: "隐私", en: "Privacy" },
  "footer.total": { zh: "共", en: "" },
  "footer.totalSuffix": { zh: "条", en: "items" },
  "footer.updated": { zh: "数据更新于", en: "Updated" },

  // Trends
  "trends.title": { zh: "趋势洞察", en: "Trend Insights" },
  "trends.daily": { zh: "每日新增资讯量", en: "Daily New Items" },
  "trends.category": { zh: "分类趋势对比", en: "Category Trends" },
  "trends.topic": { zh: "热门话题趋势", en: "Topic Trends" },
  "trends.ranking": { zh: "话题热度排名", en: "Topic Ranking" },
  "trends.hover": { zh: "鼠标悬浮查看每日具体数值", en: "Hover to see daily values" },

  // Weekly
  "weekly.title": { zh: "AI 周报", en: "AI Weekly" },
  "weekly.top10": { zh: "本周 Top 10", en: "Top 10 This Week" },
  "weekly.activeSources": { zh: "本周活跃来源", en: "Active Sources" },
  "weekly.empty": { zh: "暂无周报数据", en: "No weekly data yet" },
  "weekly.subtitle": { zh: "每周自动汇编，回顾本周 AI 行业重点", en: "Auto-compiled weekly recap of AI industry highlights" },
  "weekly.thisWeek": { zh: "本周", en: "This week" },
  "weekly.kpi.title": { zh: "关键数据速览", en: "Key Metrics" },
  "weekly.kpi.total": { zh: "资讯总量", en: "Total items" },
  "weekly.kpi.dailyAvg": { zh: "日均资讯", en: "Daily average" },
  "weekly.kpi.sources": { zh: "活跃来源", en: "Active sources" },
  "weekly.kpi.topHeat": { zh: "最高热度", en: "Peak heat" },
  "weekly.chart.daily": { zh: "每日趋势", en: "Daily trend" },
  "weekly.chart.category": { zh: "分类占比", en: "By category" },
  "weekly.chart.sources": { zh: "来源贡献 Top 5", en: "Top 5 sources" },
  "weekly.weekdays": { zh: "一,二,三,四,五,六,日", en: "Mon,Tue,Wed,Thu,Fri,Sat,Sun" },
  "weekly.insight": { zh: "AI 周度洞察", en: "AI Weekly Insight" },
  "weekly.topSummary": { zh: "本周重点", en: "Highlights" },
  "weekly.top10.empty": { zh: "本周暂无数据", en: "No data this week" },
  "weekly.heat": { zh: "热度", en: "Heat" },
  "update.available": { zh: "有新内容 · 点击刷新", en: "New content · Refresh" },
  "card.official": { zh: "一手源", en: "Official" },
  "weekly.sections": { zh: "分类概览", en: "By Category" },
  "weekly.viewDaily": { zh: "查看日报", en: "View Daily" },
  "weekly.rss": { zh: "RSS 订阅", en: "RSS Feed" },

  // Daily
  "daily.title": { zh: "AI 资讯日报", en: "AI Daily Digest" },
  "daily.lead.prefix": { zh: "今日新收录 ", en: "Collected " },
  "daily.lead.suffix": {
    zh: " 条公开资讯，按模型 / 产品 / 行业 / 论文 / 观点 自动归类汇编（非 AI 生成，点击可溯源原文）。",
    en: " public items today, auto-compiled into models / products / industry / papers / opinions (not AI-written; click any entry to view the original source).",
  },
  "daily.featured": { zh: "今日精选", en: "Today's Picks" },
  "daily.flash": { zh: "快讯", en: "In Brief" },
  "daily.aiNote": { zh: "AI 导读", en: "AI Brief" },
  "daily.generatedAt": { zh: "日报生成时间：", en: "Generated at " },
  "daily.latest": { zh: "最新日报", en: "Latest" },
  "daily.noEarlier": { zh: "← 没有更早", en: "← No earlier" },
  "daily.noNewer": { zh: "没有更新 →", en: "No newer →" },
  "daily.archive": { zh: "日报存档", en: "Daily Archive" },

  // Common actions
  "common.bookmark": { zh: "收藏", en: "Bookmark" },
  "common.unbookmark": { zh: "取消收藏", en: "Remove bookmark" },
  "share.poster": { zh: "复制分享图", en: "Copy share card" },
  "share.copied": { zh: "已复制 ✓", en: "Copied ✓" },

  // Timeline
  "timeline.title": { zh: "时间线", en: "Timeline" },

  // Topics
  "topics.title": { zh: "话题总览", en: "All Topics" },

  // Stories
  "stories.title": { zh: "事件脉络", en: "Storylines" },
  "stories.subtitle": { zh: "同一事件跨源聚合，追踪进展与信源印证", en: "Cross-source event clusters with development timelines" },
  "stories.status.new": { zh: "新事件", en: "New" },
  "stories.status.developing": { zh: "发酵中", en: "Developing" },
  "stories.status.settled": { zh: "已平息", en: "Settled" },
  "stories.sources": { zh: "源印证", en: "sources" },
  "stories.firstParty": { zh: "含一手源", en: "first-party" },
  "stories.days": { zh: "天", en: "days" },
  "stories.updated": { zh: "更新", en: "updated" },
  "stories.expand": { zh: "展开全部", en: "Show all" },
  "stories.collapse": { zh: "收起", en: "Collapse" },
  "stories.focus": { zh: "焦点事件", en: "In Focus" },
  "stories.list": { zh: "全部事件", en: "All Stories" },
  "stories.filter.all": { zh: "全部", en: "All" },
  "stories.filter.empty": { zh: "没有匹配的事件，换个筛选试试。", en: "No matching stories. Try another filter." },
  "stories.empty": { zh: "最近 14 天暂无跨源印证的事件。", en: "No cross-source stories in the last 14 days." },
  "stories.note": { zh: "由标题相似度 + 实体 + 时间窗口自动聚类，仅展示 ≥ 2 个独立信源印证的事件", en: "Auto-clustered by title similarity + entities + time window; only events corroborated by ≥ 2 independent sources are shown" },

  // Common
  "common.back": { zh: "← 返回首页", en: "← Back to Home" },
  "common.topic": { zh: "话题", en: "Topic" },
  "common.related": { zh: "条相关资讯 · 来自历史归档", en: "related items · from archive" },
};

export function t(key: string, locale: Locale): string {
  return dict[key]?.[locale] ?? dict[key]?.zh ?? key;
}

export function getLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  return (localStorage.getItem("ai-search-locale") as Locale) ?? "zh";
}

export function setLocale(locale: Locale) {
  localStorage.setItem("ai-search-locale", locale);
}
