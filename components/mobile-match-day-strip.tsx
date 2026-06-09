"use client";

import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import type { MouseEvent } from "react";
import { useRef } from "react";

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
  const stripRef = useRef<HTMLDivElement>(null);

  if (!days.length) return null;

  const scrollEdgeButtonIntoFocus = (button: HTMLButtonElement) => {
    const strip = stripRef.current;
    if (!strip) return;

    const stripRect = strip.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const edgeThreshold = 8;
    const gap = 8;

    window.requestAnimationFrame(() => {
      if (buttonRect.right >= stripRect.right - edgeThreshold) {
        strip.scrollTo({
          left: button.offsetLeft - gap,
          behavior: "smooth"
        });
        return;
      }

      if (buttonRect.left <= stripRect.left + edgeThreshold) {
        strip.scrollTo({
          left: button.offsetLeft - strip.clientWidth + button.offsetWidth + gap,
          behavior: "smooth"
        });
      }
    });
  };

  const handleSelect = (
    nextDay: string,
    event: MouseEvent<HTMLButtonElement>
  ) => {
    onSelectDay(nextDay);
    scrollEdgeButtonIntoFocus(event.currentTarget);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="sm:hidden"
      aria-label="按比赛日筛选"
    >
      <div
        ref={stripRef}
        className="scrollbar-hidden -mx-3 flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-3 py-1.5 scroll-px-3"
      >
        <DayButton
          active={!selectedDay}
          count={days.reduce((total, day) => total + day.count, 0)}
          label="All"
          meta="Days"
          value="全部"
          onClick={(event) => handleSelect("", event)}
        />
        {days.map((day) => (
          <DayButton
            key={day.key}
            active={selectedDay === day.key}
            count={day.count}
            label={day.weekday}
            meta={day.month}
            value={day.day}
            onClick={(event) => handleSelect(day.key, event)}
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
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const isAll = value === "全部";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-[68px] w-[50px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl text-center transition duration-300 ${
        active
          ? "text-black"
          : "glass-chip text-white/78 ring-1 ring-white/[0.08] hover:bg-white/[0.09] hover:text-white"
      }`}
      aria-pressed={active}
      aria-label={isAll ? "全部比赛日" : `${meta} ${value}, ${label}`}
    >
      {active && (
        <motion.span
          layoutId="mobile-match-day-pill"
          className="absolute inset-0 rounded-2xl bg-volt shadow-[0_0_24px_rgba(216,255,62,.2)]"
          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
        />
      )}
      {isAll ? (
        <CalendarDays className={`relative z-10 h-4 w-4 ${active ? "text-black" : "text-volt/80"}`} />
      ) : (
        <>
          <span
            className={`absolute top-2 z-10 h-1 w-1 rounded-full ${
              count
                ? active
                  ? "bg-black/45"
                  : "bg-volt shadow-[0_0_10px_rgba(216,255,62,.85)]"
                : active
                  ? "bg-black/25"
                  : "bg-white/30"
            }`}
          />
          <span className="relative z-10 mt-2 text-[10px] font-semibold uppercase leading-none tracking-[0.04em]">
            {label}
          </span>
          <span className="relative z-10 mt-1 text-lg font-semibold leading-none">{value}</span>
          <span className={`relative z-10 mt-1 max-w-full truncate px-1 text-[9px] font-medium leading-none ${active ? "text-black/52" : "text-white/34"}`}>
            {meta}
          </span>
        </>
      )}
    </button>
  );
}
