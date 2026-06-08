"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarDays, ExternalLink, Newspaper, Search, Shield, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  buildGlobalSearchResults,
  getTotalSearchCount,
  searchTabs,
  type SearchCategory,
  type SearchNewsItem,
  type SearchResultItem,
} from "@/lib/global-search";
import { cachedJson, fetchWithTimeout } from "@/lib/request-cache";
import { useWorldCupData } from "@/lib/use-world-cup-data";

type NewsResponse = {
  items?: SearchNewsItem[];
};

const NEWS_API = process.env.NEXT_PUBLIC_NEWS_API_URL || "https://news.20250114.xyz";
const tabIds = new Set<SearchCategory>(searchTabs.map((tab) => tab.id));

export function SearchClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const initialTab = getSafeTab(params.get("tab"));
  const { matches, loading: matchesLoading } = useWorldCupData();
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchCategory>(initialTab);
  const [news, setNews] = useState<SearchNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    setSubmittedQuery(initialQuery);
    setActiveTab(initialTab);
  }, [initialQuery, initialTab]);

  useEffect(() => {
    let alive = true;
    const endpoint = `${NEWS_API}/api/news?${new URLSearchParams({ limit: "96" }).toString()}`;
    setNewsLoading(true);

    cachedJson<NewsResponse | null>(endpoint, 3 * 60 * 1000, async () => {
      const response = await fetchWithTimeout(endpoint, { cache: "no-store" }, 5_000);
      return response.ok ? ((await response.json()) as NewsResponse) : null;
    }, { persist: true, staleTtlMs: 24 * 60 * 60 * 1000 })
      .then((payload: NewsResponse | null) => {
        if (alive) setNews(payload?.items ?? []);
      })
      .catch(() => {
        if (alive) setNews([]);
      })
      .finally(() => {
        if (alive) setNewsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => buildGlobalSearchResults(submittedQuery, matches, news), [matches, news, submittedQuery]);
  const total = getTotalSearchCount(results);
  const activeResults = results[activeTab];
  const isLoading = matchesLoading || newsLoading;

  const changeTab = (tab: SearchCategory) => {
    setActiveTab(tab);
    router.replace(`/search?${new URLSearchParams({ q: submittedQuery, tab }).toString()}`, { scroll: false });
  };

  return (
    <DashboardShell>
      <main className="space-y-5">
        <section className="hero-card overflow-hidden p-4 sm:p-5">
          <SearchResultTabs activeTab={activeTab} counts={results} onChange={changeTab} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/38">
            <span>{submittedQuery ? `“${submittedQuery}” 共 ${total} 条结果` : `全部索引 ${total} 条内容`}</span>
            {isLoading ? <span className="text-volt/65">正在同步最新信号...</span> : null}
          </div>
        </section>

        <AnimatePresence mode="wait">
          <motion.section
            key={activeTab + submittedQuery}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {activeResults.length ? (
              activeResults.map((item, index) => (
                <ResultCard key={`${item.type}-${item.id}`} item={item} index={index} />
              ))
            ) : (
              <div className="hero-card col-span-full flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <Search className="h-10 w-10 text-white/18" />
                <h2 className="mt-4 text-base font-black text-white/70">没有找到匹配结果</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/38">换一个关键词，或切换到其他分类查看。</p>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </main>
    </DashboardShell>
  );
}

function SearchResultTabs({
  activeTab,
  counts,
  onChange,
}: {
  activeTab: SearchCategory;
  counts: Record<SearchCategory, SearchResultItem[]>;
  onChange: (tab: SearchCategory) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="搜索结果分类">
      {searchTabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`group relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-left text-xs font-bold transition duration-300 sm:px-3.5 sm:py-2 sm:text-sm ${
              active
                ? "bg-volt text-black shadow-[0_0_24px_rgba(216,255,62,.2)]"
                : "bg-white/[0.055] text-white/62 ring-1 ring-white/[0.08] hover:bg-white/[0.09] hover:text-white"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums sm:px-2 sm:text-[11px] ${
                active ? "bg-black/15 text-black" : "bg-black/25 text-volt/80 group-hover:bg-volt/[0.12]"
              }`}
            >
              {counts[tab.id].length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ResultCard({ item, index }: { item: SearchResultItem; index: number }) {
  const Icon = item.type === "teams" ? Shield : item.type === "players" ? UserRound : item.type === "matches" ? CalendarDays : Newspaper;
  const content = (
    <>
      <div className="relative h-40 overflow-hidden rounded-[1.5rem] bg-white/[0.04]">
        {item.image ? (
          <Image src={item.image} alt="" fill sizes="(min-width:1280px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover opacity-78 transition duration-500 group-hover:scale-105 group-hover:opacity-95" />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(216,255,62,0.14),transparent_38%)]">
            <Icon className="h-10 w-10 text-volt/55" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/66 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-volt backdrop-blur-xl">
          {item.eyebrow || item.type}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 text-base font-black leading-snug text-white transition group-hover:text-volt">{item.title}</h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/45">{item.description}</p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/30">{labelByType(item.type)}</span>
          {item.external ? <ExternalLink className="h-4 w-4 text-white/25 transition group-hover:text-volt" /> : <ArrowRight className="h-4 w-4 text-white/25 transition group-hover:text-volt" />}
        </div>
      </div>
    </>
  );

  const className = "hero-card group flex min-h-[330px] flex-col overflow-hidden p-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(216,255,62,.08)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.2), duration: 0.36 }}
    >
      {item.external ? (
        <a href={item.href} target="_blank" rel="noreferrer" className={className}>
          {content}
        </a>
      ) : (
        <Link href={item.href} className={className}>
          {content}
        </Link>
      )}
    </motion.div>
  );
}

function getSafeTab(value: string | null): SearchCategory {
  return value && tabIds.has(value as SearchCategory) ? (value as SearchCategory) : "teams";
}

function labelByType(type: SearchCategory) {
  if (type === "teams") return "Team";
  if (type === "players") return "Player";
  if (type === "matches") return "Match";
  return "News";
}
