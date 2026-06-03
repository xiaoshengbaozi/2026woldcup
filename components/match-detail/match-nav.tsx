"use client";

export type MatchTab = "lineup" | "odds" | "timeline" | "stats" | "h2h";

const NAV_ITEMS: { id: MatchTab; label: string }[] = [
  { id: "lineup", label: "阵容" },
  { id: "odds", label: "赔率" },
  { id: "timeline", label: "事件" },
  { id: "stats", label: "统计" },
  { id: "h2h", label: "交锋" },
];

export function MatchNav({
  active,
  onTabChange,
}: {
  active: MatchTab;
  onTabChange: (tab: MatchTab) => void;
}) {
  return (
    <div className="mb-5 px-1">
      <div
        className="flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="比赛详情"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(item.id)}
              className={`group relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-left text-xs font-bold transition duration-300 sm:px-3.5 sm:py-2 sm:text-sm ${
                isActive
                  ? "bg-volt text-black shadow-[0_0_24px_rgba(216,255,62,.2)]"
                : "bg-white/[0.055] text-white/62 ring-1 ring-white/[0.08] hover:bg-white/[0.09] hover:text-white"
              }`}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
