"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ExternalLink, Languages, Loader2, Newspaper, X } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useUserSession } from "@/components/user-session-provider";
import articleIndex from "@/data/articles.generated.json";
import { cachedJson, fetchWithTimeout } from "@/lib/request-cache";
import { useMobilePinnedRail } from "@/lib/use-mobile-pinned-rail";

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
  features?: {
    articleTranslationEnabled?: boolean;
    articleReaderEnabled?: boolean;
    listTranslationEnabled?: boolean;
  };
  items: NewsItem[];
};

type ArticleResponse = {
  title: string;
  source: string;
  url: string;
  image: string;
  publishedAt: string;
  excerpt: string;
  content: string[];
  readable: boolean;
  translation?: {
    enabled: boolean;
    requested: boolean;
    cached: boolean;
    translated: boolean;
    model: string;
    target: string;
    failed?: boolean;
    error?: string;
  };
};

type NewsTabId = "headline" | "editor" | "latest";

type ArticleIndexItem = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  cover: string;
  publishedAt: string;
  featured: boolean;
};

const NEWS_API = process.env.NEXT_PUBLIC_NEWS_API_URL || "https://news.20250114.xyz";

const editorTabs = ["体育", "旅游", "文化", "专题"];
const TRAVEL_EDITOR_TAB = "旅游";
const ARTICLE_EDITOR_TAB = editorTabs[3];
const travelGuideFeatures: NewsItem[] = [
  {
    id: "world-cup-travel-top-cities",
    title: "世界杯期间最值得旅行的10座城市",
    summary: "从墨西哥城到纽约，从温哥华到迈阿密，按旅行价值、世界杯氛围和性价比筛出最值得飞去的主办城市。",
    url: "/guides/2026-world-cup-guides/features/top-10-travel-cities.html",
    source: "世界杯城市图册",
    sourceFeed: "Travel Guides",
    language: "zh-CN",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=760&fit=crop",
    tags: ["Travel Cities"],
    publishedAt: "2026-06-07T00:00:00+08:00",
  },
  {
    id: "world-cup-travel-visa-hotels",
    title: "球迷签证、机票、酒店完全指南",
    summary: "把美国、加拿大、墨西哥三国通关顺序，以及航班、住宿和预算拆成可执行的观赛旅行清单。",
    url: "/guides/2026-world-cup-guides/features/visa-travel-guide.html",
    source: "世界杯城市图册",
    sourceFeed: "Travel Guides",
    language: "zh-CN",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=760&fit=crop",
    tags: ["Travel Ops"],
    publishedAt: "2026-06-07T00:00:00+08:00",
  },
  {
    id: "world-cup-travel-route-map",
    title: "跟着世界杯去旅行：跨城路线规划",
    summary: "按小组赛、淘汰赛、半决赛和决赛组织跨城路线，把104场比赛变成一条能出发的旅行计划。",
    url: "/guides/2026-world-cup-guides/features/follow-world-cup.html",
    source: "世界杯城市图册",
    sourceFeed: "Travel Guides",
    language: "zh-CN",
    image: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&h=760&fit=crop",
    tags: ["Routes"],
    publishedAt: "2026-06-07T00:00:00+08:00",
  },
];

const articleFeatureItems: NewsItem[] = (articleIndex as ArticleIndexItem[])
  .filter((article) => article.featured)
  .concat((articleIndex as ArticleIndexItem[]).filter((article) => !article.featured))
  .slice(0, 6)
  .map((article) => ({
    id: `article-${article.slug}`,
    title: article.title,
    summary: article.summary,
    url: `/articles/${article.slug}/`,
    source: "CYBERBALL",
    sourceFeed: article.category || "Articles",
    language: "zh-CN",
    image: article.cover,
    tags: article.tags.length > 0 ? article.tags : [article.category || "Article"],
    publishedAt: article.publishedAt,
  }));

const mobileNewsTabs: { id: NewsTabId; title: string; label: string }[] = [
  { id: "headline", title: "头条新闻", label: "头条" },
  { id: "editor", title: "编辑精选", label: "精选" },
  { id: "latest", title: "最新资讯", label: "最新" },
];

const MOBILE_TOP_MODULE_OFFSET = 66;

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
});

export default function NewsPage() {
  const [payload, setPayload] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [readerItem, setReaderItem] = useState<NewsItem | null>(null);
  const [readerArticle, setReaderArticle] = useState<ArticleResponse | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [readerTranslate, setReaderTranslate] = useState(false);
  const { signedIn } = useUserSession();
  const [activeEditorTab, setActiveEditorTab] = useState("体育");
  const [activeNewsTab, setActiveNewsTab] = useState<NewsTabId>("headline");
  const mobileTabsSentinelRef = useRef<HTMLDivElement>(null);
  const mobileTabsRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const latestRef = useRef<HTMLElement>(null);
  const activeTabFrameRef = useRef<number | null>(null);
  const { pinned: isMobileTabsPinned, height: mobileTabsHeight } = useMobilePinnedRail(
    mobileTabsSentinelRef,
    mobileTabsRef,
    MOBILE_TOP_MODULE_OFFSET,
    "(max-width: 1023px)"
  );

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ limit: "72" });
    return `${NEWS_API}/api/news?${params.toString()}`;
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadNews() {
      setLoading(true);
      try {
        const data = await cachedJson<NewsResponse>(endpoint, 3 * 60 * 1000, async () => {
          const response = await fetchWithTimeout(endpoint, { cache: "no-store" }, 5_000);
          if (!response.ok) throw new Error(`News API returned ${response.status}`);
          return (await response.json()) as NewsResponse;
        }, { persist: true, staleTtlMs: 24 * 60 * 60 * 1000 });
        if (alive) setPayload(data);
      } catch {
        if (alive) setPayload({ updatedAt: null, count: 0, total: 0, errors: [], items: [] });
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadNews();
    return () => { alive = false; };
  }, [endpoint]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 1023px)");

    const syncActiveTab = () => {
      if (!mobileQuery.matches) return;

      const tabsOffset = MOBILE_TOP_MODULE_OFFSET + (mobileTabsRef.current?.offsetHeight ?? 0) + 12;
      const sectionRefs = [
        { id: "headline" as const, ref: headlineRef },
        { id: "editor" as const, ref: editorRef },
        { id: "latest" as const, ref: latestRef },
      ];
      const nextActive = sectionRefs.reduce<NewsTabId>((current, section) => {
        const node = section.ref.current;
        if (!node) return current;
        return node.getBoundingClientRect().top - tabsOffset <= 0 ? section.id : current;
      }, "headline");

      setActiveNewsTab((current) => (current === nextActive ? current : nextActive));
    };

    const scheduleSyncActiveTab = () => {
      if (activeTabFrameRef.current !== null) return;
      activeTabFrameRef.current = window.requestAnimationFrame(() => {
        activeTabFrameRef.current = null;
        syncActiveTab();
      });
    };

    const handleMediaChange = () => {
      syncActiveTab();
    };

    syncActiveTab();
    window.addEventListener("scroll", scheduleSyncActiveTab, { passive: true });
    window.addEventListener("resize", scheduleSyncActiveTab);
    mobileQuery.addEventListener?.("change", handleMediaChange);

    return () => {
      if (activeTabFrameRef.current !== null) window.cancelAnimationFrame(activeTabFrameRef.current);
      window.removeEventListener("scroll", scheduleSyncActiveTab);
      window.removeEventListener("resize", scheduleSyncActiveTab);
      mobileQuery.removeEventListener?.("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: isMobileTabsPinned, height: mobileTabsHeight + 12 } }));
    return () => {
      window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: false } }));
    };
  }, [isMobileTabsPinned, mobileTabsHeight]);

  useEffect(() => {
    if (!readerItem) return;

    const selectedItem = readerItem;
    let alive = true;
    const controller = new AbortController();

    async function loadArticle() {
      setReaderLoading(true);
      setReaderError(null);
      try {
        const params = new URLSearchParams({
          url: selectedItem.url,
          translate: readerTranslate ? "1" : "0",
        });
        const endpoint = `${NEWS_API}/api/news/article?${params.toString()}`;
        const requestTimeoutMs = readerTranslate ? 180_000 : 12_000;
        const loadFromNetwork = async () => {
          const response = await fetchWithTimeout(endpoint, {
            cache: "no-store",
            signal: controller.signal,
          }, requestTimeoutMs);
          const data = (await response.json().catch(() => null)) as (ArticleResponse & { error?: string }) | null;
          if (!response.ok) throw new Error(data?.error || `Article API returned ${response.status}`);
          return data as ArticleResponse & { error?: string };
        };
        const data = readerTranslate
          ? await loadFromNetwork()
          : await cachedJson<ArticleResponse & { error?: string }>(endpoint, 10 * 60 * 1000, loadFromNetwork, { persist: true, staleTtlMs: 24 * 60 * 60 * 1000 });
        if (alive) setReaderArticle(data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (alive) setReaderError(error instanceof Error ? error.message : "article_unavailable");
      } finally {
        if (alive) setReaderLoading(false);
      }
    }

    loadArticle();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [readerItem, readerTranslate]);

  useEffect(() => {
    if (!readerItem) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [readerItem]);

  const items = payload?.items ?? [];
  const itemsWithImages = items.filter((item) => item.image.trim().length > 0);
  const itemsWithoutImages = items.filter((item) => item.image.trim().length === 0);
  const visualItems = [...itemsWithImages, ...itemsWithoutImages];

  const heroItem = visualItems[0];
  const sideItems = visualItems.slice(1, 5);
  const editorItems = visualItems.slice(5, 8);
  const latestItems = visualItems.slice(8, 14);
  const listItems = items.slice(14, 21);
  const featureItems = visualItems.slice(14, 17);
  const activeEditorItems =
    activeEditorTab === TRAVEL_EDITOR_TAB
      ? travelGuideFeatures
      : activeEditorTab === ARTICLE_EDITOR_TAB
        ? articleFeatureItems
        : editorItems;
  const activeEditorOpensReader = activeEditorTab !== TRAVEL_EDITOR_TAB && activeEditorTab !== ARTICLE_EDITOR_TAB;
  const articleTranslationEnabled = Boolean(payload?.features?.articleTranslationEnabled);
  const canTranslateReaderArticle = articleTranslationEnabled && signedIn === true && !isChineseNewsItem(readerItem);

  function openReader(item: NewsItem) {
    setReaderItem(item);
    setReaderArticle(null);
    setReaderError(null);
    setReaderTranslate(false);
  }

  function closeReader() {
    setReaderItem(null);
    setReaderArticle(null);
    setReaderError(null);
    setReaderTranslate(false);
  }

  function scrollToNewsSection(tab: NewsTabId) {
    const sectionRefs = {
      headline: headlineRef,
      editor: editorRef,
      latest: latestRef,
    };
    const target = sectionRefs[tab].current;
    if (!target || !window.matchMedia("(max-width: 1023px)").matches) return;

    setActiveNewsTab(tab);
    const offset = MOBILE_TOP_MODULE_OFFSET + (mobileTabsRef.current?.offsetHeight ?? 0) + 12;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    });
  }

  return (
    <DashboardShell>
      <div className="news-page">
        <div
          ref={mobileTabsSentinelRef}
          className="lg:hidden"
          style={{ height: isMobileTabsPinned ? mobileTabsHeight : 0 }}
        />
      <nav
        ref={mobileTabsRef}
        className={`${
          isMobileTabsPinned
            ? "news-tabs-rail match-tabs-rail fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+4.125rem)] z-[75] px-3 py-2"
            : "news-tabs-rail match-tabs-rail relative -mx-3 mt-4 px-3 py-2"
        } lg:hidden`}
        aria-label="新闻分类"
      >
        <div className="scrollbar-hidden flex flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain" role="tablist" aria-label="新闻分类">
          {mobileNewsTabs.map((tab) => {
            const isActive = tab.id === activeNewsTab;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`${tab.title}：${tab.label}`}
                onClick={() => scrollToNewsSection(tab.id)}
                className={`relative shrink-0 overflow-hidden whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ${
                  isActive
                    ? "text-black"
                    : "bg-white/[0.045] text-white/58 ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="news-mobile-tab-pill"
                    className="absolute inset-0 rounded-full bg-volt shadow-[0_0_26px_rgba(216,255,62,.2)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── TOP NEWS: Hero + Side Stories ── */}
      <section ref={headlineRef} className="mt-3 scroll-mt-24 sm:mt-6">
        <SectionHeader title="头条新闻" hideOnMobile />

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="hero-card overflow-hidden">
              <div className="h-[400px] animate-pulse bg-white/[0.055]" />
            </div>
            <div className="flex flex-col gap-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 border-b border-white/[0.04] py-3 last:border-b-0">
                  <div className="h-20 w-28 shrink-0 animate-pulse rounded bg-white/[0.055]" />
                  <div className="flex flex-1 flex-col gap-2 py-1">
                    <div className="h-2.5 w-16 rounded-full bg-white/[0.06]" />
                    <div className="h-3.5 w-full rounded-full bg-white/[0.08]" />
                    <div className="h-3 w-3/4 rounded-full bg-white/[0.06]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : heroItem ? (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            {/* Hero image */}
            <a
              href={heroItem.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                event.preventDefault();
                openReader(heroItem);
              }}
              className="news-hero-card hero-card group relative min-h-[400px] overflow-hidden bg-white/[0.035] transition-all duration-300 hover:-translate-y-1"
            >
              <NewsImage
                src={heroItem.image}
                imageClassName="block h-[400px] w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                fallbackClassName="flex h-[400px] items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(216,255,62,0.16),transparent_36%)]"
                iconClassName="h-12 w-12 text-volt/50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="mb-3 inline-block rounded-full bg-volt/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-black">
                  {heroItem.tags[0]?.replaceAll("-", " ") || "World Cup"}
                </span>
                <h2 className="text-2xl font-semibold leading-snug text-white sm:text-3xl">
                  {heroItem.title}
                </h2>
                <p className="mt-2 max-w-xl text-sm text-white/65 line-clamp-2">
                  {heroItem.summary}
                </p>
                <div className="mt-3 flex items-center gap-3 text-[11px] text-white/45">
                  <span>{heroItem.source}</span>
                  <span>&middot;</span>
                  <span>{dateFormatter.format(new Date(heroItem.publishedAt))}</span>
                </div>
              </div>
            </a>

            {/* Side stories */}
            <div className="news-side-list flex flex-col">
              {sideItems.map((item, idx) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    event.preventDefault();
                    openReader(item);
                  }}
                  className="group flex gap-3.5 border-b border-white/[0.04] py-3.5 transition-colors hover:bg-white/[0.02] last:border-b-0"
                >
                  <NewsImage
                    src={item.image}
                    imageClassName="h-20 w-28 shrink-0 rounded object-cover opacity-75 transition group-hover:opacity-100"
                    fallbackClassName="flex h-20 w-28 shrink-0 items-center justify-center rounded bg-white/[0.04]"
                    iconClassName="h-5 w-5 text-white/20"
                  />
                  <div className="flex flex-1 flex-col justify-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-volt/70">
                      {item.tags[0]?.replaceAll("-", " ") || "News"}
                    </span>
                    <h3 className="text-sm font-medium leading-snug text-white/90 transition group-hover:text-volt line-clamp-2">
                      {item.title}
                    </h3>
                    <span className="text-[11px] text-white/35">
                      {item.source} &middot; {dateFormatter.format(new Date(item.publishedAt))}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </section>

      {/* ── EDITOR'S CHOICE ── */}
      {(editorItems.length > 0 || travelGuideFeatures.length > 0 || articleFeatureItems.length > 0) && (
        <section ref={editorRef} className="mt-4 scroll-mt-24 sm:mt-8">
          <SectionHeader title="编辑精选" hideOnMobile />

          {/* Tabs */}
          <div className="mb-5 flex gap-1">
            {editorTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveEditorTab(tab)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                  activeEditorTab === tab
                    ? "bg-volt/15 text-volt ring-1 ring-volt/30"
                    : "text-white/40 hover:text-white/65"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {activeEditorItems.map((item) => (
              <EditorChoiceCard
                key={item.id}
                item={item}
                onOpen={activeEditorOpensReader ? openReader : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── LATEST NEWS Grid ── */}
      {latestItems.length > 0 && (
        <section ref={latestRef} className="mt-8 scroll-mt-24">
          <SectionHeader title="最新资讯" actionLabel="查看更多" hideOnMobile />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {latestItems.map((item, index) => (
              <NewsCard key={`${item.id}-${item.url}`} item={item} index={index} onOpen={openReader} />
            ))}
          </div>
        </section>
      )}

      {/* ── World Cup Updates: Sidebar List ── */}
      <section className="mt-8 grid gap-5 lg:grid-cols-[0.4fr_1fr]">
        {/* Left intro */}
        <div className="news-text-card hero-card flex flex-col justify-center p-6">
          <h2 className="text-2xl font-bold tracking-wide text-white uppercase">World Cup</h2>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Stay informed with the latest updates on FIFA World Cup 2026. From match schedules to host city preparations.
          </p>
          <button className="mt-5 flex w-fit items-center gap-2 rounded-full bg-volt/15 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-volt ring-1 ring-volt/30 transition hover:bg-volt/25">
            View More
          </button>
        </div>

        {/* Right list */}
        <div className="news-update-list hero-card divide-y divide-white/[0.04] overflow-hidden">
          {(listItems.length > 0 ? listItems : items.slice(0, 7)).map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                event.preventDefault();
                openReader(item);
              }}
              className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.03]"
            >
              <span className="w-12 shrink-0 text-xs font-bold text-volt/60 tabular">
                {timeFormatter.format(new Date(item.publishedAt))}
              </span>
              <span className="flex-1 text-sm text-white/75 transition group-hover:text-white line-clamp-1">
                {item.title}
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/20 transition group-hover:text-volt" />
            </a>
          ))}
        </div>
      </section>

      {/* ── Bottom Feature Grid ── */}
      {featureItems.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="文艺 / 旅游" actionLabel="全部资讯" />

          <div className="grid gap-4 md:grid-cols-3">
            {featureItems.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  event.preventDefault();
                  openReader(item);
                }}
                className="news-text-card hero-card group overflow-hidden transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-48 overflow-hidden">
                  <NewsImage
                    src={item.image}
                    imageClassName="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                    fallbackClassName="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(216,255,62,0.12),transparent_36%)]"
                    iconClassName="h-8 w-8 text-volt/40"
                  />
                </div>
                <div className="p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-volt/70">
                    {item.tags[0]?.replaceAll("-", " ") || "Feature"}
                  </span>
                  <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-white transition group-hover:text-volt line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-white/35">
                    <span>{item.source}</span>
                    <span>{dateFormatter.format(new Date(item.publishedAt))}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
        <NewsReader
          item={readerItem}
          article={readerArticle}
          loading={readerLoading}
          error={readerError}
          translate={readerTranslate}
          canTranslate={canTranslateReaderArticle}
          onTranslate={() => setReaderTranslate(true)}
          onClose={closeReader}
        />
      </div>
    </DashboardShell>
  );
}

/* ── Shared Components ── */

function SectionHeader({ title, actionLabel, hideOnMobile = false }: { title: string; actionLabel?: string; hideOnMobile?: boolean }) {
  return (
    <div className={`${hideOnMobile ? "mb-5 hidden items-baseline justify-between sm:flex" : "mb-5 flex items-baseline justify-between"}`}>
      <h2 className="text-lg font-bold text-white sm:text-xl">
        {title}
      </h2>
      {actionLabel && (
        <span className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em] text-volt/60 transition hover:text-volt">
          {actionLabel}
        </span>
      )}
    </div>
  );
}

function EditorChoiceCard({ item, onOpen }: { item: NewsItem; onOpen?: (item: NewsItem) => void }) {
  return (
    <a
      href={item.url}
      target={onOpen ? "_blank" : undefined}
      rel={onOpen ? "noreferrer" : undefined}
      onClick={(event) => {
        if (!onOpen) return;
        event.preventDefault();
        onOpen(item);
      }}
      className="news-text-card hero-card group overflow-hidden transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-44 overflow-hidden">
        <NewsImage
          src={item.image}
          imageClassName="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          fallbackClassName="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(216,255,62,0.12),transparent_36%)]"
          iconClassName="h-8 w-8 text-volt/40"
        />
      </div>
      <div className="p-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-volt/70">
          {item.tags[0]?.replaceAll("-", " ") || "Feature"}
        </span>
        <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-white transition group-hover:text-volt line-clamp-2">
          {item.title}
        </h3>
        <p className="mt-2 text-xs leading-5 text-white/45 line-clamp-2">
          {item.summary}
        </p>
      </div>
    </a>
  );
}

function NewsImage({
  src,
  imageClassName,
  fallbackClassName,
  iconClassName,
}: {
  src: string;
  imageClassName: string;
  fallbackClassName: string;
  iconClassName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    setFailed(false);
    setShouldLoad(false);
  }, [src]);

  useEffect(() => {
    if (!src.trim() || failed || shouldLoad) return;

    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "360px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [failed, shouldLoad, src]);

  if (!src.trim() || failed) {
    return (
      <div ref={containerRef} className={fallbackClassName}>
        <Newspaper className={iconClassName} />
      </div>
    );
  }

  if (!shouldLoad) {
    return <div ref={containerRef} className={`${fallbackClassName} animate-pulse`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={imageClassName}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function NewsCard({ item, index, onOpen }: { item: NewsItem; index: number; onOpen: (item: NewsItem) => void }) {
  const published = dateFormatter.format(new Date(item.publishedAt));
  const firstTag = item.tags[0]?.replaceAll("-", " ") ?? "world cup";

  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => {
        event.preventDefault();
        onOpen(item);
      }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.36 }}
      className="news-text-card hero-card group flex min-h-[240px] flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-36 overflow-hidden bg-white/[0.035]">
        <NewsImage
          src={item.image}
          imageClassName="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          fallbackClassName="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(216,255,62,0.16),transparent_36%)]"
          iconClassName="h-8 w-8 text-volt/60"
        />
        <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-volt backdrop-blur-xl">
          {firstTag}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-white/35">
          <span className="truncate">{item.source}</span>
          <span className="shrink-0 tabular">{published}</span>
        </div>
        <h3 className="text-sm font-semibold leading-snug text-white transition group-hover:text-volt line-clamp-2">
          {item.title}
        </h3>
        <p className="text-xs leading-5 text-white/45 line-clamp-2">{item.summary}</p>
        <div className="mt-auto flex items-center justify-between border-t border-white/[0.04] pt-2">
          <span className="truncate text-[11px] text-white/28">{item.sourceFeed}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/25 transition group-hover:text-volt" />
        </div>
      </div>
    </motion.a>
  );
}

function isChineseNewsItem(item: NewsItem | null) {
  if (!item) return false;

  const language = item.language.trim().toLowerCase();
  if (language.startsWith("zh") || language === "cn" || language.includes("chinese")) return true;

  return /[\u3400-\u9fff]/.test(`${item.source} ${item.sourceFeed}`);
}

function NewsReader({
  item,
  article,
  loading,
  error,
  translate,
  canTranslate,
  onTranslate,
  onClose,
}: {
  item: NewsItem | null;
  article: ArticleResponse | null;
  loading: boolean;
  error: string | null;
  translate: boolean;
  canTranslate: boolean;
  onTranslate: () => void;
  onClose: () => void;
}) {
  if (!item) return null;

  const title = article?.title || item.title;
  const source = article?.source || item.source;
  const publishedAt = article?.publishedAt || item.publishedAt;
  const content = article?.content?.length ? article.content : [];
  const image = article?.image || item.image;
  const showTranslateButton = canTranslate && !translate && article?.translation?.enabled && !article.translation.translated;

  const reader = (
    <div className="news-reader-backdrop fixed inset-0 z-[1000000] isolate box-border bg-black/72 p-3 backdrop-blur-2xl sm:p-6" role="dialog" aria-modal="true">
      <div className="news-reader-panel mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[#050708]/[0.94] shadow-[0_30px_120px_rgba(0,0,0,.62)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-volt/70">{source}</div>
            <div className="mt-1 truncate text-xs text-white/38">{dateFormatter.format(new Date(publishedAt))}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showTranslateButton && (
              <button
                type="button"
                onClick={onTranslate}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-volt/12 px-3 text-xs font-semibold text-volt ring-1 ring-volt/25 transition hover:bg-volt hover:text-black"
              >
                <Languages className="h-4 w-4" />
                翻译正文
              </button>
            )}
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-white/[0.06] px-3 text-xs font-semibold text-white/70 ring-1 ring-white/[0.1] transition hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              原文
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/70 ring-1 ring-white/[0.1] transition hover:bg-white/[0.1] hover:text-white"
              aria-label="关闭阅读器"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {image && (
            <div className="relative h-56 overflow-hidden bg-white/[0.035] sm:h-72">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-full w-full object-cover opacity-75" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050708] via-transparent to-transparent" />
            </div>
          )}

          <article className="mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-4 flex flex-wrap gap-2">
              {(item.tags || []).slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45 ring-1 ring-white/[0.08]">
                  {tag.replaceAll("-", " ")}
                </span>
              ))}
            </div>

            <h1 className="text-2xl font-semibold leading-tight text-white sm:text-4xl">{title}</h1>
            {(article?.excerpt || item.summary) && (
              <p className="mt-4 text-sm leading-7 text-white/55 sm:text-base">{article?.excerpt || item.summary}</p>
            )}

            {article?.translation?.failed && (
              <div className="mt-5 rounded-3xl bg-flare/10 p-4 text-sm leading-6 text-white/62 ring-1 ring-flare/25">
                正文已解析成功，但本次翻译返回格式异常，已先显示原文内容。
              </div>
            )}

            {loading && (
              <div className="mt-10 flex items-center gap-3 rounded-3xl bg-white/[0.045] p-5 text-sm text-white/55 ring-1 ring-white/[0.08]">
                <Loader2 className="h-5 w-5 animate-spin text-volt" />
                {translate ? "AI努力翻译中" : "正在解析正文"}
              </div>
            )}

            {error && !loading && (
              <div className="mt-10 rounded-3xl bg-white/[0.045] p-5 text-sm leading-6 text-white/55 ring-1 ring-white/[0.08]">
                正文解析失败，已保留摘要和原文入口。错误：{error}
              </div>
            )}

            {!loading && !error && content.length > 0 && (
              <div className="mt-8 space-y-5 text-[15px] leading-8 text-white/72">
                {content.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
                ))}
              </div>
            )}

            {!loading && !error && article && content.length === 0 && (
              <div className="mt-10 rounded-3xl bg-white/[0.045] p-5 text-sm leading-6 text-white/55 ring-1 ring-white/[0.08]">
                这篇文章暂时只能解析到摘要，完整内容可从右上角打开原文查看。
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );

  return createPortal(reader, document.body);
}

function EmptyState() {
  return (
    <div className="hero-card col-span-full flex min-h-[300px] flex-col items-center justify-center gap-5 p-8 text-center">
      <Newspaper className="h-12 w-12 text-white/15" />
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.3em] text-volt/60 font-medium">
          No Results
        </h3>
        <p className="text-sm text-white/45 max-w-sm">
          未检索到匹配信号。请尝试调整筛选标签或检索词重新搜索。
        </p>
      </div>
    </div>
  );
}
