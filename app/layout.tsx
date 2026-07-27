import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Analytics from "@/components/Analytics";
import ThemeSync from "@/components/ThemeSync";
import AutoUpdate from "@/components/AutoUpdate";
import LocaleProvider from "@/components/LocaleProvider";
import MobileNav from "@/components/MobileNav";
import ScrollToTop from "@/components/ScrollToTop";
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/seo";

const TITLE = "AI Search · AI 行业资讯聚合";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · AI Search" },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: ["AI 资讯", "人工智能", "大模型", "LLM", "AI 新闻", "AI 日报", "AI Agent", "机器学习", "AI 工具"],
  authors: [{ name: "Jackychen-12", url: "https://github.com/Jackychen-12" }],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description: SITE_DESC,
    url: SITE_URL,
    locale: "zh_CN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "AI Search" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: SITE_DESC, images: ["/og-image.png"] },
};

export const viewport: Viewport = {
  themeColor: "#2453ee",
};

const DARK_MODE_SCRIPT = `(function(){try{if(window.matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.classList.add('dark')}catch(e){}})()`;

// CSP fallback via <meta> — GitHub Pages can't set response headers. Blocks
// external scripts/frames outside the allowlist; images stay open (feed covers
// come from arbitrary https hosts). Next.js needs inline scripts ('unsafe-inline')
// and, in dev only, eval for source maps.
function cspContent(): string {
  const analyticsOrigin = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io").origin;
    } catch {
      return "https://plausible.io";
    }
  })();
  const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  const devWs = process.env.NODE_ENV === "development" ? " ws:" : ""; // HMR websocket
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${devEval} https://giscus.app ${analyticsOrigin}`,
    "style-src 'self' 'unsafe-inline' https://giscus.app",
    "img-src https: data:",
    "font-src 'self' data:",
    `connect-src https: 'self'${devWs}`,
    "frame-src https://giscus.app",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={cspContent()} />
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <a href="#main-content" className="skip-link">
          跳到主内容
        </a>
        <LocaleProvider>
        {children}
        <MobileNav />
        <ScrollToTop />
        <AutoUpdate />
        </LocaleProvider>
        <ThemeSync />
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
