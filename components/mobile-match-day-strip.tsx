"use client";

import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

export type MatchDayOption = {
  key: string;
  weekday: string;
  day: string;
  month: string;
  count: number;
};

type MobileMatchDayStripProps = {
  days: MatchDayOption[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
};

export function MobileMatchDayStrip({
  days,
  selectedDay,
  onSelectDay
}: MobileMatchDayStripProps) {
  if (!days.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="sm:hidden"
      aria-label="按比赛日筛选"
    >
      <div className="scrollbar-hidden -mx-3 flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-3 py-1.5 scroll-px-3">
          <DayButton
            active={!selectedDay}
            count={days.reduce((total, day) => total + day.count, 0)}
            label="All"
            meta="Days"
            value="全部"
            onClick={() => onSelectDay("")}
          />
          {days.map((day) => (
            <DayButton
              key={day.key}
              active={selectedDay === day.key}
              count={day.count}
              label={day.weekday}
              meta={day.month}
              value={day.day}
              onClick={() => onSelectDay(selectedDay === day.key ? "" : day.key)}
            />
          ))}
      </div>
    </motion.section>
  );
}

function DayButton({
  active,
  count,
  label,
  meta,
  value,
  onClick
}: {
  active: boolean;
  count: number;
  label: string;
  meta: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-[68px] w-[50px] shrink-0 flex-col items-center justify-center rounded-2xl text-center transition duration-200 ${
        active
          ? "bg-volt/[0.08] text-volt shadow-[0_0_24px_rgba(216,255,62,.16)] ring-1 ring-volt/70"
          : "bg-black/22 text-white/54 ring-1 ring-white/[0.055] hover:bg-white/[0.055] hover:text-white/80"
      }`}
      aria-pressed={active}
    >
      <span
        className={`absolute top-2 h-1 w-1 rounded-full ${
          count ? "bg-volt shadow-[0_0_10px_rgba(216,255,62,.85)]" : "bg-white/30"
        }`}
      />
      {value === "全部" ? (
        <CalendarDays className={`mb-1 mt-2 h-4 w-4 ${active ? "text-volt" : "text-white/42"}`} />
      ) : (
        <span className="mt-2 text-[10px] font-semibold uppercase leading-none tracking-[0.04em]">
          {label}
        </span>
      )}
      <span className={`mt-1 text-lg font-semibold leading-none ${value === "全部" ? "text-[12px]" : ""}`}>
        {value}
      </span>
      <span className="mt-1 max-w-full truncate px-1 text-[9px] font-medium leading-none text-white/34">
        {meta}
      </span>
    </button>
  );
}
