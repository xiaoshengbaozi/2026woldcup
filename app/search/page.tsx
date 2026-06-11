import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchClient } from "./search-client";

export const metadata: Metadata = {
  title: "全局搜索 | 2026 世界杯",
  description: "搜索球队、球员、赛程与世界杯新闻。",
};

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchClient />
    </Suspense>
  );
}
