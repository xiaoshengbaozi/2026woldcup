"use client";

import { type FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GROUPS, getTeamByCode, type GroupTeam, type GroupMatch } from "@/data/world-cup-2026-groups";
import { usePredictionStore } from "@/lib/store/prediction-store";
import type { StandingRow, KnockoutMatch } from "@/lib/store/prediction";
import { userApi, type UserHomePayload } from "@/lib/user-system";
import { fallbackUserPreferenceCatalog, type UserPreferenceCatalog } from "@/lib/user-preferences";
import { ChevronLeft, LogIn, ShieldCheck, Shuffle, UserPlus, X } from "lucide-react";

/* ── Helpers ── */

function team(code: string | null | undefined): GroupTeam | undefined {
  return code ? getTeamByCode(code) : undefined;
}

function Flag({ code, size = 20 }: { code: string; size?: number }) {
  const t = team(code);
  if (!t) return <span className="inline-block" style={{ width: size, height: size }} />;
  return (
    <span
      className="inline-flex items-center justify-center rounded-[3px] bg-white/10 ring-1 ring-white/10 overflow-hidden shrink-0"
      style={{ width: size * 1.33, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://flagcdn.com/w40/${t.flagCode}.png`} alt={t.name} className="h-full w-full object-cover" loading="lazy" />
    </span>
  );
}

/* ── Score Input ── */

function ScoreInput({ value, onChange, highlight = false }: { value: number | null; onChange: (v: number | null) => void; highlight?: boolean }) {
  return (
    <input
      type="number" min={0} max={20} value={value ?? ""} placeholder="-"
      onChange={(e) => { const v = e.target.value; onChange(v === "" ? null : Math.max(0, Math.min(20, parseInt(v, 10) || 0))); }}
      className={`w-9 h-8 text-center text-sm font-semibold tabular rounded-md bg-white/[0.06] border transition-all outline-none
        ${highlight ? "border-volt/50 text-volt shadow-[0_0_8px_rgba(216,255,62,0.15)]" : "border-white/10 text-white/80 focus:border-volt/40 focus:text-white"}
        placeholder:text-white/25 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   GROUP STAGE — Tab navigation with summary cards
   ═══════════════════════════════════════════════════════════ */

function GroupStageView() {
  const [activeTab, setActiveTab] = useState("A");
  const groupScores = usePredictionStore((s) => s.groupScores);

  // Determine which groups have data (at least one score entered)
  const filledGroupIds = GROUPS.filter((g) => g.matches.some((m) => groupScores[m.id])).map((g) => g.id);

  return (
    <div className="flex flex-col gap-4">
      {/* Filled group summary cards — 4 per row */}
      {filledGroupIds.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filledGroupIds.map((gid) => (
            <GroupSummaryCard key={gid} groupId={gid} onClick={() => setActiveTab(gid)} />
          ))}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="小组分类">
        {GROUPS.map((g) => {
          const isActive = activeTab === g.id;
          const hasData = g.matches.some((m) => groupScores[m.id]);
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(g.id)}
              className={`group relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-left text-xs font-bold transition duration-300 sm:px-3.5 sm:py-2 sm:text-sm
                ${isActive
                  ? "bg-volt text-black shadow-[0_0_24px_rgba(216,255,62,.2)]"
                  : "bg-white/[0.055] text-white/62 ring-1 ring-white/[0.08] hover:bg-white/[0.09] hover:text-white"
                }`}
            >
              <span>{g.id} 组</span>
              {hasData && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums sm:px-2 sm:text-[11px]
                  ${isActive ? "bg-black/15 text-black" : "bg-black/25 text-volt/80 group-hover:bg-volt/[0.12]"}`}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active group card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <GroupFullCard groupId={activeTab} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Group Summary Card (compact, for above tabs) ── */

function GroupSummaryCard({ groupId, onClick }: { groupId: string; onClick: () => void }) {
  const standings = usePredictionStore((s) => s.getGroupStandings(groupId));
  const hasData = standings.some((r) => r.played > 0);

  return (
    <button
      onClick={onClick}
      className="overflow-hidden rounded-2xl bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,.075)] ring-1 ring-white/[0.07] backdrop-blur-2xl text-left hover:shadow-glow transition-shadow"
    >
      <div className="grid grid-cols-[minmax(80px,1fr)_28px_28px_28px_28px_36px] items-center px-4 py-3 text-[10px] uppercase tracking-[0.08em] text-white/52">
        <span className="text-left text-volt font-bold">{groupId} 组</span>
        <span className="text-center">P</span>
        <span className="text-center">W</span>
        <span className="text-center">D</span>
        <span className="text-center">L</span>
        <span className="text-right">PTS</span>
      </div>

      {hasData ? (
        <div className="divide-y divide-white/[0.025]">
          {standings.slice(0, 4).map((row, i) => (
            <div key={row.teamCode} className="grid grid-cols-[minmax(80px,1fr)_28px_28px_28px_28px_36px] items-center px-4 py-2 text-sm transition odd:bg-volt/[0.035] hover:bg-white/[0.045]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`tabular w-4 shrink-0 text-xs font-semibold ${i < 2 ? "text-volt" : "text-white/45"}`}>{i + 1}</span>
                <Flag code={row.teamCode} size={16} />
                <span className="truncate text-xs font-semibold uppercase text-white">{team(row.teamCode)?.nameCn ?? row.teamCode}</span>
              </div>
              <span className="tabular text-center text-xs text-white/78">{row.played}</span>
              <span className="tabular text-center text-xs text-white/78">{row.won}</span>
              <span className="tabular text-center text-xs text-white/78">{row.drawn}</span>
              <span className="tabular text-center text-xs text-white/78">{row.lost}</span>
              <span className={`tabular text-right text-xs font-semibold ${row.points > 0 ? "text-flare" : "text-volt"}`}>{row.points}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-[10px] text-white/20">暂无数据</div>
      )}
    </button>
  );
}

/* ── Group Full Card (tab content) ── */

function GroupFullCard({ groupId }: { groupId: string }) {
  const group = GROUPS.find((g) => g.id === groupId)!;

  return (
    <div className="hero-card overflow-hidden p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((round) => {
          const roundMatches = group.matches.filter((m) => m.round === round);
          return (
            <div key={round}>
              <div className="text-[9px] uppercase tracking-widest text-white/25 mb-2">第 {round} 轮</div>
              <div className="space-y-2">
                {roundMatches.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Match Row ── */

function MatchRow({ match }: { match: GroupMatch }) {
  const score = usePredictionStore((s) => s.groupScores[match.id]);
  const setGroupScore = usePredictionStore((s) => s.setGroupScore);
  const hTeam = team(match.homeTeamCode);
  const aTeam = team(match.awayTeamCode);

  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] rounded-lg transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="text-xs font-medium text-white/80 truncate text-right">{hTeam?.nameCn ?? match.homeTeamCode}</span>
        <Flag code={match.homeTeamCode} size={16} />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <ScoreInput value={score?.home ?? null} onChange={(v) => setGroupScore(match.id, v ?? 0, score?.away ?? 0)} highlight={score != null && score.home > score.away} />
        <span className="text-white/30 text-xs font-bold">:</span>
        <ScoreInput value={score?.away ?? null} onChange={(v) => setGroupScore(match.id, score?.home ?? 0, v ?? 0)} highlight={score != null && score.away > score.home} />
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Flag code={match.awayTeamCode} size={16} />
        <span className="text-xs font-medium text-white/80 truncate">{aTeam?.nameCn ?? match.awayTeamCode}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   THIRD PLACE PANEL
   ═══════════════════════════════════════════════════════════ */

function ThirdPlacePanel() {
  const allThirds = usePredictionStore((s) => s.getAllThirdPlace());
  const bestThirds = usePredictionStore((s) => s.getBestThirds());
  const hasData = allThirds.length > 0 && allThirds.some((r) => r.played > 0);
  if (!hasData) return null;

  const bestIds = new Set(bestThirds.map((t) => t.groupId));

  return (
    <div className="hero-card overflow-hidden px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-flare font-bold text-sm">最佳第三名排名</span>
        <span className="text-[10px] text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-full">前 8 名晋级</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {allThirds.map((row, i) => {
          const isBest = bestIds.has(row.groupId);
          return (
            <div key={row.groupId} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition
              ${isBest ? "bg-volt/[0.08] border border-volt/20" : "bg-white/[0.03] border border-white/[0.05] opacity-50"}`}>
              <span className="text-[10px] font-bold text-white/40 w-4">{i + 1}</span>
              <Flag code={row.teamCode} size={14} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-medium text-white/80">{team(row.teamCode)?.nameCn ?? row.teamCode}</div>
                <div className="text-[9px] text-white/30">{row.groupId}组 · {row.points}分 · 净胜球{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</div>
              </div>
              {isBest && <span className="text-[8px] text-volt font-bold">✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   KNOCKOUT STAGE — Vertical round-by-round
   ═══════════════════════════════════════════════════════════ */

function KnockoutStageView() {
  const knockoutMatches = usePredictionStore((s) => s.getKnockoutMatches());
  const champion = usePredictionStore((s) => s.getChampion());
  const t = champion ? team(champion) : null;

  const rounds: { label: string; tag: string; matches: KnockoutMatch[] }[] = [
    { label: "32 强", tag: "r32", matches: knockoutMatches.filter((m) => m.round === "r32") },
    { label: "16 强", tag: "r16", matches: knockoutMatches.filter((m) => m.round === "r16") },
    { label: "8 强", tag: "qf", matches: knockoutMatches.filter((m) => m.round === "qf") },
    { label: "半决赛", tag: "sf", matches: knockoutMatches.filter((m) => m.round === "sf") },
    { label: "三四名", tag: "third", matches: knockoutMatches.filter((m) => m.round === "third") },
    { label: "决赛", tag: "final", matches: knockoutMatches.filter((m) => m.round === "final") },
  ];

  return (
    <div className="flex flex-col gap-4">
      {rounds.map((round) => (
        <RoundSection key={round.tag} label={round.label} matches={round.matches} />
      ))}

      {/* Champion */}
      {t && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hero-card overflow-hidden px-6 py-8 text-center"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/40 to-transparent" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-volt/60 mb-3">你的冠军预测</div>
          <div className="text-5xl mb-2">{t.flagEmoji}</div>
          <div className="text-2xl font-bold text-white mb-1">{t.nameCn}</div>
          <div className="text-sm text-white/40">{t.name}</div>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-volt/10 border border-volt/20">
            <span className="text-volt text-sm font-bold">🏆 冠军</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ── Round Section ── */

function RoundSection({ label, matches }: { label: string; matches: KnockoutMatch[] }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="hero-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">{label}</span>
          <span className="text-[10px] text-white/25 tabular">{matches.length} 场</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/20 tabular">
            {matches.filter((m) => knockoutPicksHaveWinner(m.id)).length}/{matches.length}
          </span>
          <motion.span animate={{ rotate: collapsed ? -90 : 90 }} className="text-white/30 text-xs">›</motion.span>
        </div>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 grid grid-cols-4 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {matches.map((m) => (
                <KnockoutMatchCard key={m.id} match={m} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function knockoutPicksHaveWinner(matchId: string): boolean {
  return usePredictionStore.getState().knockoutPicks[matchId] != null;
}

/* ── Knockout Match Card ── */

function KnockoutMatchCard({ match }: { match: KnockoutMatch }) {
  const { knockoutPicks, setKnockoutPick } = usePredictionStore();
  const pick = knockoutPicks[match.id];
  const homeT = team(match.home.teamCode);
  const awayT = team(match.away.teamCode);

  const homeReady = !!match.home.teamCode;
  const awayReady = !!match.away.teamCode;
  const bothReady = homeReady && awayReady;

  const select = (code: string) => {
    if (!code || !bothReady) return;
    const isHome = code === match.home.teamCode;
    setKnockoutPick(match.id, code, isHome ? 1 : 0, isHome ? 0 : 1);
  };

  // Not ready — show placeholder card
  if (!bothReady) {
    return (
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] overflow-hidden opacity-40">
        <div className="px-3 py-1 bg-white/[0.02] border-b border-white/[0.03] flex items-center justify-between">
          <span className="text-[9px] text-white/20">{match.label}</span>
        </div>
        <div className="px-3 py-2.5 flex items-center gap-2 border-b border-white/[0.03]">
          <span className="w-5 h-4 rounded bg-white/5" />
          <span className="text-[10px] text-white/20 italic">{homeReady ? homeT!.nameCn : match.home.sourceLabel} 待定</span>
        </div>
        <div className="px-3 py-2.5 flex items-center gap-2">
          <span className="w-5 h-4 rounded bg-white/5" />
          <span className="text-[10px] text-white/20 italic">{awayReady ? awayT!.nameCn : match.away.sourceLabel} 待定</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden transition-all
      ${pick ? "border-volt/15 bg-white/[0.04]" : "border-white/[0.08] bg-white/[0.03]"}`}>
      <div className="px-3 py-1 bg-white/[0.03] border-b border-white/[0.05] flex items-center justify-between">
        <span className="text-[9px] text-white/25">{match.label}</span>
        {match.round === "final" && <span className="text-[8px] font-bold text-volt bg-volt/10 px-1.5 py-0.5 rounded-full">决赛</span>}
        {match.round === "third" && <span className="text-[8px] font-bold text-flare bg-flare/10 px-1.5 py-0.5 rounded-full">季军赛</span>}
      </div>

      <button
        onClick={() => select(match.home.teamCode!)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all border-b border-white/[0.04]
          hover:bg-white/[0.04] cursor-pointer
          ${pick?.winnerCode === match.home.teamCode ? "bg-volt/[0.08]" : ""}`}
      >
        <Flag code={match.home.teamCode!} size={16} />
        <span className={`text-xs font-medium flex-1 truncate ${pick?.winnerCode === match.home.teamCode ? "text-volt" : "text-white/70"}`}>
          {homeT?.nameCn}
        </span>
        {pick?.winnerCode === match.home.teamCode && <span className="text-volt text-[10px] font-bold">✓</span>}
      </button>

      <button
        onClick={() => select(match.away.teamCode!)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all
          hover:bg-white/[0.04] cursor-pointer
          ${pick?.winnerCode === match.away.teamCode ? "bg-volt/[0.08]" : ""}`}
      >
        <Flag code={match.away.teamCode!} size={16} />
        <span className={`text-xs font-medium flex-1 truncate ${pick?.winnerCode === match.away.teamCode ? "text-volt" : "text-white/70"}`}>
          {awayT?.nameCn}
        </span>
        {pick?.winnerCode === match.away.teamCode && <span className="text-volt text-[10px] font-bold">✓</span>}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROGRESS BAR
   ═══════════════════════════════════════════════════════════ */

function ProgressBar() {
  const progress = usePredictionStore((s) => s.getProgress());
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-volt/80 to-volt" initial={{ width: 0 }} animate={{ width: `${progress.percent}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
      </div>
      <span className="text-[10px] tabular text-white/40 shrink-0">{progress.filled}/{progress.total}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

type TabId = "groups" | "knockout";
type AuthStatus = "checking" | "unauthenticated" | "allowed";
type AccessMode = "login" | "register";

function PredictAuthLoading() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[360px] w-[min(720px,100vw)] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px]" />
      <motion.div
        initial={{ opacity: 0, y: 14, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="hero-card w-full max-w-md overflow-hidden px-6 py-7 text-center"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/30 to-transparent" />
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-volt" />
        <h1 className="text-lg font-bold text-white">正在确认登录状态</h1>
        <p className="mt-2 text-sm leading-6 text-white/42">预测页面仅对登录用户开放，未登录会自动前往我的主页。</p>
      </motion.div>
    </div>
  );
}

function PredictAccessGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<AccessMode>("login");
  const [email, setEmail] = useState("demo@worldcup.local");
  const [password, setPassword] = useState("worldcup2026");
  const [displayName, setDisplayName] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [registerStep, setRegisterStep] = useState<"account" | "preferences">("account");
  const [catalog, setCatalog] = useState<UserPreferenceCatalog>(fallbackUserPreferenceCatalog);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(compactIds(fallbackUserPreferenceCatalog.teams[0]?.id));
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(compactIds(fallbackUserPreferenceCatalog.players[0]?.id));

  useEffect(() => {
    let active = true;

    userApi<UserPreferenceCatalog>("/api/user-preferences", { cache: "no-store" })
      .then((payload) => {
        if (!active) return;
        setCatalog(payload);
        setSelectedTeamIds((current) => (current.some((id) => payload.teams.some((team) => team.id === id)) ? current : compactIds(payload.teams[0]?.id)));
        setSelectedPlayerIds((current) => (current.some((id) => payload.players.some((player) => player.id === id)) ? current : compactIds(payload.players[0]?.id)));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("login");
    setError("");

    try {
      await userApi("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请检查邮箱和密码");
    } finally {
      setBusy("");
    }
  }

  function continueToPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!displayName.trim()) return setError("请填写昵称");
    if (!email.trim()) return setError("请填写邮箱");
    if (!password) return setError("请填写密码");
    if (password.length < 8) return setError("密码至少需要 8 位");
    if (password !== repeatPassword) return setError("两次输入的密码不一致");

    setRegisterStep("preferences");
  }

  async function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("register");
    setError("");

    if (!displayName.trim()) {
      setBusy("");
      setError("请填写昵称");
      return;
    }

    if (!email.trim()) {
      setBusy("");
      setError("请填写邮箱");
      return;
    }

    if (!password) {
      setBusy("");
      setError("请填写密码");
      return;
    }

    if (password.length < 8) {
      setBusy("");
      setError("密码至少需要 8 位");
      return;
    }

    if (password !== repeatPassword) {
      setBusy("");
      setError("两次输入的密码不一致");
      return;
    }

    try {
      const followedTeams = catalog.teams.filter((team) => selectedTeamIds.includes(team.id));
      const followedPlayers = catalog.players.filter((player) => selectedPlayerIds.includes(player.id));

      await userApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          displayName: displayName.trim(),
          avatarPlayerId: selectedPlayerIds[0] ?? null,
          followedTeams,
          followedPlayers,
          favoriteMatches: [],
        }),
      });
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败，请稍后再试");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[360px] w-[min(720px,100vw)] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px]" />
      <motion.section
        initial={{ opacity: 0, y: 16, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="hero-card w-full max-w-lg overflow-hidden px-5 py-6 sm:px-7 sm:py-7"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/30 to-transparent" />
        <div className="relative">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/58 ring-1 ring-white/[0.08] transition hover:bg-white/[0.08] hover:text-volt"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            返回首页
          </Link>
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-volt/80">
            <ShieldCheck className="h-4 w-4" />
            预测页面仅对登录用户开放
          </div>
          <div className="mb-5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                mode === "login"
                  ? "bg-volt text-black shadow-[0_0_26px_rgba(216,255,62,.18)]"
                  : "bg-white/[0.05] text-white/60 ring-1 ring-white/[0.08]"
              }`}
            >
              <LogIn className="h-4 w-4" />
              登录
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setRegisterStep("account");
                setError("");
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                mode === "register"
                  ? "bg-volt text-black shadow-[0_0_26px_rgba(216,255,62,.18)]"
                  : "bg-white/[0.05] text-white/60 ring-1 ring-white/[0.08]"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              注册
            </button>
          </div>

          {mode === "login" ? (
            <form className="grid gap-4" onSubmit={submitLogin}>
              <label className="grid gap-2 text-sm text-white/55">
                邮箱
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-2xl bg-black/30 px-4 text-white outline-none ring-1 ring-white/10 transition focus:ring-volt/45"
                />
              </label>
              <label className="grid gap-2 text-sm text-white/55">
                密码
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-2xl bg-black/30 px-4 text-white outline-none ring-1 ring-white/10 transition focus:ring-volt/45"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="min-h-5 text-sm text-flare/80">{error}</p>
                <button
                  type="submit"
                  disabled={busy === "login"}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-volt px-5 text-sm font-bold text-black transition hover:scale-[1.02] disabled:opacity-60"
                >
                  登录并继续
                  <LogIn className="h-4 w-4" />
                </button>
              </div>
            </form>
          ) : (
            <form className="grid gap-4" onSubmit={registerStep === "account" ? continueToPreferences : submitRegister}>
              <div className={registerStep === "account" ? "grid gap-4" : "hidden"}>
              <label className="grid gap-2 text-sm text-white/55">
                昵称
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="h-12 rounded-2xl bg-black/30 px-4 text-white outline-none ring-1 ring-white/10 transition focus:ring-volt/45"
                />
              </label>
              <label className="grid gap-2 text-sm text-white/55">
                邮箱
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-2xl bg-black/30 px-4 text-white outline-none ring-1 ring-white/10 transition focus:ring-volt/45"
                />
              </label>
              <label className="grid gap-2 text-sm text-white/55">
                密码
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-2xl bg-black/30 px-4 text-white outline-none ring-1 ring-white/10 transition focus:ring-volt/45"
                />
              </label>
              <label className="grid gap-2 text-sm text-white/55">
                重复密码
                <input
                  type="password"
                  value={repeatPassword}
                  onChange={(event) => setRepeatPassword(event.target.value)}
                  className="h-12 rounded-2xl bg-black/30 px-4 text-white outline-none ring-1 ring-white/10 transition focus:ring-volt/45"
                />
              </label>
              </div>
              {registerStep === "preferences" && (
                <div className="grid gap-4 rounded-[1.5rem] bg-white/[0.035] p-4 ring-1 ring-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">选择你的关注偏好</h3>
                      <p className="mt-1 text-xs text-white/42">与我的主页注册选单保持一致，可多选。</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRegisterStep("account");
                        setError("");
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-xs font-semibold text-white/65 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      返回
                    </button>
                  </div>
                  <PreferencePicker
                    title="关注球队"
                    items={catalog.teams.slice(0, 12).map((item) => ({
                      id: item.id,
                      title: item.name,
                      subtitle: item.region ?? "TEAM",
                      image: item.logo,
                    }))}
                    selected={selectedTeamIds}
                    onToggle={(id) => setSelectedTeamIds((value) => toggleValue(value, id))}
                  />
                  <PreferencePicker
                    title="关注球员"
                    items={catalog.players.slice(0, 12).map((item) => ({
                      id: item.id,
                      title: item.name,
                      subtitle: [item.team, item.position].filter(Boolean).join(" · ") || "PLAYER",
                      image: item.photo,
                    }))}
                    selected={selectedPlayerIds}
                    onToggle={(id) => setSelectedPlayerIds((value) => toggleValue(value, id))}
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="min-h-5 text-sm text-flare/80">{error}</p>
                <button
                  type="submit"
                  disabled={busy === "register"}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-volt px-5 text-sm font-bold text-black transition hover:scale-[1.02] disabled:opacity-60"
                >
                  {registerStep === "account" ? "下一步" : "创建账户"}
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.section>
    </div>
  );
}

function PreferencePicker({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: Array<{ id: string; title: string; subtitle: string; image?: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">{selected.length} selected</span>
      </div>
      <div className="grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {items.map((item) => {
          const checked = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 text-left text-sm transition ring-1 ${
                checked
                  ? "bg-volt/12 text-white ring-volt/35 shadow-[0_0_22px_rgba(216,255,62,.12)]"
                  : "bg-white/[0.035] text-white/64 ring-white/10 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/10">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
                ) : (
                  <span className="text-[10px] font-black text-volt">{item.title.slice(0, 2)}</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{item.title}</span>
                <span className="mt-0.5 block truncate text-xs text-white/36">{item.subtitle}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function toggleValue(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

function compactIds(id: string | undefined) {
  return id ? [id] : [];
}

export default function PredictPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [activeTab, setActiveTab] = useState<TabId>("groups");
  const { autoFillRandom, resetAll } = usePredictionStore();
  const groupScores = usePredictionStore((s) => s.groupScores);
  const groupTotal = GROUPS.reduce((s, g) => s + g.matches.length, 0);
  const groupFilled = Object.values(groupScores).filter(Boolean).length;

  useEffect(() => {
    let active = true;

    userApi<UserHomePayload>("/api/me/home", { cache: "no-store" })
      .then(() => {
        if (active) setAuthStatus("allowed");
      })
      .catch(() => {
        if (active) setAuthStatus("unauthenticated");
      });

    return () => {
      active = false;
    };
  }, []);

  if (authStatus === "checking") return <PredictAuthLoading />;
  if (authStatus === "unauthenticated") return <PredictAccessGate onAuthenticated={() => setAuthStatus("allowed")} />;

  return (
    <div className="relative min-h-screen overflow-x-hidden px-3 py-4 pb-28 sm:px-6 sm:py-5 lg:px-8 lg:pb-5">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[360px] w-[min(720px,100vw)] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px] sm:h-[520px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[320px] w-[min(420px,80vw)] rounded-full bg-flare/10 blur-[110px] sm:h-[420px]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5">
        <nav className="flex items-center justify-between py-2">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-volt transition-colors text-sm">&larr; 返回首页</Link>
        </nav>

        <motion.section initial={{ opacity: 0, y: 18, filter: "blur(16px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.74, ease: [0.16, 1, 0.3, 1] }} className="hero-card overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />
          <div className="absolute right-0 top-0 h-24 w-72 bg-volt/10 blur-[90px]" />
          <div className="relative">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">&#9917; 世界杯 2026 结果预测</h1>
            <p className="text-sm text-white/40 mb-4">填写每场比赛比分，自动计算晋级路径，预测你的冠军</p>
            <ProgressBar />
          </div>
        </motion.section>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="比赛阶段">
            {([
              { id: "groups" as TabId, label: "小组赛", count: 72 },
              { id: "knockout" as TabId, label: "淘汰赛", count: 32 },
            ]).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" role="tab" aria-selected={isActive} onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-left text-xs font-bold transition duration-300 sm:px-3.5 sm:py-2 sm:text-sm
                    ${isActive ? "bg-volt text-black shadow-[0_0_24px_rgba(216,255,62,.2)]" : "bg-white/[0.055] text-white/62 ring-1 ring-white/[0.08] hover:bg-white/[0.09] hover:text-white"}`}>
                  <span>{tab.label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums sm:px-2 sm:text-[11px]
                    ${isActive ? "bg-black/15 text-black" : "bg-black/25 text-volt/80 group-hover:bg-volt/[0.12]"}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={autoFillRandom} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/30 hover:text-flare px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] transition-all"><Shuffle size={12} />随机填充</button>
            <button onClick={resetAll} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/30 hover:text-red-400 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] transition-all"><X size={12} />清空</button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "groups" ? (
            <motion.div key="groups" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }} className="flex flex-col gap-4">
              <GroupStageView />
              <ThirdPlacePanel />
              {groupFilled >= groupTotal && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                  <button onClick={() => setActiveTab("knockout")} className="rounded-full bg-volt text-black px-5 py-2 text-sm font-bold hover:shadow-[0_0_24px_rgba(216,255,62,.3)] transition-all">
                    进入淘汰赛 →
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="knockout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col gap-4">
              <KnockoutStageView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
