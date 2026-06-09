"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Sparkles, Star } from "lucide-react";
import { MeAuthDialog, type SharedAuthMode } from "@/components/me-auth-dialog";
import { mobileFloatingSurfaceStyle } from "@/components/mobile-surface-styles";
import { useUserSession } from "@/components/user-session-provider";
import { userApi, type PublicUser } from "@/lib/user-system";

type ActionKind = "team" | "player" | "match";

type UserActionButtonProps = {
  kind: ActionKind;
  payload: Record<string, string | number | null | undefined>;
  className?: string;
  wrapperClassName?: string;
  iconOnly?: boolean;
  variant?: "default" | "heroGhost";
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
  "mobile-floating-surface grid h-[34px] w-[34px] min-w-[34px] place-items-center rounded-full bg-white/[0.08] shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition disabled:opacity-60";

const FEEDBACK_COPY: Record<ActionKind, { added: string; removed: string }> = {
  team: { added: "已关注", removed: "已取消关注" },
  player: { added: "已关注", removed: "已取消关注" },
  match: { added: "已收藏", removed: "已取消收藏" },
};

export function UserActionButton({
  kind,
  payload,
  className = "",
  wrapperClassName = "",
  iconOnly = false,
  variant = "default",
  onChanged,
}: UserActionButtonProps) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [authMode, setAuthMode] = useState<SharedAuthMode | null>(null);
  const [feedback, setFeedback] = useState<"added" | "removed" | null>(null);
  const { home, signedIn, refreshSession } = useUserSession();
  const id = String(payload.id || payload.matchId || "");

  useEffect(() => {
    setActive(Boolean(home && isAlreadySaved(kind, id, home.user)));
  }, [home, id, kind]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 1100);
    return () => window.clearTimeout(timer);
  }, [feedback]);

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
      if (nextActive) setFeedback("added");
      onChanged?.(nextActive);
      void refreshSession();
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
      setFeedback(nextActive ? "added" : "removed");
      onChanged?.(nextActive);
      void refreshSession();
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const copy = ACTION_COPY[kind];
  const Icon = kind === "match" ? Bell : active ? Check : Star;
  const label = busy ? (active ? copy.canceling : copy.pending) : active ? copy.active : copy.idle;
  const wrapperPositionClass = /\b(?:absolute|fixed|sticky|relative)\b/.test(wrapperClassName) ? "" : "relative";
  const textButtonClass =
    variant === "heroGhost"
      ? `inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold normal-case tracking-normal transition disabled:opacity-60 ${
          active
            ? "bg-volt text-black shadow-[0_0_28px_rgba(216,255,62,.18)]"
            : "bg-white/[0.06] text-white/60 ring-1 ring-white/[0.08] backdrop-blur-md hover:bg-volt/[0.1] hover:text-volt hover:ring-volt/20"
        } ${className}`
      : `inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] transition disabled:opacity-60 ${
          active
            ? "bg-volt text-black shadow-[0_0_28px_rgba(216,255,62,.18)]"
            : "bg-white/[0.07] text-white/72 ring-1 ring-white/[0.1] hover:bg-volt/[0.12] hover:text-volt hover:ring-volt/25"
        } ${className}`;

  return (
    <>
      <span className={`${wrapperPositionClass} inline-flex ${wrapperClassName}`}>
        <button
          type="button"
          aria-label={label}
          onClick={runAction}
          disabled={busy}
          style={iconOnly ? mobileFloatingSurfaceStyle : undefined}
          className={
            iconOnly
              ? `${topIconButtonClass} ${
                  active ? "text-volt ring-volt/55" : "text-white/72 ring-white/12 hover:text-white hover:ring-volt/35"
                } ${className}`
              : textButtonClass
          }
        >
          <motion.span
            className="grid place-items-center"
            animate={feedback ? { scale: [1, 1.26, 1], rotate: feedback === "added" ? [0, -9, 0] : [0, 9, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
          >
            <Icon className="h-4 w-4" />
          </motion.span>
          {!iconOnly && label}
        </button>

        <AnimatePresence>
          {feedback && (
            <>
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full border border-volt/70 shadow-[0_0_28px_rgba(216,255,62,.22)]"
                initial={{ opacity: 0.75, scale: 0.92 }}
                animate={{ opacity: 0, scale: 1.55 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.62, ease: "easeOut" }}
              />
              <motion.span
                role="status"
                className="pointer-events-none absolute left-1/2 top-0 z-20 inline-flex -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] items-center gap-1.5 whitespace-nowrap rounded-full border border-volt/35 bg-black/72 px-3 py-1.5 text-[11px] font-black text-volt shadow-[0_18px_44px_rgba(0,0,0,.45),0_0_26px_rgba(216,255,62,.16)] backdrop-blur-2xl"
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Sparkles className="h-3 w-3" />
                {FEEDBACK_COPY[kind][feedback]}
              </motion.span>
            </>
          )}
        </AnimatePresence>
      </span>

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
