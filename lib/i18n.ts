export type Locale = "zh" | "en";

const dict: Record<string, Record<Locale, string>> = {
  // Nav
  "nav.home": { zh: "首页", en: "Home" },
  "nav.daily": { zh: "日报", en: "Daily" },
  "nav.weekly": { zh: "周报", en: "Weekly" },
  "nav.trends": { zh: "趋势", en: "Trends" },
  "nav.topics": { zh: "话题", en: "Topics" },
  "nav.stories": { zh: "事件", en: "Stories" },
  "nav.github": { zh: "GitHub 趋势", en: "GitHub Trends" },
  "nav.githubShort": { zh: "GitHub", en: "GitHub" },
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

  // GitHub AI 趋势
  "nav.repo": { zh: "本项目 GitHub 仓库", en: "This project on GitHub" },
  "gh.title": { zh: "GitHub AI 趋势", en: "GitHub AI Trending" },
  "gh.updated": { zh: "更新于", en: "Updated" },
  "gh.period.daily": { zh: "今日", en: "Today" },
  "gh.period.weekly": { zh: "本周", en: "This week" },
  "gh.period.monthly": { zh: "本月", en: "This month" },
  "gh.all": { zh: "全部", en: "All" },
  "gh.gained": { zh: "新增", en: " gained" },
  "gh.stat.repos": { zh: "追踪项目", en: "Repos tracked" },
  "gh.stat.stars": { zh: "新增 Star", en: " stars" },
  "gh.insight": { zh: "趋势速览", en: "At a glance" },
  "gh.onlyNew": { zh: "只看新项目", en: "New repos only" },
  "gh.new": { zh: "新项目", en: "New" },
  "gh.discovered": { zh: "新发现", en: "Discovered" },
  "gh.fun": { zh: "有趣 AI 玩法", en: "Fun with AI" },
  "gh.fun.tab": { zh: "有趣玩法", en: "Fun" },
  "gh.fun.desc": { zh: "游戏、音乐、声音、桌宠陪伴……开源 AI 的好玩用法", en: "Games, music, voice, desk pets… playful open-source AI" },
  "gh.viewAll": { zh: "查看全部", en: "View all" },
  "gh.expand": { zh: "展开全部", en: "Show all" },
  "gh.collapse": { zh: "收起", en: "Collapse" },
  "gh.days": { zh: " 天", en: "d" },
  "gh.accel": { zh: "加速", en: "Accelerating" },
  "gh.decel": { zh: "放缓", en: "Cooling" },
  "gh.pace": { zh: "日均增速", en: "Stars / day" },
  "gh.pace.d": { zh: "今日", en: "Today" },
  "gh.pace.w": { zh: "周均", en: "Wk avg" },
  "gh.pace.m": { zh: "月均", en: "Mo avg" },
  "gh.aiNote": { zh: "AI 解读", en: "AI take" },
  "gh.paper": { zh: "论文", en: "Paper" },
  "gh.news": { zh: "相关报道", en: "In the news" },
  "gh.streak": { zh: "连续上榜", en: "On list" },
  "gh.created": { zh: "创建于", en: "Created" },
  "gh.trackHeat": { zh: "赛道热度", en: "Track heat" },
  "gh.trackHeat.desc": { zh: "按新增 Star 占比", en: "Share of stars gained" },
  "gh.breakout": { zh: "今日突围", en: "Breaking out today" },
  "gh.breakout.desc": { zh: "今日增速远超本周日均，或今天才冲上榜", en: "Today's pace far above its weekly average, or brand new" },
  "gh.breakout.new": { zh: "新上榜", en: "New" },
  "gh.search.placeholder": { zh: "搜索项目，比如：AI 设计 UI、语音克隆、浏览器自动化", en: "Search repos, e.g. AI design UI, voice cloning, browser automation" },
  "gh.search.clear": { zh: "清除", en: "Clear" },
  "gh.search.found": { zh: "找到", en: "Found" },
  "gh.search.empty": { zh: "榜单里没有匹配的项目，换个更具体的词试试，或在下方搜索 GitHub 全站。", en: "Nothing on the list matches — try a more specific term, or search all of GitHub below." },
  "gh.wide.title": { zh: "GitHub 全站结果", en: "More on GitHub" },
  "gh.wide.desc": { zh: "榜单之外的项目，按 Star 排序", en: "Repos beyond this list, sorted by stars" },
  "gh.wide.keywords": { zh: "搜索词", en: "keywords" },
  "gh.wide.button": { zh: "搜索 GitHub 全站", en: "Search all of GitHub" },
  "gh.wide.loading": { zh: "正在搜索 GitHub…", en: "Searching GitHub…" },
  "gh.wide.limited": { zh: "GitHub 搜索次数受限（每分钟约 10 次），请稍后再试。", en: "GitHub search is rate-limited (about 10 per minute). Try again shortly." },
  "gh.wide.error": { zh: "搜索失败，请稍后再试。", en: "Search failed. Try again later." },
  "gh.wide.none": { zh: "GitHub 上没有找到更多相关项目。", en: "No further matching repos on GitHub." },
  "gh.wide.all": { zh: "在 GitHub 查看全部结果", en: "See all results on GitHub" },
  "gh.empty": { zh: "这个时间段该赛道暂无上榜项目", en: "No trending repos in this track for this period" },
  "gh.noData": { zh: "暂无 GitHub 趋势数据，运行 npm run crawl:github 生成。", en: "No GitHub trend data yet — run npm run crawl:github." },
  "card.ghTrend": { zh: "GitHub 趋势", en: "GitHub trending" },

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
