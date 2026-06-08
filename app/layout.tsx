import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "./light-theme.css";
import "./light-theme-polish.css";
import { ThemeInit } from "@/components/theme-init";
import { MobileNavBar } from "@/components/mobile-nav-bar";
import { SiteAnalyticsProvider } from "@/components/site-analytics-provider";
import { SupportCreatorModal } from "@/components/support-creator-modal";
import { WechatShareBridge } from "@/components/wechat-share-bridge";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ball.boyzi.fun"),
  title: "赛波CYBERBALL — 2026世界杯看球伴侣",
  description:
    "赛波（CYBERBALL）源于赛博世界波，将实时赛事、AI预测、全球新闻与数据可视化融合为足球时代的数字竞技场。48支参赛队实时赔率、赛程日历、球员档案、小组赛积分榜——一屏尽览。",
  applicationName: "赛波 | CYBERBALL",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: "赛波 | CYBERBALL",
    title: "赛波CYBERBALL — 2026世界杯看球伴侣",
    description:
      "赛波（CYBERBALL）源于赛博世界波，将实时赛事、AI预测、全球新闻与数据可视化融合为足球时代的数字竞技场。48支参赛队实时赔率、赛程日历、球员档案、小组赛积分榜——一屏尽览。",
    images: [
      {
        url: "/og/cyberball-og.jpg",
        width: 1200,
        height: 631,
        alt: "赛波CYBERBALL 2026世界杯看球伴侣"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "赛波CYBERBALL — 2026世界杯看球伴侣",
    description:
      "赛波（CYBERBALL）源于赛博世界波，将实时赛事、AI预测、全球新闻与数据可视化融合为足球时代的数字竞技场。",
    images: ["/og/cyberball-og.jpg"]
  }
};

const themeScript = "(function(){try{var t=localStorage.getItem('wc-theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={interTight.variable}>
        <SiteAnalyticsProvider>
          <ThemeInit />
          <Suspense fallback={null}>
            <WechatShareBridge />
          </Suspense>
          {children}
          <MobileNavBar />
          <SupportCreatorModal />
        </SiteAnalyticsProvider>
      </body>
    </html>
  );
}
