"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Newspaper } from "lucide-react";
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

const editorTabs = ["体育", "旅游", "文化", "专题"];

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
});

export default function NewsPage() {
  const [payload, setPayload] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeEditorTab, setActiveEditorTab] = useState("体育");

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ limit: "72" });
    return `${NEWS_API}/api/news?${params.toString()}`;
  }, []);

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
    return () => { alive = false; };
  }, [endpoint]);

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

  return (
    <DashboardShell>
      {/* ── TOP NEWS: Hero + Side Stories ── */}
      <section className="mt-6">
        <SectionHeader title="头条新闻" />

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
              className="hero-card group relative overflow-hidden transition-all duration-300 hover:-translate-y-1"
            >
              <NewsImage
                src={heroItem.image}
                imageClassName="h-[400px] w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
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
            <div className="flex flex-col">
              {sideItems.map((item, idx) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
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
      {editorItems.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="编辑精选" />

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
            {editorItems.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="hero-card group overflow-hidden transition-all duration-300 hover:-translate-y-1"
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
            ))}
          </div>
        </section>
      )}

      {/* ── LATEST NEWS Grid ── */}
      {latestItems.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="最新资讯" actionLabel="查看更多" />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {latestItems.map((item, index) => (
              <NewsCard key={`${item.id}-${item.url}`} item={item} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* ── World Cup Updates: Sidebar List ── */}
      <section className="mt-8 grid gap-5 lg:grid-cols-[0.4fr_1fr]">
        {/* Left intro */}
        <div className="hero-card flex flex-col justify-center p-6">
          <h2 className="text-2xl font-bold tracking-wide text-white uppercase">World Cup</h2>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Stay informed with the latest updates on FIFA World Cup 2026. From match schedules to host city preparations.
          </p>
          <button className="mt-5 flex w-fit items-center gap-2 rounded-full bg-volt/15 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-volt ring-1 ring-volt/30 transition hover:bg-volt/25">
            View More
          </button>
        </div>

        {/* Right list */}
        <div className="hero-card divide-y divide-white/[0.04] overflow-hidden">
          {(listItems.length > 0 ? listItems : items.slice(0, 7)).map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
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
                className="hero-card group overflow-hidden transition-all duration-300 hover:-translate-y-1"
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
    </DashboardShell>
  );
}

/* ── Shared Components ── */

function SectionHeader({ title, actionLabel }: { title: string; actionLabel?: string }) {
  return (
    <div className="mb-5 flex items-baseline justify-between">
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
      className="hero-card group flex min-h-[240px] flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1"
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
