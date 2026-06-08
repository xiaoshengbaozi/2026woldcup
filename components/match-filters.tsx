"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, ChevronDown, Clock, GitFork, Grid3X3, Layers, LayoutList, MapPin, Search } from "lucide-react";
import { ComponentType, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { openCreatorSupportModal } from "@/components/support-creator-modal";
import type { ScheduleLayout, ScheduleMatchSource } from "@/app/matches/page";
import { formatStageLabel, getStageGroupId, rankStage } from "@/lib/stage";

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
  matchSource: ScheduleMatchSource;
  stage: string;
  stages: string[];
  activeCity: string;
  cities: string[];
  timezoneOffset: number;
  layout: ScheduleLayout;
  onQueryChange: (value: string) => void;
  onMatchSourceChange: (value: ScheduleMatchSource) => void;
  onStageChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onTimezoneChange: (offset: number) => void;
  onLayoutChange: (layout: ScheduleLayout) => void;
};

export type FilterOption = {
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
  if (getStageGroupId(stage) || stage.includes("小组赛")) return "小组赛";
  if (stage.includes("1/16") || stage.includes("1/8") || stage.includes("1/4")) return "淘汰赛";
  if (stage.includes("半决赛") || stage.includes("决赛")) return "决赛周";
  return "赛段";
}

export function getCityFilterGroup(city: string) {
  const mexicoCities = ["Mexico City", "Guadalajara", "Monterrey", "墨西哥城", "瓜达拉哈拉", "萨波潘", "蒙特雷"];
  const canadaCities = ["Toronto", "Vancouver", "多伦多", "温哥华"];
  if (mexicoCities.includes(city)) return "墨西哥";
  if (canadaCities.includes(city)) return "加拿大";
  return "美国";
}

function sortStages(stages: string[]): string[] {
  return [...stages].sort((a, b) => rankStage(a) - rankStage(b));
}

export function MatchFilters({
  query,
  matchSource,
  stage,
  stages,
  activeCity,
  cities,
  timezoneOffset,
  layout,
  onQueryChange,
  onMatchSourceChange,
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
      data-match-filters="true"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.65 }}
      className="relative z-[10000] flex items-center gap-2 sm:z-20 sm:flex-wrap sm:gap-3"
    >
      <MatchSourceToggle value={matchSource} onChange={onMatchSourceChange} />

      <label className="glass-chip flex h-10 min-w-0 flex-1 items-center gap-2 px-4 text-white/70 transition focus-within:text-white sm:gap-3 sm:px-5">
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

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
        <SupportBeerButton />
      </div>
    </motion.section>
  );
}

function SupportBeerButton() {
  return (
    <button
      type="button"
      aria-label="打赏作者"
      title="打赏作者"
      onClick={openCreatorSupportModal}
      className="glass-chip group relative box-border flex h-10 min-h-10 w-10 shrink-0 items-center justify-center overflow-hidden px-0 text-white/78 ring-1 ring-transparent transition hover:text-white hover:ring-amber-300/25 sm:w-auto sm:min-w-[11.5rem] sm:justify-start sm:gap-2.5 sm:px-4"
    >
      <span className="relative block h-8 max-h-8 w-8 shrink-0 overflow-hidden">
        <Image
          src="/support/beer-glass.webp"
          alt=""
          fill
          sizes="32px"
          className="block object-contain p-0.5 transition duration-200 group-hover:scale-110"
        />
      </span>
      <span className="hidden whitespace-nowrap text-xs leading-none sm:block">请作者喝杯啤酒</span>
    </button>
  );
}

function MatchSourceToggle({
  value,
  onChange
}: {
  value: ScheduleMatchSource;
  onChange: (value: ScheduleMatchSource) => void;
}) {
  const options: { value: ScheduleMatchSource; label: string }[] = [
    { value: "official", label: "\u6b63\u8d5b" },
    { value: "warmups", label: "\u70ed\u8eab" },
  ];

  return (
    <div className="glass-chip flex h-10 shrink-0 items-center overflow-hidden p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-match-source={option.value}
          onClick={() => onChange(option.value)}
          className={`h-8 rounded-full px-3 text-[11px] font-semibold transition-all duration-150 sm:px-4 ${
            value === option.value
              ? "bg-volt/10 text-volt ring-1 ring-volt/25 shadow-[0_0_18px_rgba(216,255,62,.12)]"
              : "text-white/50 hover:text-white/78"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
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
      <button
        type="button"
        onClick={() => onChange("calendar")}
        aria-label="日历视图"
        title="日历视图"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all duration-150 ${
          layout === "calendar"
            ? "bg-volt/10 text-volt ring-1 ring-volt/25"
            : "text-white/50 hover:text-white/70"
        }`}
      >
        <CalendarDays className="h-4 w-4" />
      </button>
    </div>
  );
}

function useDropdownClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest("[data-filter-sheet='true']")) return;
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

export function FilterDropdown({
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
  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const ref = useDropdownClose(open, () => setOpen(false));

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const panelContent = (
    <>
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
                      className="overflow-hidden sm:mx-2 sm:rounded-2xl sm:bg-white/[0.025]"
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
              <div className="overflow-hidden sm:mx-2 sm:rounded-2xl sm:bg-white/[0.025]">
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
    </>
  );
  const mobileLayer = mounted ? createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            data-filter-backdrop="true"
            type="button"
            aria-label="关闭筛选器"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9990] bg-black/52 backdrop-blur-md sm:hidden"
          />
          <motion.div
            data-filter-sheet="true"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-[9999] flex h-[54dvh] min-h-[20rem] flex-col overflow-hidden rounded-t-[2rem] bg-black/82 shadow-[0_-28px_90px_rgba(0,0,0,.72),0_0_0_1px_rgba(255,255,255,.09),0_0_48px_rgba(216,255,62,.08)] backdrop-blur-2xl sm:hidden"
          >
            {panelContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <div ref={ref} className="relative min-w-0 shrink-0 sm:min-w-[150px]">
      <button
        type="button"
        aria-label={fallbackLabel}
        title={fallbackLabel}
        onClick={() => setOpen(!open)}
        className={`glass-chip flex h-10 w-10 items-center justify-center gap-1.5 px-0 text-left transition sm:w-full sm:justify-between sm:gap-2 sm:px-5 ${
          open ? "text-volt ring-1 ring-volt/25" : "text-white/78 hover:text-white"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 text-volt/80" />
        <span className="hidden truncate text-xs sm:block">{label}</span>
        <motion.span className="hidden sm:block" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            data-filter-sheet="true"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-2 hidden w-40 flex-col overflow-hidden rounded-[1.35rem] bg-black/82 shadow-[0_18px_55px_rgba(0,0,0,.46),0_0_0_1px_rgba(255,255,255,.09),0_0_38px_rgba(216,255,62,.08)] backdrop-blur-2xl sm:flex"
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>
      {mobileLayer}
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


