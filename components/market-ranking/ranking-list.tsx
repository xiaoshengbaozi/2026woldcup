"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { RankingRow } from "./ranking-row";

export function RankingList() {
  const rankings = useStore((s) => s.rankings);
  const squeezePairs = useStore((s) => s.squeezePairs);

  const squeezeNextMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const pair of squeezePairs) {
      map.set(pair.countryA, pair.countryB);
    }
    return map;
  }, [squeezePairs]);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      {rankings.map((entry) => (
        <RankingRow
          key={entry.countryCode}
          entry={entry}
          isSqueezed={squeezeNextMap.has(entry.countryCode)}
        />
      ))}
    </div>
  );
}
