"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Clock, GitFork, Grid3X3, Layers, LayoutList, MapPin, Search } from "lucide-react";
import { ComponentType, useEffect, useMemo, useRef, useState } from "react";
import type { ScheduleLayout } from "@/app/matches/page";

type Timezone = {
  label: string;
  offset: number;
};

const timezones: Timezone[] = [
  { label: "北京 UTC+8", offset: 0 },
  { label: "美东 UTC-4", offset: -12 },
  { label: "美中 UTC-5", offset: -13 },
  { label: "美西 UTC-7", offset: -15 },
  { label: "墨城 UTC-6", offset: -14 },
];

type MatchFiltersProps = {
  query: string;
  stage: string;
  stages: string[];
  activeCity: string;
  cities: string[];
  timezoneOffset: number;
  layout: ScheduleLayout;
  onQueryChange: (value: string) => void;
  onStageChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onTimezoneChange: (offset: number) => void;
  onLayoutChange: (layout: ScheduleLayout) => void;
};

type FilterOption = {
  label: string;
  value: string;
  meta?: string;
  group?: string;
};

export const FILTER_GROUP_PREFIX = "__filter_group__:";

export function makeFilterGroupValue(group: string) {
  return `${FILTER_GROUP_PREFIX}${group}`;
}

export function readFilterGroupValue(value: string) {
  return value.startsWith(FILTER_GROUP_PREFIX) ? value.slice(FILTER_GROUP_PREFIX.length) : "";
}

export function getStageFilterGroup(stage: string) {
  if (/Group\s+[A-L]/i.test(stage)) return "小组赛";
  if (stage.includes("1/16") || stage.includes("1/8") || stage.includes("1/4")) return "淘汰赛";
  if (stage.includes("半决赛") || stage.includes("决赛")) return "决赛周";
  return "赛段";
}

export function getCityFilterGroup(city: string) {
  const mexicoCities = ["Mexico City", "Guadalajara", "Monterrey", "墨西哥城", "瓜达拉哈拉", "蒙特雷"];
  const canadaCities = ["Toronto", "Vancouver", "多伦多", "温哥华"];
  if (mexicoCities.includes(city)) return "墨西哥";
  if (canadaCities.includes(city)) return "加拿大";
  return "美国";
}

function formatStageLabel(stage: string): string {
  const groupMatch = stage.match(/Group\s+([A-L])/i);
  if (groupMatch) return `小组赛 ${groupMatch[1]}组`;
  return stage;
}

function stageRank(stage: string) {
  const group = stage.match(/Group ([A-L])$/);
  if (group) return group[1].charCodeAt(0) - 64;
  if (stage.includes("1/16")) return 13;
  if (stage.includes("1/8")) return 14;
  if (stage.includes("1/4")) return 15;
  if (stage.includes("半决赛")) return 16;
  if (stage.includes("决赛")) return 17;
  return 99;
}

function sortStages(stages: string[]): string[] {
  return [...stages].sort((a, b) => stageRank(a) - stageRank(b));
}

export function MatchFilters({
  query,
  stage,
  stages,
  activeCity,
  cities,
  timezoneOffset,
  layout,
  onQueryChange,
  onStageChange,
  onCityChange,
  onTimezoneChange,
  onLayoutChange
}: MatchFiltersProps) {
  const sorted = sortStages(stages);
  const stageOptions = useMemo(
    () => sorted.map((item) => ({
      label: formatStageLabel(item),
      value: item,
      group: getStageFilterGroup(item)
    })),
    [sorted]
  );
  const cityOptions = useMemo(
    () => cities.filter((city) => city !== "全部城市").map((city) => ({
      label: city,
      value: city,
      group: getCityFilterGroup(city)
    })),
    [cities]
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.65 }}
      className="relative z-20 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3"
    >
      <label className="glass-chip flex h-10 w-full items-center gap-3 px-5 text-white/70 transition focus-within:text-white sm:flex-1">
        <Search className="h-5 w-5 shrink-0 text-volt/80" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索球队、场馆、城市或比赛"
          className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/35"
        />
      </label>

      <div className="hidden sm:block">
        <LayoutToggle layout={layout} onChange={onLayoutChange} />
      </div>

      <div className="grid grid-cols-3 gap-3 sm:flex sm:gap-3">
        <FilterDropdown
          icon={Clock}
          value={String(timezoneOffset)}
          fallbackLabel="时区"
          options={timezones.map((timezone) => ({
            label: timezone.label,
            value: String(timezone.offset),
            meta: timezone.label.split(" ")[0]
          }))}
          compactLabel={(option) => option?.meta ?? "时区"}
          onChange={(nextValue) => onTimezoneChange(Number(nextValue))}
        />
        <FilterDropdown
          icon={Layers}
          value={stage}
          fallbackLabel="赛段"
          allLabel="全部赛段"
          options={stageOptions}
          onChange={onStageChange}
          grouped
        />
        <FilterDropdown
          icon={MapPin}
          value={activeCity === "全部城市" ? "" : activeCity}
          fallbackLabel="城市"
          allLabel="全部城市"
          options={cityOptions}
          onChange={(nextValue) => onCityChange(nextValue || "全部城市")}
          grouped
        />
      </div>
    </motion.section>
  );
}

function LayoutToggle({
  layout,
  onChange
}: {
  layout: ScheduleLayout;
  onChange: (layout: ScheduleLayout) => void;
}) {
  return (
    <div className="glass-chip flex shrink-0 items-center overflow-hidden p-1">
      <button
        type="button"
        onClick={() => onChange("default")}
        aria-label="默认布局"
        title="默认布局"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all duration-150 ${
          layout === "default"
            ? "bg-volt/10 text-volt ring-1 ring-volt/25"
            : "text-white/50 hover:text-white/70"
        }`}
      >
        <LayoutList className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("waterfall")}
        aria-label="瀑布流布局"
        title="瀑布流布局"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all duration-150 ${
          layout === "waterfall"
            ? "bg-volt/10 text-volt ring-1 ring-volt/25"
            : "text-white/50 hover:text-white/70"
        }`}
      >
        <Grid3X3 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("topology")}
        aria-label="拓扑图布局"
        title="拓扑图布局"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all duration-150 ${
          layout === "topology"
            ? "bg-volt/10 text-volt ring-1 ring-volt/25"
            : "text-white/50 hover:text-white/70"
        }`}
      >
        <GitFork className="h-4 w-4" />
      </button>
    </div>
  );
}

function useDropdownClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return ref;
}

function FilterDropdown({
  icon: Icon,
  value,
  fallbackLabel,
  allLabel,
  options,
  grouped = false,
  compactLabel,
  onChange
}: {
  icon: ComponentType<{ className?: string }>;
  value: string;
  fallbackLabel: string;
  allLabel?: string;
  options: FilterOption[];
  grouped?: boolean;
  compactLabel?: (option?: FilterOption) => string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const ref = useDropdownClose(open, () => setOpen(false));

  useEffect(() => {
    if (!open) setExpandedGroups({});
  }, [open]);

  const selected = options.find((option) => option.value === value);
  const selectedGroup = readFilterGroupValue(value);
  const label = selectedGroup || (compactLabel ? compactLabel(selected) : selected?.label ?? fallbackLabel);
  const groupedOptions = options.reduce<Record<string, FilterOption[]>>((acc, option) => {
    const group = option.group ?? "选项";
    acc[group] = [...(acc[group] ?? []), option];
    return acc;
  }, {});
  const groupEntries = Object.entries(groupedOptions);

  return (
    <div ref={ref} className="relative min-w-0 sm:min-w-[150px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`glass-chip flex h-10 w-full items-center justify-between gap-1.5 px-3 text-left transition sm:gap-2 sm:px-5 ${
          open ? "text-volt ring-1 ring-volt/25" : "text-white/78 hover:text-white"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 text-volt/80" />
        <span className="truncate text-xs">{label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="关闭筛选器"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/52 backdrop-blur-md sm:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 flex h-[54dvh] min-h-[20rem] flex-col overflow-hidden rounded-t-[2rem] bg-black/82 shadow-[0_-28px_90px_rgba(0,0,0,.72),0_0_0_1px_rgba(255,255,255,.09),0_0_48px_rgba(216,255,62,.08)] backdrop-blur-2xl sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:h-auto sm:min-h-0 sm:w-40 sm:rounded-[1.35rem]"
            >
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-volt/35 to-transparent" />
              <div className="flex shrink-0 items-center justify-center px-5 pb-2 pt-3 sm:hidden">
                <span className="h-1 w-10 rounded-full bg-white/18" />
              </div>
              <div className="flex shrink-0 items-center gap-3 px-5 pb-3 sm:hidden">
                <Icon className="h-4 w-4 shrink-0 text-volt/80" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase text-white/34">筛选</p>
                  <p className="truncate text-sm font-semibold text-white/86">{fallbackLabel}</p>
                </div>
              </div>
              {allLabel && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className={`flex w-full shrink-0 items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-150 ${
                    !value ? "bg-volt/[0.08] text-volt" : "text-white/62 hover:bg-white/[0.05] hover:text-white/90"
                  }`}
                >
                  {allLabel}
                  {!value && <Check className="ml-auto h-4 w-4 shrink-0" />}
                </button>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 scrollbar-hidden sm:max-h-[20rem] sm:flex-none sm:pb-2">
                {groupEntries.length ? groupEntries.map(([group, items]) => (
                  <div key={group} className="pt-2">
                    {grouped ? (
                      <>
                        <FilterGroupHeader
                          count={items.length}
                          expanded={Boolean(expandedGroups[group])}
                          label={group}
                          selected={value === makeFilterGroupValue(group)}
                          onSelect={() => {
                            onChange(makeFilterGroupValue(group));
                            setOpen(false);
                          }}
                          onToggle={() =>
                            setExpandedGroups((current) => ({
                              ...current,
                              [group]: !current[group]
                            }))
                          }
                        />
                        <AnimatePresence initial={false}>
                          {expandedGroups[group] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                              className="mx-2 overflow-hidden rounded-2xl bg-white/[0.025]"
                            >
                              <OptionList options={items} value={value} onSelect={(nextValue) => {
                                onChange(nextValue);
                                setOpen(false);
                              }} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <div className="mx-2 overflow-hidden rounded-2xl bg-white/[0.025]">
                        <OptionList options={items} value={value} onSelect={(nextValue) => {
                          onChange(nextValue);
                          setOpen(false);
                        }} />
                      </div>
                    )}
                  </div>
                )) : (
                  <button
                    type="button"
                    className="mx-2 my-3 flex w-[calc(100%-1rem)] items-center justify-center rounded-2xl bg-white/[0.04] px-4 py-4 text-sm text-white/50 transition hover:bg-white/[0.07] hover:text-white/75"
                  >
                    没有匹配项
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function OptionList({
  options,
  value,
  onSelect
}: {
  options: FilterOption[];
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="divide-y divide-white/[0.06]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          className={`flex min-h-10 w-full items-center gap-2 px-3 text-left text-xs transition-all duration-150 ${
            value === option.value
              ? "bg-volt/[0.08] text-volt"
              : "text-white/62 hover:bg-white/[0.055] hover:text-white/90"
          }`}
        >
          <span className="min-w-0 flex-1 truncate">{option.label}</span>
          {value === option.value && <Check className="h-3.5 w-3.5 shrink-0" />}
        </button>
      ))}
    </div>
  );
}

function FilterGroupHeader({
  label,
  count,
  expanded,
  selected,
  onSelect,
  onToggle
}: {
  label: string;
  count: number;
  expanded: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={`mb-1 flex min-h-9 w-full items-center gap-1.5 px-2 transition ${
        selected ? "text-volt" : "text-white/74 hover:text-white"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-2 py-1.5 text-left transition ${
          selected ? "bg-volt/[0.08]" : "hover:bg-white/[0.05]"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-volt shadow-[0_0_14px_rgba(216,255,62,.72)]" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{label}</span>
        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-white/36">
          {count}
        </span>
        {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-white/44 transition hover:bg-white/[0.08] hover:text-white/78"
        aria-label={`${expanded ? "收起" : "展开"}${label}`}
      >
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.span>
      </button>
    </div>
  );
}


