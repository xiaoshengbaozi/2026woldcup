"use client";

import { useStore } from "@/lib/store";
import { Globe, Map } from "lucide-react";

type Projection = "mercator" | "orthographic";

export function MapHeader({
  projection,
  setProjection,
}: {
  projection: Projection;
  setProjection: (p: Projection) => void;
}) {
  const status = useStore((s) => s.status);
  const isConnected = status === "connected";

  return (
    <div className="flex items-center justify-between px-5 pb-3 border-b border-white/[0.04] bg-[rgba(5,8,8,0.92)]">
      <div className="flex items-center gap-2">
        {projection === "mercator" ? (
          <Map className="h-4 w-4 text-volt" />
        ) : (
          <Globe className="h-4 w-4 text-volt" />
        )}
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
          概率地图
        </h3>
      </div>

      <div className="flex items-center gap-2">
        {([
          { key: "mercator" as const, label: "平面", icon: Map, tip: "标准墨卡托投影" },
          { key: "orthographic" as const, label: "球体", icon: Globe, tip: "3D 地球视图，可拖拽旋转" },
        ]).map(({ key, label, icon: Icon, tip }) => (
          <button
            key={key}
            onClick={() => setProjection(key)}
            title={tip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] transition-all duration-200"
            style={{
              background: projection === key ? "rgba(216,255,62,0.12)" : "rgba(255,255,255,0.03)",
              color: projection === key ? "#d8ff3e" : "rgba(255,255,255,0.4)",
              border: projection === key ? "1px solid rgba(216,255,62,0.25)" : "1px solid transparent",
              boxShadow: projection === key ? "0 0 12px rgba(216,255,62,0.1)" : "none",
            }}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
