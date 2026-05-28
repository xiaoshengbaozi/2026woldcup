"use client";

import { useStore } from "@/lib/store";
import { formatRelativeTime } from "@/lib/format";

export function RankingFooter() {
  const lastUpdate = useStore((s) => s.lastUpdateTimestamp);
  const updateCount = useStore((s) => s.updateCount);
  const latency = useStore((s) => s.latency);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.04] text-[10px] uppercase tracking-[0.08em] text-white/32">
      <span>
        {lastUpdate ? `更新于 ${formatRelativeTime(lastUpdate)}` : "等待数据..."}
      </span>
      <span>#{updateCount} · {latency.toFixed(0)}ms</span>
    </div>
  );
}
