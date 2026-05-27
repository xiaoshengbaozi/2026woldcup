"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "首页", href: "/" },
  { label: "赛程", href: "/matches" },
  { label: "小组", href: "/#groups" },
  { label: "球队", href: "#" },
  { label: "数据", href: "#" },
  { label: "新闻", href: "#" },
  { label: "关于", href: "#" }
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="hero-shell flex min-h-20 items-center justify-between gap-4 px-5 py-4 sm:px-7" style={{ borderRadius: "1.2rem" }}>
      <Link href="/" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/2026_FIFA_World_Cup_emblem.svg"
          alt="FIFA World Cup 2026 emblem"
          className="h-11 w-11 object-contain drop-shadow-[0_0_12px_rgba(216,255,62,.35)]"
        />
        <div className="leading-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://digitalhub.fifa.com/transform/befe3a64-328b-453c-8b58-0faeb9103684/FIFA_Logo_White_Generic?&io=transform:fill&quality=75"
            alt="FIFA"
            className="h-6 w-auto object-contain"
          />
          <p className="mt-0.5 text-sm font-medium uppercase tracking-[0.08em] text-white/82">2026 世界杯</p>
        </div>
      </Link>

      <div className="hidden items-center gap-8 lg:flex">
        {navItems.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`text-sm font-medium uppercase tracking-[0.12em] transition ${
                isActive
                  ? "text-volt drop-shadow-[0_0_12px_rgba(216,255,62,.8)]"
                  : "text-white/45 hover:text-white/82"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-11 items-center gap-2 rounded-full bg-volt/10 px-5 text-sm font-semibold uppercase tracking-[0.12em] text-volt shadow-[0_0_28px_rgba(216,255,62,.22)] ring-1 ring-volt/35">
          <span className="h-2 w-2 rounded-full bg-volt shadow-[0_0_14px_rgba(216,255,62,.9)]" />
          赛程同步
        </div>
      </div>
    </nav>
  );
}
