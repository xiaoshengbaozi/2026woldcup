"use client";

import { useEffect, useState } from "react";

export type NewsItem = {
  id: string;
  tag: string;
  title: string;
  href: string;
  thumbnail: string;
  date: string;
  source: string;
};

const fallbackNews: NewsItem[] = [
  {
    id: "fallback-netherlands",
    tag: "荷兰",
    title: "邓弗里斯：荷兰的目标是成为世界冠军",
    href: "https://www.fifa.com/tournaments/mens/worldcup/canadamexicousa2026",
    thumbnail: "https://flagcdn.com/w160/nl.png",
    date: "2 小时前",
    source: "FIFA"
  },
  {
    id: "fallback-spain",
    tag: "西班牙",
    title: "亚马尔：西班牙踢着最好的足球",
    href: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
    thumbnail: "https://flagcdn.com/w160/es.png",
    date: "5 小时前",
    source: "FIFA"
  },
  {
    id: "fallback-brazil",
    tag: "巴西",
    title: "达尼洛：我能帮助巴西渡过困难时期",
    href: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
    thumbnail: "https://flagcdn.com/w160/br.png",
    date: "1 天前",
    source: "FIFA"
  },
  {
    id: "fallback-schedule",
    tag: "赛程",
    title: "最新赛程公布比赛场馆与开球时间",
    href: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/updated-fifa-world-cup-2026-match-schedule-now-available",
    thumbnail: "",
    date: "2 天前",
    source: "FIFA"
  }
];

type AggregatedNewsItem = {
  id?: string;
  title?: string;
  url?: string;
  source?: string;
  sourceFeed?: string;
  image?: string;
  tags?: string[];
  publishedAt?: string;
};

type AggregatedNewsResponse = {
  items?: AggregatedNewsItem[];
};

const NEWS_API = process.env.NEXT_PUBLIC_NEWS_API_URL || "https://news.20250114.xyz";
const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

function formatRelativeTime(value?: string) {
  if (!value) return "刚刚更新";

  const publishedAt = new Date(value).getTime();
  if (Number.isNaN(publishedAt)) return "刚刚更新";

  const diffMs = Math.max(0, Date.now() - publishedAt);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric"
  }).format(new Date(publishedAt));
}

function formatTag(item: AggregatedNewsItem) {
  const preferredTag = item.tags?.find((tag) => !["rsshub", "google-discovery", "world-cup-2026"].includes(tag));
  const rawTag = preferredTag || item.sourceFeed || item.source || "World Cup";
  return rawTag.replaceAll("-", " ");
}

function mapNewsItem(item: AggregatedNewsItem, index: number): NewsItem {
  return {
    id: item.id || `${item.url || item.title || "news"}-${index}`,
    tag: formatTag(item),
    title: item.title || "世界杯最新动态",
    href: item.url || "/news",
    thumbnail: item.image || "",
    date: formatRelativeTime(item.publishedAt),
    source: item.source || item.sourceFeed || "News"
  };
}

export function useFifaNews() {
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function loadNews() {
      try {
        const params = new URLSearchParams({ limit: "4" });
        const response = await fetch(`${NEWS_API}/api/news?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) throw new Error(`News API returned ${response.status}`);

        const data = (await response.json()) as AggregatedNewsResponse;
        const items = (data.items ?? []).slice(0, 4).map(mapNewsItem);

        if (alive && items.length) setNews(items);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadNews();
    const timer = window.setInterval(loadNews, REFRESH_INTERVAL_MS);

    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  return { news, loading };
}
