"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Newspaper,
  RadioTower,
  Shield,
  Swords,
} from "lucide-react";

export type MatchTab = "lineup" | "odds" | "timeline" | "stats" | "h2h" | "news";

const NAV_ITEMS: { id: MatchTab; label: string; icon: typeof Shield }[] = [
  { id: "lineup", label: "阵容", icon: Shield },
  { id: "odds", label: "赔率", icon: Activity },
  { id: "timeline", label: "事件", icon: RadioTower },
  { id: "stats", label: "统计", icon: BarChart3 },
  { id: "h2h", label: "交锋", icon: Swords },
  { id: "news", label: "新闻", icon: Newspaper },
];

export function MatchNav({
  active,
  onTabChange,
}: {
  active: MatchTab;
  onTabChange: (tab: MatchTab) => void;
}) {
  return (
    <div className="sticky top-0 z-30 mb-5 -mx-1 overflow-x-auto px-1 py-3 scrollbar-hidden">
      <nav className="relative mx-auto flex w-max min-w-full items-center gap-1 rounded-[2rem] bg-white/[0.055] p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/[0.06] backdrop-blur-2xl sm:min-w-0">
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(216,255,62,0.10),transparent_58%)]" />
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex h-11 min-w-[74px] shrink-0 items-center justify-center gap-1.5 rounded-[1.45rem] px-3 text-xs font-semibold transition-colors duration-200 sm:min-w-[96px] sm:px-5 sm:text-sm ${
                isActive
                  ? "text-white"
                  : "text-white/48 hover:text-white/78"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="match-nav-indicator"
                  className="absolute inset-0 rounded-[1.45rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.12),rgba(8,10,10,0.88)_46%,rgba(216,255,62,0.08))] shadow-[0_6px_20px_rgba(0,0,0,0.28),0_0_18px_rgba(216,255,62,0.08),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/[0.08]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon
                className={`relative h-4 w-4 shrink-0 transition-colors sm:h-[18px] sm:w-[18px] ${
                  isActive ? "text-volt" : "text-white/42"
                }`}
              />
              <span className="relative whitespace-nowrap tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
