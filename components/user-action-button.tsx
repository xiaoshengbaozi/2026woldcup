"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Star } from "lucide-react";
import { userApi, type PublicUser, type UserHomePayload } from "@/lib/user-system";

type ActionKind = "team" | "player" | "match";

type UserActionButtonProps = {
  kind: ActionKind;
  payload: Record<string, string | number | null | undefined>;
  className?: string;
};

const ACTION_COPY: Record<ActionKind, { idle: string; active: string; pending: string }> = {
  team: { idle: "关注球队", active: "已关注", pending: "写入中" },
  player: { idle: "关注球员", active: "已关注", pending: "写入中" },
  match: { idle: "收藏比赛", active: "已收藏", pending: "收藏中" },
};

export function UserActionButton({ kind, payload, className = "" }: UserActionButtonProps) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    userApi<UserHomePayload>("/api/me/home", { cache: "no-store" })
      .then((home) => {
        if (!mounted) return;
        setSignedIn(true);
        setActive(isAlreadySaved(kind, String(payload.id || payload.matchId || ""), home.user));
      })
      .catch(() => {
        if (!mounted) return;
        setSignedIn(false);
      });
    return () => {
      mounted = false;
    };
  }, [kind, payload.id, payload.matchId]);

  async function runAction() {
    if (busy) return;
    if (!signedIn) {
      window.location.href = "/me?auth=login";
      return;
    }

    setBusy(true);
    try {
      const path = kind === "team" ? "/api/me/follow/team" : kind === "player" ? "/api/me/follow/player" : "/api/me/favorite-match";
      const result = await userApi<{ user: PublicUser }>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setActive(isAlreadySaved(kind, String(payload.id || payload.matchId || ""), result.user));
    } finally {
      setBusy(false);
    }
  }

  const copy = ACTION_COPY[kind];
  const Icon = kind === "match" ? Bell : active ? Check : Star;

  return (
    <button
      type="button"
      onClick={runAction}
      disabled={busy}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] transition disabled:opacity-60 ${
        active
          ? "bg-volt text-black shadow-[0_0_28px_rgba(216,255,62,.18)]"
          : "bg-white/[0.07] text-white/72 ring-1 ring-white/[0.1] hover:bg-volt/[0.12] hover:text-volt hover:ring-volt/25"
      } ${className}`}
    >
      <Icon className="h-4 w-4" />
      {busy ? copy.pending : active ? copy.active : copy.idle}
    </button>
  );
}

function isAlreadySaved(kind: ActionKind, id: string, user: PublicUser) {
  if (kind === "team") return user.followedTeams.some((item) => item.id === id);
  if (kind === "player") return user.followedPlayers.some((item) => item.id === id);
  return user.favoriteMatches.some((item) => item.id === id);
}
