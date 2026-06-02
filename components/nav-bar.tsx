"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Calendar, Flag, Home, Newspaper, UserRound } from "lucide-react";
import { getPlayerAvatar } from "@/lib/user-preferences";
import { userApi, type UserHomePayload } from "@/lib/user-system";

const navItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "新闻", href: "/news", icon: Newspaper },
  { label: "赛程", href: "/matches", icon: Calendar },
  { label: "球队", href: "/teams", icon: Flag },
  { label: "数据", href: "/data", icon: BarChart3 },
];

export function NavBar() {
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    userApi<UserHomePayload>("/api/me/home", { cache: "no-store" })
      .then((payload) => {
        if (!active) return;
        const playerId = payload.user.profile.avatarPlayerId ?? null;
        const followedPlayer = payload.user.followedPlayers.find((player) => player.id === playerId);
        setAvatarUrl(followedPlayer?.photo || getPlayerAvatar(playerId, payload.catalog?.players));
        setIsSignedIn(true);
      })
      .catch(() => {
        if (!active) return;
        setAvatarUrl(null);
        setIsSignedIn(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const meActive = pathname.startsWith("/me");

  return (
    <nav className="hero-shell hidden min-h-20 items-center justify-between gap-4 px-5 py-4 sm:px-7 lg:flex" style={{ borderRadius: "1.2rem" }}>
      <Link href="/" className="group flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://digitalhub.fifa.com/transform/157d23bf-7e13-4d7b-949e-5d27d340987e/WC26_Logo?&io=transform:fill&quality=75"
          alt="FIFA World Cup 2026"
          className="h-11 w-11 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,.5)] transition duration-300 group-hover:drop-shadow-[0_0_18px_rgba(216,255,62,.32)]"
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
              className={`flex items-center gap-1.5 text-sm font-medium uppercase tracking-[0.12em] transition ${
                isActive
                  ? "text-volt drop-shadow-[0_0_12px_rgba(216,255,62,.8)]"
                  : "text-white/45 hover:text-white/82"
              }`}
            >
              <item.icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 1.75} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <Link
        href="/me"
        aria-label="我的世界杯"
        className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] shadow-[0_0_28px_rgba(216,255,62,.14)] ring-1 transition ${
          meActive ? "ring-volt/70" : "ring-white/12 hover:ring-volt/45"
        }`}
      >
        {isSignedIn ? (
          <Image src={avatarUrl || getPlayerAvatar(null)} alt="我的世界杯" fill sizes="48px" className="object-cover" />
        ) : (
          <UserRound className="h-5 w-5 text-volt" />
        )}
      </Link>
    </nav>
  );
}
