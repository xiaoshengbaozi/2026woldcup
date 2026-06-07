"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Star } from "lucide-react";
import { MeAuthDialog, type SharedAuthMode } from "@/components/me-auth-dialog";
import { userApi, type PublicUser, type UserSessionPayload } from "@/lib/user-system";

type ActionKind = "team" | "player" | "match";

type UserActionButtonProps = {
  kind: ActionKind;
  payload: Record<string, string | number | null | undefined>;
  className?: string;
  iconOnly?: boolean;
  onChanged?: (active: boolean) => void;
};

const ACTION_COPY: Record<ActionKind, { idle: string; active: string; pending: string; canceling: string; confirmTitle: string; confirmBody: string }> = {
  team: {
    idle: "关注球队",
    active: "已关注",
    pending: "写入中",
    canceling: "取消中",
    confirmTitle: "取消关注球队",
    confirmBody: "确定不再关注这支球队吗？相关比赛收藏不会自动删除，可在比赛页单独取消。",
  },
  player: {
    idle: "关注球员",
    active: "已关注",
    pending: "写入中",
    canceling: "取消中",
    confirmTitle: "取消关注球员",
    confirmBody: "确定不再关注这名球员吗？相关比赛收藏不会自动删除，可在比赛页单独取消。",
  },
  match: {
    idle: "收藏比赛",
    active: "已收藏",
    pending: "收藏中",
    canceling: "取消中",
    confirmTitle: "取消收藏比赛",
    confirmBody: "确定取消收藏这场比赛吗？对应的站内提醒也会一起关闭。",
  },
};

const topIconButtonClass =
  "grid h-[34px] w-[34px] min-w-[34px] place-items-center rounded-full bg-white/[0.08] shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition disabled:opacity-60";

export function UserActionButton({ kind, payload, className = "", iconOnly = false, onChanged }: UserActionButtonProps) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [authMode, setAuthMode] = useState<SharedAuthMode | null>(null);
  const id = String(payload.id || payload.matchId || "");

  const refreshSession = useCallback(() => {
    let mounted = true;
    userApi<UserSessionPayload>("/api/me/session", { cache: "no-store" })
      .then((home) => {
        if (!mounted) return;
        setSignedIn(true);
        setActive(isAlreadySaved(kind, id, home.user));
      })
      .catch(() => {
        if (!mounted) return;
        setSignedIn(false);
      });
    return () => {
      mounted = false;
    };
  }, [kind, id]);

  useEffect(() => refreshSession(), [refreshSession]);

  async function runAction() {
    if (busy) return;
    if (!signedIn) {
      setAuthMode("login");
      return;
    }
    if (active) {
      setConfirmOpen(true);
      return;
    }

    setBusy(true);
    try {
      const path = kind === "team" ? "/api/me/follow/team" : kind === "player" ? "/api/me/follow/player" : "/api/me/favorite-match";
      const result = await userApi<{ user: PublicUser }>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const nextActive = isAlreadySaved(kind, id, result.user);
      setActive(nextActive);
      onChanged?.(nextActive);
    } finally {
      setBusy(false);
    }
  }

  async function cancelAction() {
    if (busy || !id) return;
    setBusy(true);
    try {
      const path =
        kind === "team"
          ? `/api/me/follow/team/${encodeURIComponent(id)}`
          : kind === "player"
            ? `/api/me/follow/player/${encodeURIComponent(id)}`
            : `/api/me/favorite-match/${encodeURIComponent(id)}`;
      const result = await userApi<{ user: PublicUser }>(path, { method: "DELETE" });
      const nextActive = isAlreadySaved(kind, id, result.user);
      setActive(nextActive);
      onChanged?.(nextActive);
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const copy = ACTION_COPY[kind];
  const Icon = kind === "match" ? Bell : active ? Check : Star;
  const label = busy ? (active ? copy.canceling : copy.pending) : active ? copy.active : copy.idle;

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={runAction}
        disabled={busy}
        className={
          iconOnly
            ? `${topIconButtonClass} ${
                active ? "text-volt ring-volt/55" : "text-white/72 ring-white/12 hover:text-white hover:ring-volt/35"
              } ${className}`
            : `inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] transition disabled:opacity-60 ${
                active
                  ? "bg-volt text-black shadow-[0_0_28px_rgba(216,255,62,.18)]"
                  : "bg-white/[0.07] text-white/72 ring-1 ring-white/[0.1] hover:bg-volt/[0.12] hover:text-volt hover:ring-volt/25"
              } ${className}`
        }
      >
        <Icon className="h-4 w-4" />
        {!iconOnly && label}
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-[430] grid place-items-center bg-black/62 px-4 backdrop-blur-xl">
          <div className="hero-card w-full max-w-[360px] overflow-hidden rounded-[1.75rem] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,.72),0_0_54px_rgba(216,255,62,.14)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-volt/80">Confirm</p>
            <h3 className="mt-2 text-xl font-bold">{copy.confirmTitle}</h3>
            <p className="mt-3 text-sm leading-6 text-white/55">{copy.confirmBody}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={cancelAction}
                disabled={busy}
                className="inline-flex h-11 items-center justify-center rounded-full bg-volt text-sm font-black text-black transition hover:scale-[1.02] disabled:opacity-60"
              >
                确定
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
                className="inline-flex h-11 items-center justify-center rounded-full bg-white/[0.06] text-sm font-bold text-white/70 ring-1 ring-white/[0.1] transition hover:bg-white/[0.1] hover:text-white disabled:opacity-60"
              >
                放弃
              </button>
            </div>
          </div>
        </div>
      )}
      <MeAuthDialog mode={authMode} onClose={() => setAuthMode(null)} onAuthenticated={refreshSession} />
    </>
  );
}

function isAlreadySaved(kind: ActionKind, id: string, user: PublicUser) {
  if (kind === "team") return user.followedTeams.some((item) => item.id === id);
  if (kind === "player") return user.followedPlayers.some((item) => item.id === id);
  return user.favoriteMatches.some((item) => item.id === id);
}
