"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarDays, ExternalLink, Newspaper, Search, Shield, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  buildGlobalSearchResults,
  searchTabs,
  type SearchCategory,
  type SearchNewsItem,
  type SearchResultItem,
} from "@/lib/global-search";
import { useWorldCupData } from "@/lib/use-world-cup-data";

type NewsResponse = {
  items?: SearchNewsItem[];
};

const NEWS_API = process.env.NEXT_PUBLIC_NEWS_API_URL || "https://news.20250114.xyz";

export function GlobalSearchDrawerCard({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { matches } = useWorldCupData();
  const [query, setQuery] = useState("");
  const [news, setNews] = useState<SearchNewsItem[]>([]);

  useEffect(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (news.length) return;
    let alive = true;
    const endpoint = `${NEWS_API}/api/news?${new URLSearchParams({ limit: "48" }).toString()}`;

    fetch(endpoint, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: NewsResponse | null) => {
        if (alive) setNews(payload?.items ?? []);
      })
      .catch(() => {
        if (alive) setNews([]);
      });

    return () => {
      alive = false;
    };
  }, [news.length]);

  const results = useMemo(() => buildGlobalSearchResults(query, matches, news), [matches, news, query]);
  const suggestions = useMemo(() => buildSuggestions(results), [results]);

  const submitSearch = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(trimmed)}&tab=${firstResultTab(results)}`);
  };

  const closeAfterNavigate = () => {
    onNavigate?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <form
        onSubmit={submitSearch}
        className="mx-3 mt-3 flex h-12 shrink-0 items-center gap-2 rounded-full bg-white/[0.055] px-3 ring-1 ring-white/[0.1] focus-within:ring-volt/45"
      >
        <Search className="h-4 w-4 shrink-0 text-volt/75" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索球队 / 球员 / 赛程 / 新闻"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/30"
        />
        {query ? (
          <button
            type="button"
            aria-label="清空搜索"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/35 transition hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="submit"
          aria-label="提交搜索"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-volt text-black transition hover:shadow-[0_0_20px_rgba(216,255,62,.32)]"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="relative mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-5">
        {suggestions.length ? (
          <div>
            {suggestions.map((item, index) => (
              <div key={`${item.type}-${item.id}`} className="relative">
                {index > 0 ? <div className="absolute left-[3.875rem] right-0 top-0 border-t border-white/[0.08]" /> : null}
                <SuggestionRow item={item} onNavigate={closeAfterNavigate} thumbnailShape="circle" />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <Search className="mx-auto h-8 w-8 text-white/18" />
            <p className="mt-3 text-sm font-bold text-white/58">没有匹配结果</p>
            <p className="mt-1 text-xs text-white/32">换一个球队、球员或城市试试。</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const { matches } = useWorldCupData();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [news, setNews] = useState<SearchNewsItem[]>([]);

  useEffect(() => {
    setFocused(false);
    setExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (!focused || news.length) return;
    let alive = true;
    const endpoint = `${NEWS_API}/api/news?${new URLSearchParams({ limit: "48" }).toString()}`;

    fetch(endpoint, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: NewsResponse | null) => {
        if (alive) setNews(payload?.items ?? []);
      })
      .catch(() => {
        if (alive) setNews([]);
      });

    return () => {
      alive = false;
    };
  }, [focused, news.length]);

  const results = useMemo(() => buildGlobalSearchResults(query, matches, news), [matches, news, query]);
  const suggestions = useMemo(() => buildSuggestions(results), [results]);
  const showSuggestions = focused && (query.trim().length > 0 || suggestions.length > 0);

  const submitSearch = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}&tab=${firstResultTab(results)}`);
  };

  const openSearch = () => {
    setExpanded(true);
    setFocused(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const keepOpen = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  };

  const scheduleClose = () => {
    closeTimerRef.current = window.setTimeout(() => {
      setFocused(false);
      if (!query.trim()) setExpanded(false);
    }, 140);
  };

  return (
    <div className="relative hidden h-10 w-10 shrink-0 xl:block" onMouseDown={keepOpen}>
      <AnimatePresence initial={false} mode="popLayout">
        {!expanded ? (
          <button
            key="search-icon"
            type="button"
            onClick={openSearch}
            aria-label="打开全局搜索"
            className="group absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/60 ring-1 ring-white/[0.08] transition-all duration-200 hover:bg-white/[0.1] hover:text-white hover:ring-volt/35"
          >
            <Search className="h-4 w-4 transition duration-300 group-hover:scale-110 group-hover:text-volt" />
          </button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.form
            key="search-form"
            onSubmit={submitSearch}
            initial={{ width: 36, opacity: 0, scaleX: 0.78 }}
            animate={{ width: 195, opacity: 1, scaleX: 1 }}
            exit={{ width: 36, opacity: 0, scaleX: 0.78 }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            style={{ transformOrigin: "right center" }}
            className="group absolute right-0 top-0 z-[220] flex h-10 items-center gap-2 overflow-hidden rounded-full bg-[#070a10]/92 px-3 ring-1 ring-white/[0.1] shadow-[0_16px_48px_rgba(0,0,0,.28),0_0_28px_rgba(216,255,62,.08)] backdrop-blur-2xl focus-within:ring-volt/42"
          >
            <Search className="h-4 w-4 shrink-0 text-volt/75" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                setExpanded(true);
                setFocused(true);
              }}
              onBlur={scheduleClose}
              placeholder="搜索球队 / 球员 / 赛程 / 新闻"
              className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-white outline-none placeholder:text-white/30"
            />
            {query ? (
              <button
                type="button"
                aria-label="清空搜索"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/35 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <button
              type="submit"
              aria-label="提交搜索"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-volt text-black transition hover:shadow-[0_0_20px_rgba(216,255,62,.32)]"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.form>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showSuggestions ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+0.65rem)] z-[320] w-[320px] overflow-hidden rounded-[1.6rem] border border-white/[0.18] bg-[#070a11] shadow-[0_30px_90px_rgba(0,0,0,.78),0_0_58px_rgba(216,255,62,.16)]"
          >
            {suggestions.length ? (
              <div className="divide-y divide-white/[0.08] px-2 py-1 pb-4">
                {suggestions.map((item) => (
                  <SuggestionRow key={`${item.type}-${item.id}`} item={item} onNavigate={() => setFocused(false)} />
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <Search className="mx-auto h-7 w-7 text-white/18" />
                <p className="mt-3 text-sm font-bold text-white/58">没有匹配结果</p>
                <p className="mt-1 text-xs text-white/32">换一个球队、球员或城市试试。</p>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-white/[0.035] backdrop-blur-xl [mask-image:linear-gradient(to_top,black,transparent)]" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SuggestionRow({
  item,
  onNavigate,
  thumbnailShape = "soft",
}: {
  item: SearchResultItem;
  onNavigate: () => void;
  thumbnailShape?: "soft" | "circle";
}) {
  const Icon = item.type === "teams" ? Shield : item.type === "players" ? UserRound : item.type === "matches" ? CalendarDays : Newspaper;
  const thumbnailClassName = thumbnailShape === "circle" ? "rounded-full" : "rounded-2xl";
  const content = (
    <>
      <div className={`relative h-10 w-10 shrink-0 overflow-hidden bg-white/[0.055] ring-1 ring-white/[0.08] ${thumbnailClassName}`}>
        {item.image ? (
          <Image src={item.image} alt="" fill sizes="40px" className="object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-volt/70">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-black text-white transition group-hover:text-volt">{item.title}</p>
          <span className="shrink-0 rounded-full bg-volt/[0.14] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-volt">
            {labelByType(item.type)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-white/72">{item.eyebrow || item.description}</p>
      </div>
      {item.external ? <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/58 transition group-hover:text-volt" /> : <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/58 transition group-hover:text-volt" />}
    </>
  );

  const className = "group flex items-center gap-3 px-2.5 py-3 transition hover:bg-white/[0.045]";

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" onClick={onNavigate} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} onClick={onNavigate} className={className}>
      {content}
    </Link>
  );
}

function buildSuggestions(results: Record<SearchCategory, SearchResultItem[]>) {
  const picked: SearchResultItem[] = [];

  for (const tab of searchTabs) {
    picked.push(...results[tab.id].slice(0, 2));
  }

  return picked.slice(0, 8);
}

function firstResultTab(results: Record<SearchCategory, SearchResultItem[]>): SearchCategory {
  return searchTabs.find((tab) => results[tab.id].length)?.id ?? "teams";
}

function labelByType(type: SearchCategory) {
  if (type === "teams") return "球队";
  if (type === "players") return "球员";
  if (type === "matches") return "赛程";
  return "新闻";
}
