"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { detailRows, localizeLocationText } from "@/lib/calendar";
import { formatTime } from "@/lib/format";
import { generateMatchSlug } from "@/lib/match-detail";
import { formatStageLabel } from "@/lib/stage";
import { parseTeams } from "@/lib/teams";
import type { Match } from "@/types/match";

type CalendarMode = "month" | "week" | "day";

type MatchCalendarViewProps = {
  matches: Match[];
  timezoneOffset: number;
};

const modeOptions: { value: CalendarMode; label: string }[] = [
  { value: "month", label: "月" },
  { value: "week", label: "周" },
  { value: "day", label: "日" },
];

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

export function MatchCalendarView({ matches, timezoneOffset }: MatchCalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>("month");

  const calendarMatches = useMemo(
    () =>
      matches.map((match) => ({
        match,
        displayStart: offsetDate(match.start, timezoneOffset),
      })),
    [matches, timezoneOffset]
  );

  const initialDate = calendarMatches[0]?.displayStart ?? new Date();
  const [cursor, setCursor] = useState(() => startOfDay(initialDate));

  const dayMap = useMemo(() => {
    const map = new Map<string, typeof calendarMatches>();
    calendarMatches.forEach((item) => {
      const key = dateKey(item.displayStart);
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return map;
  }, [calendarMatches]);

  const heatDays = useMemo(() => {
    if (!calendarMatches.length) return [];
    const first = startOfDay(calendarMatches[0].displayStart);
    const last = startOfDay(calendarMatches[calendarMatches.length - 1].displayStart);
    return eachDay(first, last).map((date) => {
      const items = dayMap.get(dateKey(date)) ?? [];
      return { date, count: items.length };
    });
  }, [calendarMatches, dayMap]);

  const maxCount = Math.max(1, ...heatDays.map((day) => day.count));
  const calendarDays = useMemo(() => buildVisibleDays(cursor), [cursor]);
  const rightPanelDays = useMemo(() => {
    if (mode === "day") return [cursor];
    if (mode === "week") return eachDay(startOfWeek(cursor), addDays(startOfWeek(cursor), 6));
    return eachDay(startOfWeek(cursor), addDays(startOfWeek(cursor), 6));
  }, [cursor, mode]);
  const selectedMatches = dayMap.get(dateKey(cursor)) ?? [];

  const move = (direction: -1 | 1) => {
    const next = new Date(cursor);
    if (mode === "month") next.setMonth(next.getMonth() + direction);
    if (mode === "week") next.setDate(next.getDate() + direction * 7);
    if (mode === "day") next.setDate(next.getDate() + direction);
    setCursor(startOfDay(next));
  };

  const totalMatchesToday = selectedMatches.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="hero-card overflow-hidden"
    >
      <div className="relative z-10 flex flex-col lg:flex-row">
        {/* ── Left Panel ── */}
        <div className="flex w-full flex-col gap-4 p-5 sm:p-6 lg:w-[22rem] lg:border-r lg:border-white/[0.06]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-volt/[0.1] text-volt">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">My Calendar</h2>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/36">
                  {totalMatchesToday} 场比赛今天
                </p>
              </div>
            </div>
          </div>

          {/* Month Calendar Grid */}
          <div className="rounded-[1.4rem] bg-white/[0.03] p-4">
            {/* Month header with nav */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => move(-1)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-white/50 transition hover:bg-white/[0.1] hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-semibold text-white">
                {new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(cursor)}
              </h3>
              <button
                type="button"
                onClick={() => move(1)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-white/50 transition hover:bg-white/[0.1] hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div key={day} className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date) => {
                const key = dateKey(date);
                const items = dayMap.get(key) ?? [];
                const isToday = isSameDay(date, new Date());
                const isSelected = key === dateKey(cursor);
                const sameMonth = date.getMonth() === cursor.getMonth();
                const hasEvents = items.length > 0;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCursor(startOfDay(date))}
                    className={`group relative flex h-9 items-center justify-center text-xs font-medium transition ${
                      !sameMonth
                        ? "text-white/18"
                        : isSelected
                          ? "bg-volt text-black rounded-full shadow-[0_0_16px_rgba(216,255,62,.3)]"
                          : isToday
                            ? "bg-volt/[0.12] text-volt rounded-full ring-1 ring-volt/30"
                            : "text-white/70 rounded-xl hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <span>{date.getDate()}</span>
                    {hasEvents && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {items.length <= 3 ? (
                          items.map((_, i) => (
                            <span key={i} className="h-1 w-1 rounded-full bg-volt/60" />
                          ))
                        ) : (
                          <span className="h-1 w-1 rounded-full bg-flare/70" />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-1.5 rounded-full bg-white/[0.04] p-1">
            {modeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${
                  mode === option.value
                    ? "bg-volt/[0.12] text-volt shadow-[0_0_12px_rgba(216,255,62,.12)]"
                    : "text-white/42 hover:text-white/68"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Selected Day Info */}
          <div className="rounded-[1.4rem] bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">Date Detail</p>
                <h3 className="mt-0.5 text-sm font-medium text-white">{formatShortDate(cursor)}</h3>
              </div>
              <span className="rounded-full bg-volt/[0.1] px-3 py-1 text-[11px] font-semibold text-volt">
                {totalMatchesToday} 场
              </span>
            </div>
            <div className="space-y-1.5">
              {selectedMatches.length ? (
                selectedMatches.map(({ match, displayStart }) => (
                  <SelectedDayMatchRow key={match.uid} match={match} displayStart={displayStart} />
                ))
              ) : (
                <div className="rounded-2xl bg-white/[0.03] px-3 py-8 text-center text-xs text-white/36">
                  当天暂无赛程
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Panel: Time Grid ── */}
        <div className="min-h-[36rem] flex-1 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">
                {mode === "month" ? `${new Intl.DateTimeFormat("zh-CN", { month: "long" }).format(cursor)} 赛程` : formatCursorLabel(cursor, mode)}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => move(-1)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-white/50 transition hover:bg-white/[0.1] hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCursor(startOfDay(initialDate))}
                className="h-8 rounded-full px-3 text-[11px] font-semibold text-white/50 transition hover:bg-white/[0.08] hover:text-white"
              >
                首日
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-white/50 transition hover:bg-white/[0.1] hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {mode === "month" ? (
            <WeekScheduleGrid
              days={rightPanelDays}
              cursor={cursor}
              dayMap={dayMap}
              timezoneOffset={timezoneOffset}
              onSelectDate={(date) => setCursor(startOfDay(date))}
            />
          ) : (
            <TimeGridAgenda
              key={`${mode}-${dateKey(cursor)}`}
              mode={mode}
              days={rightPanelDays}
              cursor={cursor}
              dayMap={dayMap}
              timezoneOffset={timezoneOffset}
              onSelectDate={(date) => setCursor(startOfDay(date))}
            />
          )}
        </div>
      </div>
    </motion.section>
  );
}

/* ── Week Schedule Grid ── */

function WeekScheduleGrid({
  days,
  cursor,
  dayMap,
  timezoneOffset,
  onSelectDate,
}: {
  days: Date[];
  cursor: Date;
  dayMap: Map<string, { match: Match; displayStart: Date }[]>;
  timezoneOffset: number;
  onSelectDate: (date: Date) => void;
}) {
  const weekStart = startOfWeek(cursor);
  const weekDaysFull = eachDay(weekStart, addDays(weekStart, 6));
  const allItems = weekDaysFull.flatMap((day) => dayMap.get(dateKey(day)) ?? []);
  const hours = buildHourRange(allItems);

  return (
    <div className="min-w-0 overflow-x-auto scrollbar-hidden">
      <div className="min-w-[42rem]">
        <div
          className="grid"
          style={{ gridTemplateColumns: `3.5rem repeat(7, minmax(0, 1fr))` }}
        >
          {/* Timezone label in time column */}
          <div className="flex items-start justify-end border-b border-white/[0.06] pt-0.5 pr-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/26">
            {formatTimezoneLabel(timezoneOffset)}
          </div>
          {weekDaysFull.map((day) => {
            const selected = dateKey(day) === dateKey(cursor);
            const count = dayMap.get(dateKey(day))?.length ?? 0;
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={dateKey(day)}
                type="button"
                onClick={() => onSelectDate(day)}
                className={`border-b border-white/[0.06] px-3 py-3 text-left transition ${
                  selected
                    ? "bg-volt/[0.06] text-volt"
                    : "text-white/60 hover:bg-white/[0.04]"
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                  {new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(day)}
                </div>
                <div className="mt-1 flex items-end justify-between gap-1.5">
                  <span className={`text-2xl font-bold leading-none ${isToday ? "text-volt" : ""}`}>{day.getDate()}</span>
                  {count > 0 && (
                    <span className="bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/44">{count}</span>
                  )}
                </div>
              </button>
            );
          })}

          {/* Time rows */}
          {hours.map((hour) => (
            <TimeGridRow
              key={hour}
              hour={hour}
              days={weekDaysFull}
              dayMap={dayMap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Time Grid Agenda ── */

function TimeGridAgenda({
  mode,
  days,
  cursor,
  dayMap,
  timezoneOffset,
  onSelectDate,
}: {
  mode: CalendarMode;
  days: Date[];
  cursor: Date;
  dayMap: Map<string, { match: Match; displayStart: Date }[]>;
  timezoneOffset: number;
  onSelectDate: (date: Date) => void;
}) {
  const visibleItems = days.flatMap((day) => dayMap.get(dateKey(day)) ?? []);
  const hours = buildHourRange(visibleItems);
  const isDay = mode === "day";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="min-w-0 overflow-x-auto scrollbar-hidden"
      >
        <div className={isDay ? "min-w-[32rem]" : "min-w-[52rem]"}>
          <div
            className="grid"
            style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
          >
            {/* Timezone label in time column */}
            <div className="flex items-start justify-end border-b border-white/[0.06] pt-0.5 pr-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/26">
              {formatTimezoneLabel(timezoneOffset)}
            </div>
            {days.map((day) => {
              const selected = dateKey(day) === dateKey(cursor);
              const count = dayMap.get(dateKey(day))?.length ?? 0;
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={dateKey(day)}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={`border-b border-white/[0.06] px-3 py-3 text-left transition ${
                    selected
                      ? "bg-volt/[0.06] text-volt"
                      : "text-white/60 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                    {new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(day)}
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-1.5">
                    <span className={`text-2xl font-bold leading-none ${isToday ? "text-volt" : ""}`}>{day.getDate()}</span>
                    {count > 0 && (
                      <span className="bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/44">{count}</span>
                    )}
                  </div>
                </button>
              );
            })}

            {hours.map((hour) => (
              <TimeGridRow
                key={hour}
                hour={hour}
                days={days}
                dayMap={dayMap}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Time Grid Row ── */

function TimeGridRow({
  hour,
  days,
  dayMap,
}: {
  hour: number;
  days: Date[];
  dayMap: Map<string, { match: Match; displayStart: Date }[]>;
}) {
  return (
    <>
      <div className="flex items-center justify-end self-start border-t border-white/[0.06] pr-2.5 pt-1 text-[10px] font-semibold uppercase text-white/26">
        {String(hour).padStart(2, "0")}:00
      </div>
      {days.map((day) => {
        const items = (dayMap.get(dateKey(day)) ?? []).filter(
          (item) => item.displayStart.getHours() === hour
        );
        const hasItems = items.length > 0;
        return (
          <div
            key={`${dateKey(day)}-${hour}`}
            className={`border-t border-white/[0.06] ${hasItems ? "min-h-[4.5rem] p-1.5" : "p-1"}`}
          >
            {hasItems && (
              <div className="space-y-1">
                {items.map(({ match, displayStart }, index) => (
                  <TimedMatchCard
                    key={match.uid}
                    match={match}
                    displayStart={displayStart}
                    tone={index}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ── Team Flag ── */

function TeamFlag({ team, size = 14 }: { team: import("@/types/match").Team; size?: number }) {
  if (!team.image) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center bg-white/10 text-[7px] font-bold text-volt"
        style={{ width: size, height: size }}
      >
        {team.badge}
      </span>
    );
  }
  return (
    <img
      src={team.image}
      alt=""
      className="inline-block shrink-0 object-cover"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}

/* ── Timed Match Card ── */

const eventTones = [
  "bg-volt/[0.12] text-white border-l-volt/50",
  "bg-flare/[0.12] text-white border-l-flare/50",
  "bg-sky-400/[0.12] text-white border-l-sky-400/50",
  "bg-fuchsia-400/[0.12] text-white border-l-fuchsia-400/50",
];

function TimedMatchCard({
  match,
  displayStart,
  tone,
}: {
  match: Match;
  displayStart: Date;
  tone: number;
}) {
  const teams = parseTeams(match.summary);
  const slug = generateMatchSlug(match.summary);
  const toneIdx = tone % eventTones.length;

  return (
    <Link
      href={"/matches/" + slug}
      className={`block border-l-[3px] px-2 py-1.5 transition hover:bg-white/[0.06] ${eventTones[toneIdx]}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] font-semibold text-white/80">{formatTime(displayStart)}</span>
        <span className="truncate text-[8px] font-medium uppercase tracking-wider text-white/40">{formatStageLabel(match.stage)}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-bold text-white/90">
        <TeamFlag team={teams.home} size={14} />
        <span className="truncate">{teams.home.name}</span>
      </div>
      <div className="flex items-center gap-1.5 truncate text-[10px] font-semibold text-white/60">
        <TeamFlag team={teams.away} size={14} />
        <span className="truncate">{teams.away.name}</span>
      </div>
    </Link>
  );
}

/* ── Selected Day Match Row ── */

function SelectedDayMatchRow({ match, displayStart }: { match: Match; displayStart: Date }) {
  const teams = parseTeams(match.summary);
  const details = detailRows(match);
  const venue = details.find((detail) => detail.type === "venue")?.text || localizeLocationText(match.location);
  const slug = generateMatchSlug(match.summary);

  return (
    <Link
      href={"/matches/" + slug}
      className="group block rounded-2xl bg-white/[0.04] px-3 py-2.5 transition hover:bg-white/[0.07]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-white transition group-hover:text-volt">
          {formatTime(displayStart)}
        </div>
        <div className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-semibold text-white/40">
          {formatStageLabel(match.stage)}
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-white/72">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <TeamFlag team={teams.home} size={16} />
          <span className="truncate">{teams.home.name}</span>
        </span>
        <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-white/26">vs</span>
        <span className="flex min-w-0 items-center gap-1.5 truncate text-right">
          <TeamFlag team={teams.away} size={16} />
          <span className="truncate">{teams.away.name}</span>
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/36">
        <MapPin className="h-3 w-3 shrink-0 text-flare/60" />
        <span className="truncate">{venue}</span>
      </div>
    </Link>
  );
}

/* ── Date Utilities ── */

function offsetDate(date: Date, timezoneOffset: number) {
  return new Date(date.getTime() + timezoneOffset * 3600000);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const start = startOfDay(date);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  return start;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function eachDay(start: Date, end: Date) {
  const days: Date[] = [];
  const cursor = startOfDay(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function buildVisibleDays(cursor: Date) {
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  return eachDay(startOfWeek(monthStart), addDays(startOfWeek(monthEnd), 6));
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function buildHourRange(items: { displayStart: Date }[]) {
  if (!items.length) return [];
  const hourSet = new Set(items.map((item) => item.displayStart.getHours()));
  return [...hourSet].sort((a, b) => a - b);
}

function formatCursorLabel(date: Date, mode: CalendarMode) {
  if (mode === "week") {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }
  return formatShortDate(date);
}

function formatTimezoneLabel(offset: number) {
  const utc = offset + 8;
  const sign = utc >= 0 ? "+" : "";
  return `GMT${sign}${utc}`;
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
}
