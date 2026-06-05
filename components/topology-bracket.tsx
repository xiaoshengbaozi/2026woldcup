"use client";

import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Minus, Plus, RotateCcw, Maximize2, Minimize2, Expand, Shrink } from "lucide-react";
import { parseTeams } from "@/lib/teams";
import { formatTime } from "@/lib/format";
import { formatStageLabel } from "@/lib/stage";
import { areMatchTeamsConfirmed } from "@/lib/match-availability";
import { generateMatchSlug } from "@/lib/match-detail";
import { getStageGroupId } from "@/lib/stage";
import type { Match, Team } from "@/types/match";

interface TopologyBracketProps {
  matches: Match[];
  timezoneOffset?: number;
}

/* ──────────────────────── Constants ──────────────────────── */

const NEXT_MATCH_MAP: Record<string, string> = {
  M73: "M89", M75: "M89",
  M74: "M90", M77: "M90",
  M83: "M93", M84: "M93",
  M81: "M94", M82: "M94",
  M76: "M91", M78: "M91",
  M79: "M92", M80: "M92",
  M86: "M95", M88: "M95",
  M85: "M96", M87: "M96",
  M89: "M97", M90: "M97",
  M93: "M98", M94: "M98",
  M91: "M99", M92: "M99",
  M95: "M100", M96: "M100",
  M97: "M101", M98: "M101",
  M99: "M102", M100: "M102",
  M101: "M104", M102: "M104"
};

const CONNECTIONS: { from: string; to: string; side: "left" | "right" }[] = [
  { from: "G_A", to: "M73", side: "left" },
  { from: "G_A", to: "M79", side: "left" },
  { from: "G_B", to: "M73", side: "left" },
  { from: "G_B", to: "M85", side: "left" },
  { from: "G_C", to: "M74", side: "left" },
  { from: "G_C", to: "M76", side: "left" },
  { from: "G_D", to: "M82", side: "left" },
  { from: "G_D", to: "M86", side: "left" },
  { from: "G_E", to: "M75", side: "left" },
  { from: "G_E", to: "M77", side: "left" },
  { from: "G_F", to: "M74", side: "left" },
  { from: "G_F", to: "M76", side: "left" },
  { from: "G_G", to: "M81", side: "right" },
  { from: "G_G", to: "M86", side: "right" },
  { from: "G_H", to: "M83", side: "right" },
  { from: "G_H", to: "M87", side: "right" },
  { from: "G_I", to: "M77", side: "right" },
  { from: "G_I", to: "M78", side: "right" },
  { from: "G_J", to: "M83", side: "right" },
  { from: "G_J", to: "M87", side: "right" },
  { from: "G_K", to: "M84", side: "right" },
  { from: "G_K", to: "M88", side: "right" },
  { from: "G_L", to: "M84", side: "right" },
  { from: "G_L", to: "M80", side: "right" },
  { from: "M73", to: "M89", side: "left" },
  { from: "M75", to: "M89", side: "left" },
  { from: "M74", to: "M90", side: "left" },
  { from: "M77", to: "M90", side: "left" },
  { from: "M83", to: "M93", side: "left" },
  { from: "M84", to: "M93", side: "left" },
  { from: "M81", to: "M94", side: "left" },
  { from: "M82", to: "M94", side: "left" },
  { from: "M89", to: "M97", side: "left" },
  { from: "M90", to: "M97", side: "left" },
  { from: "M93", to: "M98", side: "left" },
  { from: "M94", to: "M98", side: "left" },
  { from: "M97", to: "M101", side: "left" },
  { from: "M98", to: "M101", side: "left" },
  { from: "M101", to: "M104", side: "left" },
  { from: "M76", to: "M91", side: "right" },
  { from: "M78", to: "M91", side: "right" },
  { from: "M79", to: "M92", side: "right" },
  { from: "M80", to: "M92", side: "right" },
  { from: "M86", to: "M95", side: "right" },
  { from: "M88", to: "M95", side: "right" },
  { from: "M85", to: "M96", side: "right" },
  { from: "M87", to: "M96", side: "right" },
  { from: "M91", to: "M99", side: "right" },
  { from: "M92", to: "M99", side: "right" },
  { from: "M95", to: "M100", side: "right" },
  { from: "M96", to: "M100", side: "right" },
  { from: "M99", to: "M102", side: "right" },
  { from: "M100", to: "M102", side: "right" },
  { from: "M102", to: "M104", side: "right" }
];

const LEFT_COLUMNS = [
  { stage: "1/16决赛", matchIds: ["M73", "M75", "M74", "M77", "M83", "M84", "M81", "M82"] },
  { stage: "1/8决赛", matchIds: ["M89", "M90", "M93", "M94"] },
  { stage: "1/4决赛", matchIds: ["M97", "M98"] },
  { stage: "半决赛", matchIds: ["M101"] }
];

const RIGHT_COLUMNS = [
  { stage: "半决赛", matchIds: ["M102"] },
  { stage: "1/4决赛", matchIds: ["M99", "M100"] },
  { stage: "1/8决赛", matchIds: ["M91", "M92", "M95", "M96"] },
  { stage: "1/16决赛", matchIds: ["M76", "M78", "M79", "M80", "M86", "M88", "M85", "M87"] }
];

const LEFT_GROUPS = ["A", "B", "C", "D", "E", "F"];
const RIGHT_GROUPS = ["G", "H", "I", "J", "K", "L"];

const WORLD_CUP_LOGO_URL = "https://digitalhub.fifa.com/transform/157d23bf-7e13-4d7b-949e-5d27d340987e/WC26_Logo?&io=transform:fill&quality=75";

/* ──────────────────────── Helpers ──────────────────────── */

function getMatchNumber(uid: string): string | null {
  const match = uid.match(/match(\d+)/i);
  return match ? `M${parseInt(match[1], 10)}` : null;
}

/* ──────────────────────── Component ──────────────────────── */

export function TopologyBracket({ matches, timezoneOffset = 0 }: TopologyBracketProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(0.72);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [isSystemFullscreen, setIsSystemFullscreen] = useState(false);
  const [coords, setCoords] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasCenteredLogo = useRef(false);

  // Canvas dimensions — extra horizontal space keeps bracket columns and connector curves readable.
  const CANVAS_W = 2920;
  const CANVAS_H = 1060;

  /* ── Data ── */
  const matchMap = React.useMemo(() => {
    const map = new Map<string, Match>();
    matches.forEach(m => {
      const num = getMatchNumber(m.uid);
      if (num) map.set(num, m);
    });
    return map;
  }, [matches]);

  const { groupTeams, teamGroupMap } = React.useMemo(() => {
    const groupTeamsMap = new Map<string, Set<string>>();
    const teamGroup = new Map<string, string>();
    matches.forEach(m => {
      const gid = getStageGroupId(m.stage);
      if (!gid) return;
      if (!groupTeamsMap.has(gid)) groupTeamsMap.set(gid, new Set());
      const teams = parseTeams(m.summary);
      [teams.home, teams.away].forEach(t => {
        if (t.name && t.name !== "待定" && !t.name.includes("待定") && !t.name.includes("组")) {
          groupTeamsMap.get(gid)?.add(t.name);
          teamGroup.set(t.name, gid);
        }
      });
    });
    const finalMap: Record<string, Team[]> = {};
    groupTeamsMap.forEach((set, gid) => {
      finalMap[gid] = Array.from(set).map(name => {
        let d: Team = { name, badge: name.slice(0, 2).toUpperCase(), badgeType: "code", image: "" };
        const found = matches.find(m => {
          const t = parseTeams(m.summary);
          return t.home.name === name || t.away.name === name;
        });
        if (found) { const t = parseTeams(found.summary); if (t.home.name === name) d = t.home; else if (t.away.name === name) d = t.away; }
        return d;
      });
    });
    return { groupTeams: finalMap, teamGroupMap: teamGroup };
  }, [matches]);

  /* ── Coords ── */
  const updateCoords = useCallback(() => {
    if (!containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const nc: typeof coords = {};
    const ids = [
      ...[...LEFT_GROUPS, ...RIGHT_GROUPS].map(g => `G_${g}`),
      ...LEFT_COLUMNS.flatMap(c => c.matchIds),
      ...RIGHT_COLUMNS.flatMap(c => c.matchIds),
      "M104", "M103"
    ];
    ids.forEach(id => {
      const el = document.getElementById(`bracket-node-${id}`);
      if (el) {
        const r = el.getBoundingClientRect();
        nc[id] = { x: (r.left - cr.left) / scale, y: (r.top - cr.top) / scale, w: r.width / scale, h: r.height / scale };
      }
    });
    setCoords(nc);
  }, [scale]);

  const centerLogoInView = useCallback((behavior: ScrollBehavior = "auto") => {
    const scroller = scrollContainerRef.current;
    const logo = document.getElementById("bracket-center-logo");
    if (!scroller || !logo) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    const logoCenter = logoRect.left + logoRect.width / 2;
    const viewportCenter = scrollerRect.left + scrollerRect.width / 2;
    const nextLeft = scroller.scrollLeft + logoCenter - viewportCenter;

    scroller.scrollTo({
      left: Math.max(0, nextLeft),
      behavior,
    });
  }, []);

  useLayoutEffect(() => {
    updateCoords();
    const t = setTimeout(updateCoords, 300);
    window.addEventListener("resize", updateCoords);
    return () => { clearTimeout(t); window.removeEventListener("resize", updateCoords); };
  }, [updateCoords, matches, scale]);

  useEffect(() => {
    if (!matches.length || hasCenteredLogo.current) return;
    const t = window.setTimeout(() => {
      centerLogoInView("auto");
      updateCoords();
      hasCenteredLogo.current = true;
    }, 420);

    return () => window.clearTimeout(t);
  }, [centerLogoInView, matches.length, updateCoords]);

  useEffect(() => {
    const h = () => {
      const active = document.fullscreenElement === rootRef.current;
      setIsSystemFullscreen(active);
      window.setTimeout(() => {
        if (active) centerLogoInView("auto");
        updateCoords();
      }, 180);
    };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, [centerLogoInView, updateCoords]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && isBrowserFullscreen) { setIsBrowserFullscreen(false); document.body.style.overflow = ""; setTimeout(updateCoords, 150); } };
    window.addEventListener("keydown", h);
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [isBrowserFullscreen, updateCoords]);

  /* ── Fullscreen ── */
  const toggleSystemFullscreen = async () => {
    if (!rootRef.current) return;
    try { document.fullscreenElement ? await document.exitFullscreen() : await rootRef.current.requestFullscreen(); } catch (e) { console.error(e); }
  };
  const toggleBrowserFullscreen = () => {
    const next = !isBrowserFullscreen;
    setIsBrowserFullscreen(next);
    document.body.style.overflow = next ? "hidden" : "";
    window.setTimeout(() => {
      if (next) centerLogoInView("auto");
      updateCoords();
    }, 180);
  };

  /* ── Zoom ── */
  const handleZoomIn = () => setScale(p => Math.min(p + 0.08, 1.5));
  const handleZoomOut = () => setScale(p => Math.max(p - 0.08, 0.35));
  const handleZoomReset = () => {
    setScale(0.72);
    window.setTimeout(() => {
      centerLogoInView("smooth");
      updateCoords();
    }, 120);
  };

  /* ── Wheel zoom ── */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    e.preventDefault();
    e.stopPropagation();

    const scroller = scrollContainerRef.current;
    const rect = scroller?.getBoundingClientRect();
    const pointerX = rect ? e.clientX - rect.left : 0;
    const delta = -e.deltaY * 0.0014;

    setScale(p => {
      const next = Math.min(Math.max(p + delta, 0.35), 1.5);
      const rounded = Math.round(next * 100) / 100;

      if (scroller && rect) {
        const contentX = (scroller.scrollLeft + pointerX) / p;
        window.requestAnimationFrame(() => {
          scroller.scrollLeft = contentX * rounded - pointerX;
          window.requestAnimationFrame(updateCoords);
        });
      }

      return rounded;
    });
  }, [updateCoords]);

  /* ── Drag scroll (uses clientX for fullscreen compat) ── */
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a, .zoom-controls-panel")) return;
    if (!scrollContainerRef.current) return;
    isDragging.current = true;
    startX.current = e.clientX;
    scrollLeft.current = scrollContainerRef.current.scrollLeft;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - startX.current;
    scrollContainerRef.current.scrollLeft = scrollLeft.current - dx * 1.5;
  };
  const handleMouseUpOrLeave = () => { isDragging.current = false; };

  /* ── Team journey highlight ── */
  const teamJourneySet = React.useMemo(() => {
    const js = new Set<string>();
    if (!hoveredTeam || hoveredTeam === "待定" || hoveredTeam.includes("待定") || hoveredTeam.includes("组")) return js;
    const starts: string[] = [];
    matchMap.forEach((m, key) => {
      const t = parseTeams(m.summary);
      if (t.home.name === hoveredTeam || t.away.name === hoveredTeam) {
        if (parseInt(key.slice(1), 10) >= 73) starts.push(key);
      }
    });
    if (starts.length) {
      starts.forEach(s => { let c: string | undefined = s; while (c) { js.add(c); c = NEXT_MATCH_MAP[c]; } });
      const g = teamGroupMap.get(hoveredTeam); if (g) js.add(`G_${g}`);
    } else {
      const g = teamGroupMap.get(hoveredTeam);
      if (g) {
        js.add(`G_${g}`);
        const POTENTIAL: Record<string, string[]> = { A:["M73","M79"], B:["M73","M85"], C:["M74","M76"], D:["M82","M86"], E:["M75","M77"], F:["M74","M76"], G:["M81","M86"], H:["M83","M87"], I:["M77","M78"], J:["M83","M87"], K:["M84","M88"], L:["M84","M80"] };
        (POTENTIAL[g] || []).forEach(s => { let c: string | undefined = s; while (c) { js.add(c); c = NEXT_MATCH_MAP[c]; } });
      }
    }
    return js;
  }, [hoveredTeam, matchMap, teamGroupMap]);

  /* ── SVG paths ── */
  const getCurvePath = (fromId: string, toId: string, side: "left" | "right") => {
    const f = coords[fromId], t = coords[toId];
    if (!f || !t) return "";
    const sx = side === "left" ? f.x + f.w : f.x;
    const sy = f.y + f.h / 2;
    const ex = side === "left" ? t.x : t.x + t.w;
    const ey = t.y + t.h / 2;
    const off = Math.abs(ex - sx) * 0.42;
    const c1x = side === "left" ? sx + off : sx - off;
    const c2x = side === "left" ? ex - off : ex + off;
    return `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ey}, ${ex} ${ey}`;
  };

  const isConnectionActive = (f: string, t: string) => teamJourneySet.has(f) && teamJourneySet.has(t);

  /* ── Render Group Card ── */
  const renderGroupCard = (groupId: string) => {
    const teams = groupTeams[groupId] || [];
    const anyHovered = hoveredTeam !== null;
    const isActive = teamJourneySet.has(`G_${groupId}`);

    return (
      <div
        id={`bracket-node-G_${groupId}`}
        key={`group-${groupId}`}
        className={`group relative w-[196px] rounded-2xl border p-3 backdrop-blur-xl transition-all duration-300 ${
          isActive
            ? "border-volt/60 bg-volt/[0.04] shadow-[0_0_20px_-4px_rgba(216,255,62,0.2)]"
            : anyHovered
            ? "border-white/[0.04] bg-black/40 opacity-35"
            : "border-white/[0.08] bg-black/50 hover:border-white/15 hover:shadow-[0_0_20px_-6px_rgba(255,255,255,0.08)]"
        }`}
      >
        {/* Header */}
        <div className="mb-2.5 flex items-center justify-between border-b border-white/[0.06] pb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-volt/80">
            {groupId} 组
          </span>
          <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[8px] font-medium uppercase tracking-wider text-white/30">
            STAGE 1
          </span>
        </div>

        {/* Teams */}
        <div className="space-y-0.5">
          {Array.from({ length: 4 }).map((_, i) => {
            const team = teams[i];
            if (!team) {
              return (
                <div key={i} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[10px] text-white/15">
                  <div className="h-4 w-5 rounded bg-white/[0.03]" />
                  <span>—</span>
                </div>
              );
            }
            const isHovered = hoveredTeam === team.name;
            return (
              <div
                key={team.name}
                className={`flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors cursor-pointer ${
                  isHovered ? "bg-volt/[0.08]" : "hover:bg-white/[0.03]"
                }`}
                onMouseEnter={() => setHoveredTeam(team.name)}
                onMouseLeave={() => setHoveredTeam(null)}
              >
                {team.image ? (
                  <img src={team.image} alt="" className="h-4 w-5 rounded object-cover shadow-sm" />
                ) : (
                  <div className="flex h-4 w-5 items-center justify-center rounded bg-white/[0.05] text-[7px] font-bold text-white/40">
                    {team.badge}
                  </div>
                )}
                <span className={`truncate text-[11px] font-medium leading-tight ${isHovered ? "text-volt" : "text-white/75"}`}>
                  {team.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Render Match Card ── */
  const renderMatchCard = (id: string) => {
    const match = matchMap.get(id);
    if (!match) return null;
    const teams = parseTeams(match.summary);
    const adjustedStart = new Date(match.start.getTime() + timezoneOffset * 3600000);
    const slug = generateMatchSlug(match.summary);
    const isUnlocked = areMatchTeamsConfirmed(match.summary);
    const isHomeH = hoveredTeam === teams.home.name;
    const isAwayH = hoveredTeam === teams.away.name;
    const anyH = hoveredTeam !== null;
    const inJourney = teamJourneySet.has(id);

    // Stage label color
    const stageLabel = formatStageLabel(match.stage, match.summary);
    const isFinal = match.stage.includes("决赛");
    const isSemi = match.stage.includes("半决赛");

    const card = (
        <motion.div
          id={`bracket-node-${id}`}
          className={`group relative w-[196px] rounded-2xl border p-3 backdrop-blur-xl transition-all duration-300 ${
            inJourney
              ? "border-volt/60 bg-volt/[0.04] shadow-[0_0_20px_-4px_rgba(216,255,62,0.2)]"
              : anyH
              ? "border-white/[0.04] bg-black/40 opacity-35"
              : "border-white/[0.08] bg-black/50 hover:border-white/15 hover:shadow-[0_0_20px_-6px_rgba(255,255,255,0.08)]"
          }`}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          {/* Top row: match id + stage */}
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-volt/70">
              {id}
            </span>
            <span className={`text-[9px] font-medium uppercase tracking-wider ${
              isFinal ? "text-volt" : isSemi ? "text-flare/80" : "text-white/35"
            }`}>
              {stageLabel}
            </span>
          </div>

          {/* Teams */}
          <div className="space-y-0.5">
            {[teams.home, teams.away].map((team, idx) => {
              const isH = idx === 0 ? isHomeH : isAwayH;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-lg px-1.5 py-1 transition-colors ${
                    isH ? "bg-volt/[0.08]" : "hover:bg-white/[0.03]"
                  }`}
                  onMouseEnter={() => setHoveredTeam(team.name)}
                  onMouseLeave={() => setHoveredTeam(null)}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    {team.image ? (
                      <img src={team.image} alt="" className="h-4 w-5 rounded object-cover shadow-sm" />
                    ) : (
                      <div className="flex h-4 w-5 items-center justify-center rounded bg-white/[0.05] text-[7px] font-bold text-white/40">
                        ?
                      </div>
                    )}
                    <span className={`truncate text-[11px] font-medium leading-tight ${isH ? "text-volt" : "text-white/75"}`}>
                      {team.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time */}
          <div className="mt-2 border-t border-white/[0.04] pt-1.5 text-right text-[9px] font-medium text-white/30 tabular-nums">
            {formatTime(adjustedStart)}
          </div>

          {/* Subtle bottom glow on active */}
          {inJourney && (
            <div className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-volt/40 to-transparent" />
          )}
        </motion.div>
    );

    return isUnlocked ? (
      <Link href={"/matches/" + slug} key={id}>
        {card}
      </Link>
    ) : (
      <div key={id} aria-disabled="true" className="opacity-70">
        {card}
      </div>
    );
  };

  const isAnyFullscreen = isBrowserFullscreen || isSystemFullscreen;

  const rootClasses = isBrowserFullscreen
    ? "fixed inset-0 z-[9999] w-screen h-screen p-5 sm:p-8 flex flex-col overflow-hidden bg-gradient-to-br from-[#050505] via-[#0A0A0F] to-[#14141F]"
    : isSystemFullscreen
    ? "w-screen h-screen p-5 sm:p-8 flex flex-col overflow-hidden bg-gradient-to-br from-[#050505] via-[#0A0A0F] to-[#14141F]"
    : "hero-card relative h-[720px] overflow-hidden p-5 sm:h-[760px] sm:p-6 flex flex-col";

  return (
    <div ref={rootRef} className={rootClasses}>
      {/* ── Header ── */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2.5">
            赛程对阵全景拓扑图
            <span className="rounded-full border border-volt/20 bg-volt/[0.08] px-2.5 py-0.5 text-[10px] font-medium text-volt/90">
              2026 FIFA
            </span>
          </h3>
          <p className="mt-1 text-xs text-white/35 leading-relaxed">
            从小组赛到决赛的完整晋级路径。悬停球队可高亮其晋级路线，支持缩放、拖拽与全屏浏览。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {isBrowserFullscreen && (
            <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/40">
              按 Esc 退出
            </span>
          )}
        </div>
      </div>

      {/* ── Scroll Container ── */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        className={`scrollbar-hidden overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing select-none w-full flex-1 min-h-0 ${
          isAnyFullscreen ? "flex items-center" : ""
        }`}
      >
        <div
          className="relative"
          style={{ width: `${CANVAS_W * scale}px`, height: `${CANVAS_H * scale}px` }}
        >
          <div
            ref={containerRef}
            className="absolute origin-top-left"
            style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, top: 0, left: 0 }}
          >
            {/* ── SVG connections ── */}
            <svg className="absolute inset-0 pointer-events-none h-full w-full z-0">
              <defs>
                <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="conn-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(216,255,62,0.15)" />
                  <stop offset="50%" stopColor="rgba(216,255,62,0.08)" />
                  <stop offset="100%" stopColor="rgba(216,255,62,0.15)" />
                </linearGradient>
              </defs>

              {CONNECTIONS.map(({ from, to, side }) => {
                const path = getCurvePath(from, to, side);
                if (!path) return null;
                const active = isConnectionActive(from, to);
                return (
                  <g key={`${from}-${to}`}>
                    {/* Inactive path */}
                    <path
                      d={path}
                      fill="none"
                      stroke="rgba(255,255,255,0.14)"
                      strokeWidth={2}
                      className="transition-opacity duration-150"
                    />
                    {/* Subtle background glow on inactive paths */}
                    <path
                      d={path}
                      fill="none"
                      stroke="rgba(216,255,62,0.055)"
                      strokeWidth={6}
                      className="transition-opacity duration-150"
                    />
                    {/* Active glow */}
                    {active && (
                      <>
                        <path
                          d={path}
                          fill="none"
                          stroke="#d8ff3e"
                          strokeWidth={5}
                          strokeOpacity={0.3}
                          filter="url(#neon-glow)"
                          className="transition-opacity duration-150"
                        />
                        <path
                          d={path}
                          fill="none"
                          stroke="#d8ff3e"
                          strokeWidth={1.8}
                          strokeDasharray="8 6"
                          strokeOpacity={0.8}
                          style={{ animation: "bracketFlow 14s linear infinite" }}
                          className="transition-opacity duration-150"
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* ── Bracket Grid ── */}
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-16 px-14">
              {/* Left Groups */}
              <div className="flex h-full shrink-0 flex-col justify-center gap-5 py-6">
                {LEFT_GROUPS.map(g => renderGroupCard(g))}
              </div>

              {/* Left Knockout Columns */}
              {LEFT_COLUMNS.map((col, i) => (
                <div key={`lc-${i}`} className="flex h-full shrink-0 flex-col justify-center gap-5 py-6">
                  {col.matchIds.map(id => renderMatchCard(id))}
                </div>
              ))}

              {/* ── CENTER: World Cup Logo + Finals ── */}
              <div className="flex h-full w-[248px] shrink-0 flex-col items-center justify-center gap-6 px-4 py-6">
                {/* World Cup Logo */}
                <div id="bracket-center-logo" className="flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    {/* Outer ring pulse */}
                    <div className="absolute -inset-4 rounded-full border border-volt/10" style={{ animation: "breatheRing 4s ease-in-out infinite" }} />
                    <div className="absolute -inset-7 rounded-full border border-volt/[0.04]" />
                    {/* Logo container */}
                    <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-volt/[0.08] to-transparent border border-volt/20 shadow-[0_0_30px_rgba(216,255,62,0.12)]">
                      <img
                        src={WORLD_CUP_LOGO_URL}
                        alt="FIFA World Cup 2026"
                        className="h-[42px] w-auto object-contain"
                        loading="eager"
                      />
                    </div>
                  </div>
                  <span className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-volt/70">
                    FIFA World Cup
                  </span>
                  <span className="text-[9px] font-medium uppercase tracking-wider text-white/25">
                    2026 美加墨
                  </span>
                </div>

                {/* Final + 3rd Place */}
                <div className="flex flex-col items-center gap-3">
                  {renderMatchCard("M104")}
                  <div className="flex flex-col items-center">
                    <span className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/25">
                      三四名决赛
                    </span>
                    {renderMatchCard("M103")}
                  </div>
                </div>
              </div>

              {/* Right Knockout Columns */}
              {RIGHT_COLUMNS.map((col, i) => (
                <div key={`rc-${i}`} className="flex h-full shrink-0 flex-col justify-center gap-5 py-6">
                  {col.matchIds.map(id => renderMatchCard(id))}
                </div>
              ))}

              {/* Right Groups */}
              <div className="flex h-full shrink-0 flex-col justify-center gap-5 py-6">
                {RIGHT_GROUPS.map(g => renderGroupCard(g))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating Controls ── */}
      <div className={`absolute ${isAnyFullscreen ? "right-5 top-5" : "bottom-4 right-4"} z-30 flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/70 p-1.5 shadow-xl backdrop-blur-xl zoom-controls-panel`}>
        <button
          onClick={handleZoomOut}
          disabled={scale <= 0.35}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
          title="缩小"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-10 text-center text-[11px] font-semibold text-white/60 tabular-nums select-none">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          disabled={scale >= 1.5}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
          title="放大"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleZoomReset}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white"
          title="重置"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
        <div className="mx-1 h-4 w-px bg-white/[0.08]" />
        <button
          onClick={toggleBrowserFullscreen}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
            isBrowserFullscreen ? "bg-volt/10 text-volt" : "bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white"
          }`}
          title={isBrowserFullscreen ? "退出网页全屏" : "网页全屏"}
        >
          {isBrowserFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={toggleSystemFullscreen}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
            isSystemFullscreen ? "bg-volt/10 text-volt" : "bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white"
          }`}
          title={isSystemFullscreen ? "退出系统全屏" : "系统全屏"}
        >
          {isSystemFullscreen ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Animations ── */}
      <style jsx global>{`
        @keyframes bracketFlow {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes breatheRing {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
