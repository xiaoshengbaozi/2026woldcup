"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Clock, Grid3X3, Layers, LayoutList, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
        <TimezoneDropdown value={timezoneOffset} onChange={onTimezoneChange} />
        <StageDropdown value={stage} stages={sorted} onChange={onStageChange} />
        <CityDropdown value={activeCity} cities={cities} onChange={onCityChange} />
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
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-150 ${
          layout === "default"
            ? "bg-volt/10 text-volt ring-1 ring-volt/25"
            : "text-white/50 hover:text-white/70"
        }`}
      >
        <LayoutList className="h-4 w-4" />
        <span>默认</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("waterfall")}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-150 ${
          layout === "waterfall"
            ? "bg-volt/10 text-volt ring-1 ring-volt/25"
            : "text-white/50 hover:text-white/70"
        }`}
      >
        <Grid3X3 className="h-4 w-4" />
        <span>瀑布流</span>
      </button>
    </div>
  );
}

function TimezoneDropdown({
  value,
  onChange
}: {
  value: number;
  onChange: (offset: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = timezones.find((tz) => tz.offset === value) ?? timezones[0];
  const tzName = selected.label.split(" ")[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`glass-chip flex h-10 w-full items-center justify-between gap-1.5 px-3 text-left transition sm:gap-2 sm:px-5 ${
          open ? "text-volt ring-1 ring-volt/25" : "text-white/78 hover:text-white"
        }`}
      >
        <Clock className="h-4 w-4 shrink-0 text-volt/80" />
        <span className="truncate text-xs">{tzName}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full z-50 mt-2 w-full min-w-[180px] overflow-hidden rounded-2xl bg-black/90 shadow-[0_24px_64px_rgba(0,0,0,.7),0_0_0_1px_rgba(255,255,255,.08)] backdrop-blur-xl sm:left-auto sm:right-0"
          >
            <div className="divide-y divide-white/[0.04]">
              {timezones.map((tz) => (
                <button
                  key={tz.label}
                  type="button"
                  onClick={() => { onChange(tz.offset); setOpen(false); }}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-sm transition-all duration-150 ${
                    value === tz.offset
                      ? "bg-volt/[0.06] text-volt font-medium"
                      : "text-white/60 hover:bg-white/[0.03] hover:text-white/90"
                  }`}
                >
                  <span className="truncate">{tz.label}</span>
                  {value === tz.offset && <span className="ml-auto shrink-0 text-volt">✓</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StageDropdown({
  value,
  stages,
  onChange
}: {
  value: string;
  stages: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = value ? formatStageLabel(value) : "赛段";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`glass-chip flex h-10 w-full items-center justify-between gap-1.5 px-3 text-left transition sm:gap-2 sm:px-5 ${
          open ? "text-volt ring-1 ring-volt/25" : "text-white/78 hover:text-white"
        }`}
      >
        <Layers className="h-4 w-4 shrink-0 text-volt/80" />
        <span className="truncate text-xs">{label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-full min-w-[200px] overflow-hidden rounded-2xl bg-black/90 shadow-[0_24px_64px_rgba(0,0,0,.7),0_0_0_1px_rgba(255,255,255,.08)] backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={`flex w-full items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-150 ${
                !value ? "bg-volt/[0.06] text-volt" : "text-white/60 hover:bg-white/[0.03] hover:text-white/90"
              }`}
            >
              全部赛段
              {!value && <span className="ml-auto shrink-0 text-volt">✓</span>}
            </button>
            <div className="h-px bg-white/[0.05]" />
            <div className="divide-y divide-white/[0.04]">
              {stages.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { onChange(s); setOpen(false); }}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-sm transition-all duration-150 ${
                    value === s ? "bg-volt/[0.06] text-volt font-medium" : "text-white/60 hover:bg-white/[0.03] hover:text-white/90"
                  }`}
                >
                  <span className="truncate">{formatStageLabel(s)}</span>
                  {value === s && <span className="ml-auto shrink-0 text-volt">✓</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CityDropdown({
  value,
  cities,
  onChange
}: {
  value: string;
  cities: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = value === "全部城市" || !value ? "城市" : value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`glass-chip flex h-10 w-full items-center justify-between gap-1.5 px-3 text-left transition sm:gap-2 sm:px-5 ${
          open ? "text-volt ring-1 ring-volt/25" : "text-white/78 hover:text-white"
        }`}
      >
        <MapPin className="h-4 w-4 shrink-0 text-volt/80" />
        <span className="truncate text-xs">{label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-full min-w-[200px] overflow-hidden rounded-2xl bg-black/90 shadow-[0_24px_64px_rgba(0,0,0,.7),0_0_0_1px_rgba(255,255,255,.08)] backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={() => { onChange("全部城市"); setOpen(false); }}
              className={`flex w-full items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-150 ${
                value === "全部城市" ? "bg-volt/[0.06] text-volt" : "text-white/60 hover:bg-white/[0.03] hover:text-white/90"
              }`}
            >
              全部城市
              {value === "全部城市" && <span className="ml-auto shrink-0 text-volt">✓</span>}
            </button>
            <div className="h-px bg-white/[0.05]" />
            <div className="divide-y divide-white/[0.04]">
              {cities.filter((c) => c !== "全部城市").map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => { onChange(city); setOpen(false); }}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-sm transition-all duration-150 ${
                    value === city ? "bg-volt/[0.06] text-volt font-medium" : "text-white/60 hover:bg-white/[0.03] hover:text-white/90"
                  }`}
                >
                  <span className="truncate">{city}</span>
                  {value === city && <span className="ml-auto shrink-0 text-volt">✓</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
