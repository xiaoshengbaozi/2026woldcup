"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Clock, Layers, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Timezone = {
  label: string;
  offset: number;
};

const timezones: Timezone[] = [
  { label: "北京时间 UTC+8", offset: 0 },
  { label: "美国东部 UTC-4", offset: -12 },
  { label: "美国中部 UTC-5", offset: -13 },
  { label: "美国西部 UTC-7", offset: -15 },
  { label: "墨西哥中部 UTC-6", offset: -14 },
  { label: "加拿大东部 UTC-4", offset: -12 },
  { label: "加拿大西部 UTC-7", offset: -15 }
];

type MatchFiltersProps = {
  query: string;
  stage: string;
  stages: string[];
  activeCity: string;
  cities: string[];
  timezoneOffset: number;
  onQueryChange: (value: string) => void;
  onStageChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onTimezoneChange: (offset: number) => void;
};

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
  onQueryChange,
  onStageChange,
  onCityChange,
  onTimezoneChange
}: MatchFiltersProps) {
  const sorted = sortStages(stages);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.65 }}
      className="relative z-20 grid gap-3 md:grid-cols-[1fr_200px_200px_200px]"
    >
      <label className="glass-chip flex min-h-14 items-center gap-3 px-5 text-white/70 transition focus-within:text-white">
        <Search className="h-5 w-5 shrink-0 text-volt/80" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索球队、场馆、城市或比赛"
          className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/35"
        />
      </label>

      <TimezoneDropdown
        value={timezoneOffset}
        onChange={onTimezoneChange}
      />

      <StageDropdown
        value={stage}
        stages={sorted}
        onChange={onStageChange}
      />

      <CityDropdown
        value={activeCity}
        cities={cities}
        onChange={onCityChange}
      />
    </motion.section>
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`glass-chip flex min-h-14 w-full items-center justify-between gap-2 px-5 text-left transition ${
          open ? "text-volt ring-1 ring-volt/25" : "text-white/78 hover:text-white"
        }`}
      >
        <Clock className="h-4 w-4 shrink-0 text-volt/80" />
        <span className="truncate text-sm">{selected.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
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

  const label = value || "全部阶段";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`glass-chip flex min-h-14 w-full items-center justify-between gap-2 px-5 text-left transition ${
          open ? "text-volt ring-1 ring-volt/25" : "text-white/78 hover:text-white"
        }`}
      >
        <Layers className="h-4 w-4 shrink-0 text-volt/80" />
        <span className="truncate text-sm">{label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
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
              全部阶段
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
                  <span className="truncate">{s}</span>
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

  const label = value === "全部城市" || !value ? "全部城市" : value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`glass-chip flex min-h-14 w-full items-center justify-between gap-2 px-5 text-left transition ${
          open ? "text-volt ring-1 ring-volt/25" : "text-white/78 hover:text-white"
        }`}
      >
        <MapPin className="h-4 w-4 shrink-0 text-volt/80" />
        <span className="truncate text-sm">{label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
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
