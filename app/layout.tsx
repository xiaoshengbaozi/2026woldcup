import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import "./light-theme.css";
import "./light-theme-polish.css";
import { ThemeInit } from "@/components/theme-init";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap"
});

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 Dashboard",
  description: "A futuristic World Cup 2026 match control dashboard."
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
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}
