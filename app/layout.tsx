import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import "./light-theme.css";
import "./light-theme-polish.css";
import { ThemeInit } from "@/components/theme-init";
import { MobileNavBar } from "@/components/mobile-nav-bar";
import { SiteAnalyticsProvider } from "@/components/site-analytics-provider";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap"
});

export const metadata: Metadata = {
  title: "赛波 | CYBERBALL",
  description: "赛波（CYBERBALL）源于赛博世界波，将实时赛事、AI 预测、全球新闻与数据可视化融合为足球时代的数字竞技场。"
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
          {children}
          <MobileNavBar />
        </SiteAnalyticsProvider>
      </body>
    </html>
  );
}
