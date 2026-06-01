"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Calendar, Home, Newspaper, UserRound } from "lucide-react";

const navItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "新闻", href: "/news", icon: Newspaper },
  { label: "赛程", href: "/matches", icon: Calendar },
  { label: "数据", href: "/data", icon: BarChart3 },
  { label: "我的", href: "/me", icon: UserRound },
];

export function MobileNavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
    >
      <div
        className="mx-3 mb-3 flex items-center justify-around rounded-2xl px-2 py-2"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)), rgba(5,8,8,0.92)",
          boxShadow:
            "0 -8px 40px rgba(0,0,0,0.5), 0 0 60px -10px rgba(216,255,62,0.04), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(216,255,62,0.04)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(216,255,62,0.15), rgba(255,255,255,0.06), rgba(216,255,62,0.15), transparent)",
          }}
        />

        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className="relative flex flex-col items-center gap-1 px-2 py-1.5 transition-colors sm:px-3"
            >
              {active && (
                <span
                  className="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(216,255,62,0.6), rgba(216,255,62,0))",
                    filter: "blur(3px)",
                  }}
                />
              )}

              <Icon
                className={`h-5 w-5 transition-colors ${
                  active
                    ? "text-volt drop-shadow-[0_0_10px_rgba(216,255,62,0.7)]"
                    : "text-white/35"
                }`}
                strokeWidth={active ? 2.5 : 1.75}
              />

              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  active
                    ? "text-volt"
                    : "text-white/40"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
