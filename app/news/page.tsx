"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Newspaper, RefreshCw, Search, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceFeed: string;
  language: string;
  image: string;
  tags: string[];
  publishedAt: string;
};

type NewsResponse = {
  updatedAt: string | null;
  count: number;
  total: number;
  errors: { feed: string; message: string }[];
  items: NewsItem[];
};

const NEWS_API = process.env.NEXT_PUBLIC_NEWS_API_URL || "https://news.20250114.xyz";

const filters = [
  { label: "全部", value: "" },
  { label: "门票", value: "tickets" },
  { label: "预选赛", value: "qualifiers" },
  { label: "赛程", value: "schedule" },
  { label: "主办城市", value: "host-cities" }
];

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

export default function NewsPage() {
  const [payload, setPayload] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ limit: "72" });
    if (activeTag) params.set("tag", activeTag);
    if (query.trim()) params.set("q", query.trim());
    return `${NEWS_API}/api/news?${params.toString()}`;
  }, [activeTag, query]);

  useEffect(() => {
    let alive = true;

    async function loadNews() {
      setLoading(true);
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) throw new Error(`News API returned ${response.status}`);
        const data = await response.json();
        if (alive) setPayload(data);
      } catch {
        if (alive) setPayload({ updatedAt: null, count: 0, total: 0, errors: [], items: [] });
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadNews();
    return () => {
      alive = false;
    };
  }, [endpoint]);

  const items = payload?.items ?? [];
  const updatedAt = payload?.updatedAt ? dateFormatter.format(new Date(payload.updatedAt)) : "等待同步";

  return (
    <DashboardShell>
      <section className="relative overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7 lg:px-8">
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_18%_18%,rgba(216,255,62,0.13),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-volt/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-volt ring-1 ring-volt/25">
              <Sparkles className="h-3.5 w-3.5" />
              Live World Cup Signal
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-white sm:text-5xl">
              世界杯新闻聚合
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58 sm:text-base">
              自动汇集 2026 世界杯、预选赛、门票、主办城市与球队动态，只展示摘要与来源链接。
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.45 }}
            className="hero-card grid gap-3 p-4 sm:grid-cols-3"
          >
            <Stat label="已收录" value={String(payload?.total ?? 0)} />
            <Stat label="当前显示" value={String(items.length)} />
            <Stat label="最近同步" value={updatedAt} compact />
          </motion.div>
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="hero-card flex min-h-14 flex-1 items-center gap-3 px-4">
          <Search className="h-4 w-4 shrink-0 text-white/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索球队、城市、媒体或关键词"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/32"
          />
        </div>

        <div className="scrollbar-hidden flex gap-2 overflow-x-auto pb-1 lg:pb-0">
          {filters.map((filter) => {
            const isActive = activeTag === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveTag(filter.value)}
                className={`relative h-12 shrink-0 rounded-2xl px-4 text-xs font-semibold uppercase tracking-[0.12em] transition-colors duration-300 ${
                  isActive
                    ? "text-black"
                    : "text-white/52 bg-white/[0.045] ring-1 ring-white/[0.07] hover:bg-white/[0.075] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFilter"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-2xl bg-volt shadow-[0_0_28px_rgba(216,255,62,0.25)]"
                  />
                )}
                <span className="relative z-10">{filter.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
        ) : items.length ? (
          items.map((item, index) => <NewsCard key={`${item.id}-${item.url}`} item={item} index={index} />)
        ) : (
          <div className="hero-card col-span-full flex min-h-[350px] flex-col items-center justify-center gap-6 p-8 text-center overflow-hidden relative">
            {/* Radar Animation Grid/Circles */}
            <div className="relative flex items-center justify-center w-40 h-40">
              {/* Radial grid lines */}
              <div className="absolute inset-0 rounded-full border border-white/5" />
              <div className="absolute inset-4 rounded-full border border-white/5" />
              <div className="absolute inset-8 rounded-full border border-white/5" />
              <div className="absolute inset-12 rounded-full border border-white/5" />
              <div className="absolute inset-16 rounded-full border border-white/5" />
              
              {/* Radar sweeping scan line */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute inset-0 origin-center rounded-full pointer-events-none"
                style={{
                  background: "conic-gradient(from 0deg, rgba(216, 255, 62, 0.15) 0deg, rgba(216, 255, 62, 0) 90deg, transparent 360deg)"
                }}
              />
              
              {/* Pulsing circles */}
              <motion.div
                animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
                className="absolute w-20 h-20 rounded-full border border-volt/30 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [1, 2], opacity: [0.4, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, delay: 1.25, ease: "easeOut" }}
                className="absolute w-20 h-20 rounded-full border border-flare/20 pointer-events-none"
              />

              {/* Center blip */}
              <div className="absolute w-2.5 h-2.5 rounded-full bg-volt shadow-[0_0_12px_rgba(216,255,62,0.8)] animate-pulse" />
            </div>

            <div className="space-y-2 relative z-10">
              <h3 
                className="text-xs uppercase tracking-[0.3em] text-volt font-medium"
                style={{ fontFamily: "ScreenMatrix, monospace" }}
              >
                Signal Scanning...
              </h3>
              <p className="text-sm text-white/58 max-w-sm mx-auto">
                未检索到匹配信号。请尝试调整筛选标签或检索词重新搜索。
              </p>
            </div>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}

function Stat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/[0.035] px-4 py-3 ring-1 ring-white/[0.06]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">{label}</p>
      <p className={`${compact ? "text-sm" : "text-2xl"} mt-1 font-semibold text-white`}>{value}</p>
    </div>
  );
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const published = dateFormatter.format(new Date(item.publishedAt));
  const firstTag = item.tags[0]?.replaceAll("-", " ") ?? "world cup";
  
  const textLength = (item.title || "").length + (item.summary || "").length;
  const byteCount = textLength * 2 + 128;
  const readTimeMin = Math.max(1, Math.ceil(textLength / 250));

  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.36 }}
      className="hero-card group flex min-h-[260px] flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_30px_rgba(216,255,62,0.12)] hover:ring-1 hover:ring-volt/30"
    >
      {/* Top neon glow line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-volt via-flare to-volt opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20" />
      {/* Ambient hover glow */}
      <div className="absolute -inset-px rounded-[1.65rem] bg-gradient-to-r from-volt/5 to-flare/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-sm z-0" />

      <div className="relative h-32 overflow-hidden bg-white/[0.035]">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(216,255,62,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))]">
            <Newspaper className="h-9 w-9 text-volt/70" />
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-volt backdrop-blur-xl z-10">
          {firstTag}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 z-10">
        <div className="flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.14em] text-white/35">
          <span className="truncate">{item.source}</span>
          <span className="shrink-0 tabular">{published}</span>
        </div>

        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-white transition group-hover:text-volt">
          {item.title}
        </h2>
        <p className="line-clamp-2 text-sm leading-6 text-white/52">{item.summary}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2 border-t border-white/[0.04]">
          <span className="truncate text-xs text-white/32 font-mono">{item.sourceFeed}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider">{readTimeMin}m read</span>
            <span className="text-[10px] font-mono text-volt/40 uppercase">/ {byteCount}b</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/28 transition group-hover:text-volt" />
          </div>
        </div>
      </div>
    </motion.a>
  );
}

function SkeletonCard() {
  return (
    <div className="hero-card min-h-[260px] overflow-hidden">
      <div className="h-32 animate-pulse bg-white/[0.055]" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/2 rounded-full bg-white/[0.06]" />
        <div className="h-4 w-full rounded-full bg-white/[0.08]" />
        <div className="h-4 w-4/5 rounded-full bg-white/[0.065]" />
        <div className="h-3 w-2/3 rounded-full bg-white/[0.045]" />
      </div>
    </div>
  );
}
