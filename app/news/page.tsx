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
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveTag(filter.value)}
              className={`h-12 shrink-0 rounded-2xl px-4 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                activeTag === filter.value
                  ? "bg-volt text-black shadow-[0_0_28px_rgba(216,255,62,0.25)]"
                  : "bg-white/[0.045] text-white/52 ring-1 ring-white/[0.07] hover:bg-white/[0.075] hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
        ) : items.length ? (
          items.map((item, index) => <NewsCard key={`${item.id}-${item.url}`} item={item} index={index} />)
        ) : (
          <div className="hero-card col-span-full flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
            <RefreshCw className="h-6 w-6 text-white/38" />
            <p className="text-sm text-white/58">暂时没有匹配新闻，换个关键词或筛选项再试。</p>
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

  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.36 }}
      className="hero-card group flex min-h-[260px] flex-col overflow-hidden transition hover:-translate-y-1"
    >
      <div className="relative h-32 overflow-hidden bg-white/[0.035]">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(216,255,62,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))]">
            <Newspaper className="h-9 w-9 text-volt/70" />
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-volt backdrop-blur-xl">
          {firstTag}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.12em] text-white/35">
          <span className="truncate">{item.source}</span>
          <span className="shrink-0 tabular">{published}</span>
        </div>

        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-white transition group-hover:text-volt">
          {item.title}
        </h2>
        <p className="line-clamp-2 text-sm leading-6 text-white/52">{item.summary}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="truncate text-xs text-white/32">{item.sourceFeed}</span>
          <ExternalLink className="h-4 w-4 shrink-0 text-white/28 transition group-hover:text-volt" />
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
