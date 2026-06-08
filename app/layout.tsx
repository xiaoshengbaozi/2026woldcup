import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "./light-theme.css";
import "./light-theme-polish.css";
import { ThemeInit } from "@/components/theme-init";
import { MobileNavBar } from "@/components/mobile-nav-bar";
import { SiteAnalyticsProvider } from "@/components/site-analytics-provider";
import { SupportCreatorModal } from "@/components/support-creator-modal";
import { PwaRegister } from "@/components/pwa-register";
import { UserSessionProvider } from "@/components/user-session-provider";
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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "赛波",
    statusBarStyle: "black-translucent"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05070f" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" }
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
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
          <UserSessionProvider>
            <ThemeInit />
            <PwaRegister />
            <Suspense fallback={null}>
              <WechatShareBridge />
            </Suspense>
            {children}
            <MobileNavBar />
            <SupportCreatorModal />
          </UserSessionProvider>
        </SiteAnalyticsProvider>
      </body>
    </html>
  );
}
