"use client";

import type { ReactNode } from "react";
import { Eye, UsersRound } from "lucide-react";
import { useSiteAnalyticsStats } from "@/components/site-analytics-provider";

export function SiteFooter() {
  const stats = useSiteAnalyticsStats();

  return (
    <footer className="hero-card z-40 mt-auto hidden overflow-hidden lg:block">
      <div className="relative z-10 flex h-[var(--ticker-height)] items-center justify-between overflow-hidden border-b border-white/[0.04]">
        <FooterBrand />
        <div className="flex h-full items-center">
          <FooterStat icon={<Eye className="h-3.5 w-3.5" />} label="今日浏览" value={formatStat(stats?.todayViews)} />
          <FooterStat icon={<UsersRound className="h-3.5 w-3.5" />} label="在线用户" value={formatStat(stats?.onlineUsers)} live />
        </div>
      </div>
    </footer>
  );
}

function FooterBrand() {
  return (
    <div className="flex min-w-0 items-center gap-2 px-4">
      <span
        className="truncate text-[clamp(10px,0.68vw,13px)] font-normal leading-none tracking-[0.2em] text-volt drop-shadow-[0_0_16px_rgba(216,255,62,.5)]"
        style={{ fontFamily: "CyberballBrand, ScreenMatrix, sans-serif" }}
      >
        CyberBall
      </span>
      <span className="whitespace-nowrap text-[10px] text-white/22">|</span>
      <span className="whitespace-nowrap text-[10px] text-white/22">赛博世界波</span>
    </div>
  );
}

function FooterStat({
  icon,
  label,
  value,
  live,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <div className="flex h-full shrink-0 items-center gap-2 border-l border-white/[0.06] px-4 text-white/55">
      <span className="text-volt/55">{icon}</span>
      <span className="whitespace-nowrap text-[10px] text-white/32">{label}</span>
      <span className="font-mono text-[11px] font-black tabular-nums text-white/78">{value}</span>
      {live && <span className="h-1.5 w-1.5 rounded-full bg-volt shadow-[0_0_12px_rgba(216,255,62,.65)]" />}
    </div>
  );
}

function formatStat(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString("en-US") : "--";
}
