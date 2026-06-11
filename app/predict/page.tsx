"use client";

import { type FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GROUPS, getTeamByCode, type GroupTeam, type GroupMatch } from "@/data/world-cup-2026-groups";
import { DashboardShell } from "@/components/dashboard-shell";
import { MeAuthDialog } from "@/components/me-auth-dialog";
import { useUserSession } from "@/components/user-session-provider";
import { usePredictionStore } from "@/lib/store/prediction-store";
import { buildKnockoutMatchesForTopology, type StandingRow, type KnockoutMatch } from "@/lib/store/prediction";
import { setPredictionArchives, usePredictionArchives, type PredictionArchive } from "@/lib/use-prediction-archives";
import { useUserPreferenceCatalog } from "@/lib/use-user-preferences";
import { userApi } from "@/lib/user-system";
import { fallbackUserPreferenceCatalog } from "@/lib/user-preferences";
import { ChevronLeft, Clock3, FolderOpen, GitBranch, LogIn, Maximize2, Minus, Plus, RotateCcw, Save, ShieldCheck, Shuffle, Trash2, Trophy, UserPlus, X } from "lucide-react";

/* ── Helpers ── */

function team(code: string | null | undefined): GroupTeam | undefined {
  return code ? getTeamByCode(code) : undefined;
}

type PredictionNodeCoords = Record<string, { x: number; y: number; w: number; h: number }>;

function arePredictionCoordsEqual(a: PredictionNodeCoords, b: PredictionNodeCoords) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => {
    const current = a[key];
    const next = b[key];
    return (
      Boolean(next) &&
      Math.abs(current.x - next.x) < 0.5 &&
      Math.abs(current.y - next.y) < 0.5 &&
      Math.abs(current.w - next.w) < 0.5 &&
      Math.abs(current.h - next.h) < 0.5
    );
  });
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

/* ── Prediction Topology Flow ── */

function PredictionTopologyView({ fullscreen = false }: { fullscreen?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.72);
  const [coords, setCoords] = useState<PredictionNodeCoords>({});
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const groupScores = usePredictionStore((s) => s.groupScores);
  const knockoutPicks = usePredictionStore((s) => s.knockoutPicks);
  const getGroupStandings = usePredictionStore((s) => s.getGroupStandings);
  const championCode = usePredictionStore((s) => s.getChampion());
  const knockoutMatches = useMemo(() => {
    const state = usePredictionStore.getState();
    const bestThirdIds = state.getBestThirds().map((third) => third.groupId);
    return buildKnockoutMatchesForTopology(groupScores, knockoutPicks, bestThirdIds);
  }, [groupScores, knockoutPicks]);

  const groupFilled = useMemo(
    () => GROUPS.reduce((sum, group) => sum + group.matches.filter((match) => groupScores[match.id]).length, 0),
    [groupScores]
  );
  const knockoutFilled = Object.keys(knockoutPicks).length;

  const leftGroups = GROUPS.filter((group) => ["A", "B", "C", "D", "E", "F"].includes(group.id));
  const rightGroups = GROUPS.filter((group) => ["G", "H", "I", "J", "K", "L"].includes(group.id));
  const byId = new Map(knockoutMatches.map((match) => [match.id, match]));
  const canvasWidth = 2940;
  const canvasHeight = 1060;

  const columns = [
    { id: "left-groups", label: "小组路径", type: "groups" as const, groups: leftGroups },
    { id: "r32-left", label: "32 强", matches: pickMatches(byId, ["R32-1", "R32-2", "R32-3", "R32-4", "R32-5", "R32-6", "R32-7", "R32-8"]) },
    { id: "r16-left", label: "16 强", matches: pickMatches(byId, ["R16-1", "R16-2", "R16-3", "R16-4"]) },
    { id: "qf-left", label: "8 强", matches: pickMatches(byId, ["QF-1", "QF-2"]) },
    { id: "sf-left", label: "半决赛", matches: pickMatches(byId, ["SF-1"]) },
    { id: "final", label: "终局", matches: pickMatches(byId, ["FINAL", "THIRD"]), featured: true },
    { id: "sf-right", label: "半决赛", matches: pickMatches(byId, ["SF-2"]) },
    { id: "qf-right", label: "8 强", matches: pickMatches(byId, ["QF-3", "QF-4"]) },
    { id: "r16-right", label: "16 强", matches: pickMatches(byId, ["R16-5", "R16-6", "R16-7", "R16-8"]) },
    { id: "r32-right", label: "32 强", matches: pickMatches(byId, ["R32-9", "R32-10", "R32-11", "R32-12", "R32-13", "R32-14", "R32-15", "R32-16"]) },
    { id: "right-groups", label: "小组路径", type: "groups" as const, groups: rightGroups },
  ];
  const nodeIds = useMemo(
    () => [
      ...GROUPS.map((group) => `G_${group.id}`),
      ...knockoutMatches.map((match) => match.id),
    ],
    [knockoutMatches]
  );
  const connections = useMemo(() => buildPredictionConnections(knockoutMatches), [knockoutMatches]);

  const updateCoords = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const nextCoords: typeof coords = {};

    nodeIds.forEach((id) => {
      const element = document.getElementById(`prediction-node-${id}`);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      nextCoords[id] = {
        x: (rect.left - containerRect.left) / scale,
        y: (rect.top - containerRect.top) / scale,
        w: rect.width / scale,
        h: rect.height / scale,
      };
    });

    setCoords((current) => (arePredictionCoordsEqual(current, nextCoords) ? current : nextCoords));
  }, [nodeIds, scale]);

  const centerFinal = useCallback((behavior: ScrollBehavior = "auto") => {
    const scroller = scrollContainerRef.current;
    const finalNode = document.getElementById("prediction-node-FINAL");
    if (!scroller || !finalNode) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const finalRect = finalNode.getBoundingClientRect();
    const finalCenter = finalRect.left + finalRect.width / 2;
    const viewportCenter = scrollerRect.left + scrollerRect.width / 2;

    scroller.scrollTo({
      left: Math.max(0, scroller.scrollLeft + finalCenter - viewportCenter),
      behavior,
    });
  }, []);

  useLayoutEffect(() => {
    updateCoords();
    const timer = window.setTimeout(() => {
      centerFinal("auto");
      updateCoords();
    }, 260);
    window.addEventListener("resize", updateCoords);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateCoords);
    };
  }, [centerFinal, updateCoords]);

  const handleZoomIn = () => setScale((value) => Math.min(1.5, Math.round((value + 0.08) * 100) / 100));
  const handleZoomOut = () => setScale((value) => Math.max(0.35, Math.round((value - 0.08) * 100) / 100));
  const handleZoomReset = () => {
    setScale(0.72);
    window.setTimeout(() => {
      centerFinal("smooth");
      updateCoords();
    }, 120);
  };

  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    event.stopPropagation();

    const scroller = scrollContainerRef.current;
    const rect = scroller?.getBoundingClientRect();
    const pointerX = rect ? event.clientX - rect.left : 0;
    const delta = -event.deltaY * 0.0014;

    setScale((current) => {
      const next = Math.min(Math.max(current + delta, 0.35), 1.5);
      const rounded = Math.round(next * 100) / 100;

      if (scroller && rect) {
        const contentX = (scroller.scrollLeft + pointerX) / current;
        window.requestAnimationFrame(() => {
          scroller.scrollLeft = contentX * rounded - pointerX;
          window.requestAnimationFrame(updateCoords);
        });
      }

      return rounded;
    });
  }, [updateCoords]);

  const handleMouseDown = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("button, a, .zoom-controls-panel")) return;
    if (!scrollContainerRef.current) return;
    isDragging.current = true;
    startX.current = event.clientX;
    scrollLeft.current = scrollContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging.current || !scrollContainerRef.current) return;
    event.preventDefault();
    const delta = event.clientX - startX.current;
    scrollContainerRef.current.scrollLeft = scrollLeft.current - delta * 1.5;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const getCurvePath = (fromId: string, toId: string) => {
    const from = coords[fromId];
    const to = coords[toId];
    if (!from || !to) return "";

    const fromCenter = from.x + from.w / 2;
    const toCenter = to.x + to.w / 2;
    const leftToRight = toCenter >= fromCenter;
    const sx = leftToRight ? from.x + from.w : from.x;
    const sy = from.y + from.h / 2;
    const ex = leftToRight ? to.x : to.x + to.w;
    const ey = to.y + to.h / 2;
    const offset = Math.max(44, Math.abs(ex - sx) * 0.42);
    const c1x = leftToRight ? sx + offset : sx - offset;
    const c2x = leftToRight ? ex - offset : ex + offset;

    return `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ey}, ${ex} ${ey}`;
  };

  return (
    <section
      ref={rootRef}
      className={`prediction-topology-card hero-card relative flex flex-col overflow-hidden p-5 sm:p-6 ${
        fullscreen
          ? "h-[100dvh] w-screen rounded-none border-0 sm:h-[calc(100dvh-32px)] sm:w-[calc(100vw-32px)] sm:rounded-[2rem]"
          : "h-[720px] sm:h-[760px]"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/30 to-transparent" />
      <div className="absolute left-1/2 top-0 h-28 w-80 -translate-x-1/2 bg-volt/10 blur-[100px]" />

      <div className="prediction-topology-header relative z-10 mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2.5 text-lg font-semibold text-white">
            <GitBranch className="h-4 w-4 text-volt" />
            预测拓扑流程
            <span className="prediction-topology-kicker rounded-full border border-volt/20 bg-volt/[0.08] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-volt/90">
              SIM FLOW
            </span>
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/35">
            小组比分生成晋级路径，淘汰赛选择会沿流程图逐轮点亮。
          </p>
        </div>
        <div className="prediction-topology-statbar flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/36">
          <span className="rounded-full bg-white/[0.045] px-3 py-1.5 ring-1 ring-white/[0.08]">小组 {groupFilled}/72</span>
          <span className="rounded-full bg-white/[0.045] px-3 py-1.5 ring-1 ring-white/[0.08]">淘汰赛 {knockoutFilled}/32</span>
          {championCode && (
            <span className="rounded-full bg-volt/10 px-3 py-1.5 text-volt ring-1 ring-volt/20">
              冠军 {team(championCode)?.nameCn ?? championCode}
            </span>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        className="prediction-topology-scroll scrollbar-hidden relative z-10 min-h-0 flex-1 cursor-grab select-none overflow-x-auto overflow-y-hidden active:cursor-grabbing"
      >
        <div className="relative" style={{ width: `${canvasWidth * scale}px`, height: `${canvasHeight * scale}px` }}>
          <div
            ref={containerRef}
            className="absolute origin-top-left"
            style={{ width: canvasWidth, height: canvasHeight, transform: `scale(${scale})`, top: 0, left: 0 }}
          >
            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full">
              <defs>
                <filter id="prediction-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {connections.map((connection) => {
                const path = getCurvePath(connection.from, connection.to);
                if (!path) return null;

                return (
                  <g key={`${connection.from}-${connection.to}`}>
                    <path d={path} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={2} />
                    <path d={path} fill="none" stroke="rgba(216,255,62,0.055)" strokeWidth={6} />
                    {connection.active && (
                      <>
                        <path d={path} fill="none" stroke="#d8ff3e" strokeWidth={5} strokeOpacity={0.3} filter="url(#prediction-neon-glow)" />
                        <path
                          d={path}
                          fill="none"
                          stroke="#d8ff3e"
                          strokeWidth={1.8}
                          strokeDasharray="8 6"
                          strokeOpacity={0.82}
                          style={{ animation: "predictionBracketFlow 14s linear infinite" }}
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            <div className="absolute inset-0 z-10 flex items-center justify-center gap-16 px-14">
              {columns.map((column, index) => (
                <div key={column.id} className={`relative flex h-full w-[196px] shrink-0 flex-col justify-center ${column.featured ? "w-[220px]" : ""}`}>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <span className="prediction-node-eyebrow text-[10px] font-bold uppercase tracking-[0.14em] text-volt/75">{column.label}</span>
                    <span className="prediction-round-index rounded-full bg-white/[0.045] px-2 py-0.5 text-[8px] font-semibold text-white/25 ring-1 ring-white/[0.06]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className={`relative grid gap-3 ${column.featured ? "gap-4" : ""}`}>
                    {column.type === "groups"
                      ? column.groups.map((group) => (
                          <PredictionGroupNode
                            key={group.id}
                            group={group}
                            standings={getGroupStandings(group.id)}
                            groupScores={groupScores}
                          />
                        ))
                      : column.matches.map((match) => (
                          <PredictionKnockoutNode
                            key={match.id}
                            match={match}
                            pick={knockoutPicks[match.id]}
                            featured={column.featured}
                          />
                        ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="zoom-controls-panel absolute bottom-4 right-4 z-30 flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/70 p-1.5 shadow-xl backdrop-blur-xl">
        <button type="button" onClick={handleZoomOut} disabled={scale <= 0.35} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25" title="缩小">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-10 select-none text-center text-[11px] font-semibold tabular-nums text-white/60">{Math.round(scale * 100)}%</span>
        <button type="button" onClick={handleZoomIn} disabled={scale >= 1.5} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25" title="放大">
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={handleZoomReset} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white" title="重置">
          <RotateCcw className="h-3 w-3" />
        </button>
        <button type="button" onClick={() => centerFinal("smooth")} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white" title="居中">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <style jsx global>{`
        @keyframes predictionBracketFlow {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </section>
  );
}

function PredictionGroupNode({
  group,
  standings,
  groupScores,
}: {
  group: (typeof GROUPS)[number];
  standings: StandingRow[];
  groupScores: ReturnType<typeof usePredictionStore.getState>["groupScores"];
}) {
  const filled = group.matches.filter((match) => groupScores[match.id]).length;

  return (
    <div id={`prediction-node-G_${group.id}`} className={`relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl transition ${
      filled > 0
        ? "border-volt/30 bg-volt/[0.035] shadow-[0_0_22px_rgba(216,255,62,.08)]"
        : "border-white/[0.08] bg-black/50"
    }`}>
      <div className="mb-2 flex items-center justify-between border-b border-white/[0.06] pb-2">
        <span className="prediction-node-eyebrow text-[10px] font-bold uppercase tracking-[0.14em] text-volt/80">{group.id} 组</span>
        <span className="prediction-node-meta rounded-full bg-white/[0.04] px-2 py-0.5 text-[8px] font-medium text-white/30">{filled}/6</span>
      </div>
      <div className="space-y-1">
        {standings.slice(0, 2).map((row, index) => {
          const t = team(row.teamCode);
          return (
            <div key={row.teamCode} className="grid grid-cols-[16px_minmax(0,1fr)_24px] items-center gap-1.5 rounded-lg px-1.5 py-1 text-[10px]">
              <span className={index < 2 ? "font-bold text-volt" : "font-semibold text-white/36"}>{index + 1}</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <Flag code={row.teamCode} size={12} />
                <span className="truncate font-semibold text-white/72">{t?.nameCn ?? row.teamCode}</span>
              </span>
              <span className="text-right font-bold tabular-nums text-white/54">{row.points}</span>
            </div>
          );
        })}
      </div>
      <div className="prediction-node-footer mt-2 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/28">
        <span>比分 {filled}/6</span>
        <span className={filled === 6 ? "text-volt/80" : "text-white/24"}>{filled === 6 ? "已完成" : "进行中"}</span>
      </div>
    </div>
  );
}

function PredictionKnockoutNode({
  match,
  pick,
  featured = false,
}: {
  match: KnockoutMatch;
  pick?: { winnerCode: string; homeScore: number; awayScore: number };
  featured?: boolean;
}) {
  const home = team(match.home.teamCode);
  const away = team(match.away.teamCode);
  const ready = Boolean(match.home.teamCode && match.away.teamCode);

  return (
    <div id={`prediction-node-${match.id}`} className={`relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl transition ${
      pick
        ? "border-volt/35 bg-volt/[0.04] shadow-[0_0_24px_rgba(216,255,62,.09)]"
        : ready
        ? "border-white/[0.08] bg-black/50"
        : "border-white/[0.045] bg-black/30 opacity-55"
    } ${featured ? "p-4" : ""}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="prediction-node-eyebrow rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-volt/70">
          {match.id}
        </span>
        <span className="prediction-node-meta text-[9px] font-semibold uppercase tracking-wider text-white/32">{match.label}</span>
      </div>
      <PredictionTeamLine
        code={match.home.teamCode}
        fallback={match.home.sourceLabel}
        score={pick?.homeScore}
        active={pick?.winnerCode === match.home.teamCode}
      />
      <PredictionTeamLine
        code={match.away.teamCode}
        fallback={match.away.sourceLabel}
        score={pick?.awayScore}
        active={pick?.winnerCode === match.away.teamCode}
      />
      {pick ? (
        <div className="prediction-node-footer mt-2 border-t border-white/[0.04] pt-1.5 text-right text-[9px] font-semibold text-volt/80">
          晋级 {team(pick.winnerCode)?.nameCn ?? pick.winnerCode}
        </div>
      ) : (
        <div className="prediction-node-footer mt-2 border-t border-white/[0.04] pt-1.5 text-right text-[9px] font-medium text-white/24">
          {ready ? "待选择" : "待定"}
        </div>
      )}
    </div>
  );
}

function PredictionTeamLine({
  code,
  fallback,
  score,
  active,
}: {
  code: string | null;
  fallback: string;
  score?: number;
  active: boolean;
}) {
  const t = team(code);

  return (
    <div className={`mb-1 flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 transition ${
      active ? "bg-volt/[0.09] text-volt" : "text-white/72"
    }`}>
      <span className="flex min-w-0 items-center gap-1.5">
        {code ? <Flag code={code} size={14} /> : <span className="h-3.5 w-5 rounded bg-white/[0.05]" />}
        <span className="truncate text-[11px] font-semibold">{t?.nameCn ?? fallback}</span>
      </span>
      <span className={`shrink-0 text-sm font-black tabular-nums ${score == null ? "text-white/20" : active ? "text-volt" : "text-white/70"}`}>
        {score ?? "-"}
      </span>
    </div>
  );
}

function pickMatches(map: Map<string, KnockoutMatch>, ids: string[]) {
  return ids.map((id) => map.get(id)).filter((match): match is KnockoutMatch => Boolean(match));
}

function buildPredictionConnections(matches: KnockoutMatch[]) {
  const byId = new Map(matches.map((match) => [match.id, match]));
  const groupPairs: Array<[string, string]> = [
    ["A", "R32-1"], ["B", "R32-1"], ["A", "R32-5"], ["B", "R32-5"],
    ["C", "R32-2"], ["D", "R32-2"], ["C", "R32-6"], ["D", "R32-6"],
    ["E", "R32-3"], ["F", "R32-3"], ["E", "R32-7"], ["F", "R32-7"],
    ["G", "R32-4"], ["H", "R32-4"], ["G", "R32-8"], ["H", "R32-8"],
    ["I", "R32-9"], ["J", "R32-9"], ["K", "R32-10"], ["L", "R32-10"],
    ["I", "R32-13"], ["J", "R32-13"], ["K", "R32-14"], ["L", "R32-14"],
  ];
  const bracketPairs: Array<[string, string]> = [
    ["R32-1", "R16-1"], ["R32-2", "R16-1"],
    ["R32-3", "R16-2"], ["R32-4", "R16-2"],
    ["R32-5", "R16-3"], ["R32-6", "R16-3"],
    ["R32-7", "R16-4"], ["R32-8", "R16-4"],
    ["R32-9", "R16-5"], ["R32-10", "R16-5"],
    ["R32-11", "R16-6"], ["R32-12", "R16-6"],
    ["R32-13", "R16-7"], ["R32-14", "R16-7"],
    ["R32-15", "R16-8"], ["R32-16", "R16-8"],
    ["R16-1", "QF-1"], ["R16-2", "QF-1"],
    ["R16-3", "QF-2"], ["R16-4", "QF-2"],
    ["R16-5", "QF-3"], ["R16-6", "QF-3"],
    ["R16-7", "QF-4"], ["R16-8", "QF-4"],
    ["QF-1", "SF-1"], ["QF-2", "SF-1"],
    ["QF-3", "SF-2"], ["QF-4", "SF-2"],
    ["SF-1", "FINAL"], ["SF-2", "FINAL"],
    ["SF-1", "THIRD"], ["SF-2", "THIRD"],
  ];

  return [
    ...groupPairs.map(([groupId, to]) => ({
      from: `G_${groupId}`,
      to,
      active: Boolean(byId.get(to)?.home.teamCode || byId.get(to)?.away.teamCode),
    })),
    ...bracketPairs.map(([from, to]) => ({
      from,
      to,
      active: isPredictedPathActive(byId.get(from), byId.get(to)),
    })),
  ];
}

function isPredictedPathActive(from?: KnockoutMatch, to?: KnockoutMatch) {
  if (!from || !to) return false;
  const pick = usePredictionStore.getState().knockoutPicks[from.id];
  if (!pick?.winnerCode) return false;

  return to.home.teamCode === pick.winnerCode || to.away.teamCode === pick.winnerCode;
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
            <div className="px-3 pb-3 grid grid-cols-2 gap-2 lg:grid-cols-8">
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
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">预测进度</span>
        <span className="tabular text-sm text-volt">{progress.percent}%</span>
      </div>
      <PredictionProgressTrack percent={progress.percent} gradientId="prediction-football-glass" />
      <div className="mt-1 text-right text-[10px] tabular text-white/40">{progress.filled}/{progress.total}</div>
    </div>
  );
}

function PredictionProgressTrack({ percent, gradientId }: { percent: number; gradientId: string }) {
  const progressMarker = Math.min(100, Math.max(0, percent || 0));

  return (
    <div className="relative h-[18px]">
      <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_8px_rgba(0,0,0,.42)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressMarker}%` }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-volt to-flare shadow-[0_0_22px_rgba(216,255,62,.45)]"
        />
      </div>
      <motion.div
        initial={{ left: "0%" }}
        animate={{ left: `${progressMarker}%` }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute top-1/2 grid h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 place-items-center"
        aria-hidden="true"
      >
        <motion.span
          initial={{ opacity: 0, scale: 0.72, rotate: -18 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="grid h-[18px] w-[18px] place-items-center"
        >
          <svg viewBox="0 0 32 32" className="h-[18px] w-[18px] drop-shadow-[0_0_10px_rgba(216,255,62,.42)]">
            <circle cx="16" cy="16" r="14" fill={`url(#${gradientId})`} />
            <path d="m16 7.4 5.1 3.7-1.95 5.95h-6.3L10.9 11.1 16 7.4Z" fill="#111" />
            <path d="m6.2 14.3 4.7-3.2 1.95 5.95-3.9 4.7-3.25-2.25c-.22-1.7-.05-3.48.5-5.2Zm19.6 0c.55 1.72.72 3.5.5 5.2l-3.25 2.25-3.9-4.7 1.95-5.95 4.7 3.2ZM11.35 26.85l-2.4-5.1 3.9-4.7h6.3l3.9 4.7-2.4 5.1a13.9 13.9 0 0 1-9.3 0Z" fill="#111" />
            <path d="M9.2 21.95 5.9 19.7m16.9 2.25 3.3-2.25M12.85 17.05l-1.95-5.95m8.25 5.95 1.95-5.95m-1.95 5.95 3.9 4.7m-10.2-4.7-3.9 4.7" fill="none" stroke="rgba(255,255,255,.7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
            <defs>
              <radialGradient id={gradientId} cx="0" cy="0" r="1" gradientTransform="matrix(18 22 -22 18 10 7)">
                <stop stopColor="#fff" />
                <stop offset=".5" stopColor="#d8ff3e" stopOpacity=".92" />
                <stop offset="1" stopColor="#ff9a1f" stopOpacity=".84" />
              </radialGradient>
            </defs>
          </svg>
        </motion.span>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

type TabId = "groups" | "knockout";
type AuthStatus = "checking" | "unauthenticated" | "allowed";
type AccessMode = "login" | "register";
const LAST_PREDICTION_ARCHIVE_KEY = "worldcup-last-prediction-archive-id";

function PredictAuthLoading() {
  return <div className="min-h-screen" aria-hidden="true" />;

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[360px] w-[min(720px,100vw)] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px]" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
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
  const [authMode, setAuthMode] = useState<AccessMode | null>("login");

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[360px] w-[min(720px,100vw)] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px]" />
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="hero-card w-full max-w-lg overflow-hidden px-5 py-6 text-center sm:px-7 sm:py-7"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/30 to-transparent" />
        <div className="mb-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-volt/80">
          <ShieldCheck className="h-4 w-4" />
          预测页面仅对登录用户开放
        </div>
        <h1 className="text-2xl font-bold text-white">先登录，再开始预测</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/42">登录后即可保存你的比分、晋级路径和冠军预测。</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setAuthMode("login")}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-volt px-5 text-sm font-bold text-black shadow-[0_0_26px_rgba(216,255,62,.18)] transition hover:scale-[1.02]"
          >
            <LogIn className="h-4 w-4" />
            登录
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("register")}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white/[0.05] px-5 text-sm font-bold text-white/68 ring-1 ring-white/[0.08] transition hover:bg-white/[0.08] hover:text-white"
          >
            <UserPlus className="h-4 w-4" />
            注册
          </button>
        </div>
      </motion.section>
      <MeAuthDialog mode={authMode} onClose={() => setAuthMode(null)} onAuthenticated={onAuthenticated} />
    </div>
  );

  const [mode, setMode] = useState<AccessMode>("login");
  const [email, setEmail] = useState("demo@worldcup.local");
  const [password, setPassword] = useState("worldcup2026");
  const [displayName, setDisplayName] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [registerStep, setRegisterStep] = useState<"account" | "preferences">("account");
  const catalog = useUserPreferenceCatalog(true);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(compactIds(fallbackUserPreferenceCatalog.teams[0]?.id));
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(compactIds(fallbackUserPreferenceCatalog.players[0]?.id));

  useEffect(() => {
    setSelectedTeamIds((current) => (current.some((id) => catalog.teams.some((team) => team.id === id)) ? current : compactIds(catalog.teams[0]?.id)));
    setSelectedPlayerIds((current) => (current.some((id) => catalog.players.some((player) => player.id === id)) ? current : compactIds(catalog.players[0]?.id)));
  }, [catalog]);

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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="hero-card w-full max-w-lg overflow-hidden px-5 py-6 sm:px-7 sm:py-7"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/30 to-transparent" />
        <div className="relative">
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

function SoccerArchiveIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/predict/archive-ball.png" alt="" className="h-9 w-9 object-contain" loading="lazy" />
  );
}

function PredictionArchivePanel() {
  const groupScores = usePredictionStore((s) => s.groupScores);
  const knockoutPicks = usePredictionStore((s) => s.knockoutPicks);
  const progress = usePredictionStore((s) => s.getProgress());
  const { archives, refresh } = usePredictionArchives(true);
  const [activeArchiveId, setActiveArchiveId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const activeArchive = archives.find((archive) => archive.id === activeArchiveId) ?? null;
  const selectedArchive = archives.find((archive) => archive.id === selectedArchiveId) ?? null;

  useEffect(() => {
    void refresh().catch(() => {
      setMessage("存档读取失败，请确认后端服务在线");
    });
  }, [refresh]);

  async function saveArchive() {
    setBusy("save");
    setMessage("");

    try {
      const payload = await userApi<{ archive: PredictionArchive | null; archives: PredictionArchive[] }>("/api/me/prediction-archives", {
        method: "POST",
        body: JSON.stringify({
          id: activeArchiveId ?? undefined,
          name: name.trim() || activeArchive?.name || `预测存档 ${new Date().toLocaleDateString("zh-CN")}`,
          groupScores,
          knockoutPicks,
        }),
      });
      setPredictionArchives(payload.archives ?? (payload.archive ? [payload.archive] : []));
      if (payload.archive?.id) {
        setActiveArchiveId(payload.archive.id);
        window.localStorage.setItem(LAST_PREDICTION_ARCHIVE_KEY, payload.archive.id);
        window.dispatchEvent(new CustomEvent("prediction-archives-updated", { detail: { archiveId: payload.archive.id } }));
      }
      setName(payload.archive?.name ?? name);
      setMessage(activeArchiveId ? "已更新当前存档" : "已保存当前预测");
      setShowSaveDialog(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy("");
    }
  }

  function loadArchive(archive: PredictionArchive) {
    usePredictionStore.setState({
      groupScores: archive.groupScores ?? {},
      knockoutPicks: archive.knockoutPicks ?? {},
    });
    setActiveArchiveId(archive.id);
    setName(archive.name);
    setSelectedArchiveId(null);
    setMessage(`已载入：${archive.name}`);
  }

  async function deleteArchive(id: string) {
    setBusy(id);
    setMessage("");

    try {
      const payload = await userApi<{ archives: PredictionArchive[] }>(`/api/me/prediction-archives/${id}`, {
        method: "DELETE",
      });
      setPredictionArchives(payload.archives ?? []);
      if (activeArchiveId === id) {
        setActiveArchiveId(null);
        setName("");
      }
      if (selectedArchiveId === id) setSelectedArchiveId(null);
      setMessage("存档已删除");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="relative min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-volt" />
            <h2 className="text-sm font-bold text-white">预测存档</h2>
            <span className="rounded-full bg-white/[0.055] px-2 py-0.5 text-[10px] font-semibold text-white/35 ring-1 ring-white/[0.08]">
              {archives.length}/4
            </span>
          </div>
          <p className="mt-1 max-w-[360px] truncate text-xs text-white/36">
            {activeArchive ? `正在编辑：${activeArchive.name}` : "保存当前比分、晋级路径和冠军选择，之后可以一键恢复。"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSaveDialog(true)}
          disabled={progress.filled === 0}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-volt px-3.5 text-xs font-bold text-black shadow-[0_0_22px_rgba(216,255,62,.16)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Save className="h-3.5 w-3.5" />
          {activeArchiveId ? "更新" : "保存"}
        </button>
      </div>

      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={{ x: "-50%", y: "-50%" }}
            className="fixed left-1/2 top-1/2 z-[150] w-[min(360px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-black/70 p-3 shadow-[0_28px_70px_rgba(0,0,0,.55)] ring-1 ring-white/10 backdrop-blur-2xl"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">{activeArchiveId ? "更新当前存档" : "保存预测存档"}</h3>
                <p className="mt-0.5 text-[10px] text-white/36">给这次模拟命名，之后可以快速载入。</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                aria-label="关闭保存浮窗"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.04] text-white/38 ring-1 ring-white/[0.08] transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <form
              className="flex w-full flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                saveArchive();
              }}
            >
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="给这次模拟起个名字"
                maxLength={40}
                className="h-10 w-full min-w-0 flex-1 rounded-full bg-black/35 px-4 text-sm text-white outline-none ring-1 ring-white/10 transition placeholder:text-white/24 focus:ring-volt/40"
              />
              <button
                type="submit"
                disabled={busy === "save" || progress.filled === 0}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-volt px-4 text-sm font-bold text-black shadow-[0_0_22px_rgba(216,255,62,.16)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
              >
                {busy === "save" ? <Clock3 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                确认
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {archives.length > 0 && (
        <div className="mt-3 grid grid-cols-4 divide-x divide-white/[0.08]">
          {archives.map((archive) => {
            const isActive = archive.id === activeArchiveId;
            const isSelected = archive.id === selectedArchiveId;

            return (
              <button
                key={archive.id}
                type="button"
                onClick={() => setSelectedArchiveId(archive.id)}
                className={`flex min-w-0 flex-col items-center justify-center gap-2 px-2 py-3 text-center transition hover:bg-white/[0.035] ${
                  isSelected ? "bg-white/[0.045]" : isActive ? "bg-volt/[0.045]" : ""
                }`}
                aria-label={`打开存档 ${archive.name}`}
              >
                <SoccerArchiveIcon />
                <span className="w-full truncate text-xs font-bold text-white">{archive.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedArchive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            style={{ x: "-50%", y: "-50%" }}
            className="fixed left-1/2 top-1/2 z-[150] w-[min(340px,calc(100vw-2rem))] rounded-3xl bg-black/76 p-4 text-center shadow-[0_28px_80px_rgba(0,0,0,.62)] ring-1 ring-white/10 backdrop-blur-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="存档操作"
          >
            <button
              type="button"
              onClick={() => setSelectedArchiveId(null)}
              aria-label="关闭存档操作"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/[0.04] text-white/40 ring-1 ring-white/[0.08] transition hover:bg-white/[0.08] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="mx-auto mb-2 grid place-items-center">
              <SoccerArchiveIcon />
            </div>
            <h3 className="truncate text-base font-black text-white">{selectedArchive.name}</h3>
            <p className="mt-1 text-xs text-white/36">{formatArchiveTime(selectedArchive.updatedAt)}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => loadArchive(selectedArchive)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-volt text-sm font-black text-black transition hover:scale-[1.01]"
              >
                <FolderOpen className="h-4 w-4" />
                载入
              </button>
              <button
                type="button"
                onClick={() => deleteArchive(selectedArchive.id)}
                disabled={busy === selectedArchive.id}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-red-500/12 text-sm font-black text-red-200 ring-1 ring-red-300/15 transition hover:bg-red-500/18 disabled:opacity-45"
              >
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {message && <p className="mt-3 text-xs text-white/42">{message}</p>}
    </section>
  );
}

function formatArchiveTime(value: number) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getArchiveProgress(archive: PredictionArchive) {
  const groupTotal = GROUPS.reduce((sum, group) => sum + group.matches.length, 0);
  const knockoutTotal = 32;
  const total = groupTotal + knockoutTotal;
  const groupFilled = Object.values(archive.groupScores ?? {}).filter(Boolean).length;
  const knockoutFilled = Object.keys(archive.knockoutPicks ?? {}).length;
  const filled = groupFilled + knockoutFilled;
  const percent = Math.min(100, Math.round((filled / total) * 100));

  return {
    filled,
    total,
    percent,
    isComplete: filled >= total && Boolean(archive.knockoutPicks?.FINAL?.winnerCode),
  };
}

function ChampionPosterModal({ championCode, onClose }: { championCode: string; onClose: () => void }) {
  const champion = team(championCode);

  if (!champion) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[420] isolate grid place-items-center overflow-hidden bg-black/86 px-4 py-6 backdrop-blur-2xl sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="冠军海报"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(216,255,62,0.18),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,178,72,0.15),transparent_34%)]" />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-30 grid h-10 w-10 place-items-center rounded-full bg-black/58 text-white/70 ring-1 ring-white/[0.14] backdrop-blur-xl transition hover:bg-white/10 hover:text-white sm:right-6"
        aria-label="关闭冠军海报"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="relative z-10 aspect-[736/1308] h-[min(86dvh,760px)] max-h-[calc(100dvh-3rem)] w-auto max-w-[min(92vw,428px)] overflow-hidden rounded-[2rem] bg-black shadow-[0_34px_120px_rgba(0,0,0,.72),0_0_80px_rgba(216,181,93,.18)] ring-1 ring-white/[0.12]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/predict/champion-route-bg.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08)_0%,rgba(0,0,0,.05)_45%,rgba(0,0,0,.58)_100%)]" />
        <div className="absolute inset-x-0 top-[16%] px-8 text-center">
          <div className="mb-2 text-[2.25rem] font-black uppercase tracking-[0.18em] text-[#f3c26c] drop-shadow-[0_2px_18px_rgba(0,0,0,.72)]" style={{ fontFamily: "ScreenMatrix, monospace" }}>
            CHAMPION
          </div>
          <div className="mx-auto grid h-16 w-24 place-items-center overflow-hidden rounded-[1.15rem] bg-black/46 shadow-[0_0_36px_rgba(255,207,116,.34)] ring-1 ring-[#f3c26c]/50 backdrop-blur-md sm:h-16 sm:w-[6.4rem] sm:rounded-[1.08rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://flagcdn.com/w160/${champion.flagCode}.png`} alt={champion.name} className="h-full w-full object-cover" />
          </div>
          <h2 className="mt-2.5 text-[1.68rem] font-black tracking-normal text-[#f3c26c] drop-shadow-[0_2px_18px_rgba(0,0,0,.72)] sm:text-[1.408rem]">
            {champion.nameCn}
          </h2>
          <p className="mt-0.5 text-2xl font-black uppercase tracking-[0.18em] text-[#f3c26c] drop-shadow-[0_2px_18px_rgba(0,0,0,.72)] sm:text-[1.2rem]" style={{ fontFamily: "ScreenMatrix, monospace" }}>
            {champion.name}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

export default function PredictPage() {
  const { signedIn, loading: sessionLoading, refreshSession } = useUserSession();
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => (signedIn ? "allowed" : "checking"));
  const [activeTab, setActiveTab] = useState<TabId>("groups");
  const [topologyOpen, setTopologyOpen] = useState(false);
  const [championPathOpen, setChampionPathOpen] = useState(false);
  const { autoFillRandom, resetAll } = usePredictionStore();
  const groupScores = usePredictionStore((s) => s.groupScores);
  const knockoutPicks = usePredictionStore((s) => s.knockoutPicks);
  const championCode = usePredictionStore((s) => s.getChampion());
  const groupTotal = GROUPS.reduce((s, g) => s + g.matches.length, 0);
  const groupFilled = Object.values(groupScores).filter(Boolean).length;
  const knockoutFilled = Object.keys(knockoutPicks).length;

  useEffect(() => {
    if (signedIn === true) {
      setAuthStatus("allowed");
      return;
    }
    if (signedIn === false && !sessionLoading) {
      setAuthStatus("unauthenticated");
    }
  }, [sessionLoading, signedIn]);

  useEffect(() => {
    if (!topologyOpen && !championPathOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [championPathOpen, topologyOpen]);

  if (authStatus === "checking") {
    return (
      <DashboardShell>
        <PredictAuthLoading />
      </DashboardShell>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <DashboardShell>
        <PredictAccessGate
          onAuthenticated={() => {
            setAuthStatus("allowed");
            refreshSession();
          }}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="predict-page mx-auto flex w-full max-w-7xl flex-col gap-5">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.74, ease: [0.16, 1, 0.3, 1] }} className="hero-card overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
          <div
            className="prediction-hero-shade absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,6,0.94)_0%,rgba(3,5,6,0.82)_38%,rgba(3,5,6,0.38)_70%,rgba(3,5,6,0.06)_100%),linear-gradient(180deg,rgba(3,5,6,0.28)_0%,rgba(3,5,6,0.08)_48%,rgba(3,5,6,0.34)_100%)]"
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />
          <div className="absolute right-0 top-0 h-24 w-72 bg-volt/10 blur-[90px]" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
            <div className="max-w-xl">
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">&#9917; 2026世界杯预测</h1>
              <p className="text-sm text-white/40 mb-4">填写比分，预测你的冠军队</p>
              <ProgressBar />
            </div>
            <PredictionArchivePanel />
          </div>
        </motion.section>

        <div className="sticky top-[calc(env(safe-area-inset-top)+4.125rem)] z-[75] -mx-3 bg-black/58 px-3 py-2 backdrop-blur-2xl lg:hidden">
          <div className="flex flex-wrap gap-1.5">
            {([
              { id: "groups" as TabId, label: "小组赛" },
              { id: "knockout" as TabId, label: "淘汰赛" },
            ]).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative shrink-0 overflow-hidden rounded-full px-4 py-2 text-xs font-black transition-colors duration-300 ${
                    isActive ? "text-black" : "text-white/54 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="predict-mobile-tab-pill"
                      className="absolute inset-0 rounded-full bg-volt shadow-[0_0_22px_rgba(216,255,62,.18)]"
                      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
            {championCode && (
              <button
                type="button"
                onClick={() => setChampionPathOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#f3c26c]/18 px-4 py-2 text-xs font-black text-white shadow-[0_0_24px_rgba(243,194,108,.16)] ring-1 ring-[#f3c26c]/28 transition hover:bg-[#f3c26c]/24"
              >
                <Trophy size={13} />
                冠军之路
              </button>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={autoFillRandom}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-volt/[0.14] px-3 text-[11px] font-black text-volt shadow-[0_0_22px_rgba(216,255,62,.12)] ring-1 ring-volt/[0.22] transition hover:bg-volt/[0.2]"
            >
              <Shuffle size={13} />
              随机填充
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white/[0.045] px-3 text-[11px] font-black text-white/48 ring-1 ring-white/[0.08] transition hover:bg-red-500/[0.1] hover:text-red-300 hover:ring-red-400/20"
            >
              <X size={13} />
              清空
            </button>
          </div>
        </div>

        <div className="hidden flex-wrap items-center justify-between gap-2 lg:flex">
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
            {championCode && (
              <button
                type="button"
                onClick={() => setChampionPathOpen(true)}
                className="group relative flex shrink-0 items-center gap-1.5 rounded-full bg-[#f3c26c]/18 px-3.5 py-2 text-left text-sm font-bold text-white shadow-[0_0_24px_rgba(243,194,108,.14)] ring-1 ring-[#f3c26c]/28 transition duration-300 hover:bg-[#f3c26c]/24"
              >
                <Trophy size={14} />
                冠军之路
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTopologyOpen(true)}
              className="hidden items-center gap-1.5 rounded-lg bg-volt text-black px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-[0_0_22px_rgba(216,255,62,.16)] transition-all hover:scale-[1.01] md:flex"
            >
              <GitBranch size={12} />
              拓扑图
              <span className="rounded-full bg-black/15 px-1.5 py-0.5 tabular-nums">{groupFilled + knockoutFilled}</span>
            </button>
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

        <AnimatePresence>
          {topologyOpen && (
            <motion.div
              key="topology-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[420] flex items-stretch justify-center bg-black/82 backdrop-blur-2xl sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Prediction topology"
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-[100dvh] w-screen sm:h-[calc(100dvh-32px)] sm:w-[calc(100vw-32px)]"
              >
                <PredictionTopologyView fullscreen />
                <button
                  type="button"
                  onClick={() => setTopologyOpen(false)}
                  className="absolute right-3 top-3 z-50 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white/70 ring-1 ring-white/[0.12] backdrop-blur-xl transition hover:bg-white/10 hover:text-white sm:right-5 sm:top-5"
                  aria-label="关闭拓扑图"
                  title="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {championPathOpen && championCode && (
            <ChampionPosterModal championCode={championCode} onClose={() => setChampionPathOpen(false)} />
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
