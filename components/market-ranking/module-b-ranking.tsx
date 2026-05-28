"use client";

import { RankingHeader } from "./ranking-header";
import { RankingList } from "./ranking-list";
import { RankingFooter } from "./ranking-footer";

export function ModuleB_Ranking() {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      <RankingHeader />
      <RankingList />
      <RankingFooter />
    </div>
  );
}
