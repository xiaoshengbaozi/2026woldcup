"use client";

import { useEffect, useState } from "react";

export type NewsItem = {
  tag: string;
  title: string;
  href: string;
  thumbnail: string;
  date: string;
};

const fallbackNews: NewsItem[] = [
  {
    tag: "荷兰",
    title: "邓弗里斯：荷兰的目标是成为世界冠军",
    href: "https://www.fifa.com/tournaments/mens/worldcup/canadamexicousa2026",
    thumbnail: "https://flagcdn.com/w160/nl.png",
    date: "2 小时前"
  },
  {
    tag: "西班牙",
    title: "亚马尔：西班牙踢着最好的足球",
    href: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
    thumbnail: "https://flagcdn.com/w160/es.png",
    date: "5 小时前"
  },
  {
    tag: "巴西",
    title: "达尼洛：我能帮助巴西渡过困难时期",
    href: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
    thumbnail: "https://flagcdn.com/w160/br.png",
    date: "1 天前"
  },
  {
    tag: "赛程",
    title: "最新赛程公布比赛场馆与开球时间",
    href: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/updated-fifa-world-cup-2026-match-schedule-now-available",
    thumbnail: "",
    date: "2 天前"
  }
];

export function useFifaNews() {
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // When a live news source becomes available (e.g. FIFA RSS / NewsAPI),
    // fetch here and call setNews with the result.
    // Falls back to static data if the fetch fails or is unavailable.
    //
    // Example integration:
    //
    //   fetch("https://api.rss2json.com/v1/api.json?rss_url=...")
    //     .then((res) => res.json())
    //     .then((data) => {
    //       const items: NewsItem[] = data.items.slice(0, 4).map(
    //         (item: { title: string; link: string; categories: string[] }) => ({
    //           tag: item.categories?.[0] ?? "FIFA",
    //           title: item.title,
    //           href: item.link
    //         })
    //       );
    //       setNews(items);
    //     })
    //     .catch(() => { /* keep fallback */ })
    //     .finally(() => setLoading(false));
  }, []);

  return { news, loading };
}
