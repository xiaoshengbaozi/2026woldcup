import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "赛波 CYBERBALL - 2026世界杯看球伴侣",
    short_name: "赛波",
    description:
      "2026世界杯实时赛事、AI预测、全球新闻、球队档案与数据可视化看球伴侣。",
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05070f",
    theme_color: "#05070f",
    categories: ["sports", "news", "entertainment"],
    lang: "zh-CN",
    dir: "ltr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ],
    shortcuts: [
      {
        name: "实时赛况",
        short_name: "赛况",
        description: "打开实时比赛与市场看板",
        url: "/live/?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "赛程",
        short_name: "赛程",
        description: "查看2026世界杯赛程",
        url: "/matches/?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "我的关注",
        short_name: "关注",
        description: "查看关注球队、球员和比赛",
        url: "/me/?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      }
    ]
  };
}
