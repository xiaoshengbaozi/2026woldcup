import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Download,
  Newspaper,
  Radio,
  Star,
  Trophy
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFifaNews } from "@/lib/fifa-news";
import { formatCountdown, formatDate } from "@/lib/format";
import { parseTeams } from "@/lib/teams";
import type { Match } from "@/types/match";
import { topScorers } from "./world-cup-hero/hero-data";
import { LiveMatchCard } from "./world-cup-hero/live-match-card";
import { Metric } from "./world-cup-hero/metric";
import { TeamSignal } from "./world-cup-hero/team-signal";
import { usePopularTeams } from "./world-cup-hero/use-popular-teams";

type WorldCupHeroProps = {
  matches: Match[];
  firstMatch: Match | null;
  progress: number;
  completedCount: number;
  ongoingCount: number;
  calendarUrl: string;
  webcalUrl: string;
  matchCount: number;
};

export function WorldCupHero({ matches, firstMatch, progress, completedCount, ongoingCount, calendarUrl, webcalUrl, matchCount }: WorldCupHeroProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const { news: fifaNews } = useFifaNews();
  const popularTeams = usePopularTeams();

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = formatCountdown(firstMatch?.start ?? null);
  const teams = useMemo(() => { if (!firstMatch) return null; return parseTeams(firstMatch.summary); }, [firstMatch]);
  const dateLabel = firstMatch ? formatDate(firstMatch.start) : "等待官方赛程";
  const homeCode = teams?.home.name.slice(0, 3).toUpperCase() || "FIFA";
  const awayCode = teams?.away.name.slice(0, 3).toUpperCase() || "2026";
  const liveNow = useMemo(() => {
    return matches
      .filter((match) => {
        const start = match.start.getTime();
        const end = match.end?.getTime() ?? start + 2 * 60 * 60 * 1000;
        return start <= currentTime && currentTime <= end;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 4);
  }, [currentTime, matches]);
  const upcomingMatches = useMemo(() => {
    return matches
      .filter((match) => match.start.getTime() > currentTime)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 4);
  }, [currentTime, matches]);
  const displayMatches = liveNow.length ? liveNow : upcomingMatches;

  return (
    <section className="space-y-5">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[.78fr_1.45fr_.78fr]">
        <motion.aside initial={{ opacity: 0, y: 16, filter: "blur(16px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.08, duration: 0.72, ease: [0.16, 1, 0.3, 1] }} className="grid gap-5">
          <div className="hero-card relative h-auto min-h-[230px] overflow-hidden p-5">
            <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_78%_62%,rgba(216,255,62,.18),transparent_30%),radial-gradient(circle_at_45%_48%,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:auto,12px_12px]" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">全球足球盛会</p>
                <h1 className="mt-2 text-[34px] uppercase leading-[0.95] text-white" style={{ fontFamily: "ScreenMatrix, monospace" }}>FIFA World<span className="block" style={{ color: "rgb(216 255 62 / 0.9)" }}>Cup 2026<span className="text-[0.45em] align-top">TM</span></span></h1>
                <p className="mt-3 text-xs uppercase tracking-[0.12em] text-white/56">2026 年 6 月 11 日 - 7 月 19 日</p>
                <p className="mt-1 text-xs uppercase tracking-[0.1em] text-white/48">美国 · 加拿大 · 墨西哥</p>
              </div>
              <div className="flex gap-2">
                <a href={calendarUrl} className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.035] px-3 py-2.5 text-xs font-semibold uppercase text-white ring-1 ring-volt/35 transition hover:bg-volt hover:text-black hover:shadow-[0_0_28px_rgba(216,255,62,.28)]"><Download className="h-4 w-4 text-volt transition group-hover:text-black" />下载日历</a>
                <a href={webcalUrl} className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.035] px-3 py-2.5 text-xs font-semibold uppercase text-white ring-1 ring-flare/40 transition hover:bg-flare hover:text-black hover:shadow-[0_0_28px_rgba(255,154,31,.28)]"><CalendarDays className="h-4 w-4 text-flare transition group-hover:text-black" />订阅日历</a>
              </div>
            </div>
          </div>

          <div className="hero-card p-5">
            <div className="mb-5 flex items-center justify-between border-b border-white/[0.04] pb-3">
              <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-volt" /><p className="text-sm font-semibold uppercase text-white">赛事进度</p></div>
              <span className="tabular text-sm text-volt">{progress}%</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/[0.04]">
              <Metric label="比赛" value={matchCount || "--"} />
              <Metric label="完赛" value={completedCount} />
              <Metric label="进行中" value={ongoingCount} accent />
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} className="h-full rounded-full bg-gradient-to-r from-volt to-flare shadow-[0_0_22px_rgba(216,255,62,.45)]" />
            </div>
          </div>

          <div className="hero-card p-5">
            <div className="relative mb-4 flex items-center justify-between border-b border-white/[0.04] pb-3">
              <div className="flex items-center gap-2"><Star className="h-4 w-4 text-volt" /><p className="text-sm font-semibold uppercase text-white">热门球队</p></div>
              <a href="/data" className="group inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition hover:text-volt">查看全部<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></a>
              <span className="absolute bottom-0 right-0 translate-y-1/2 whitespace-nowrap bg-[#0b0b0b] text-[9px] uppercase tracking-[0.12em] text-white/40">赔率</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {popularTeams.map((team, index) => {
                const opacities = ["/1", "/0.8", "/0.6", "/0.4", "/0.3"];
                return (<div key={team.code} className="flex items-center gap-2 py-2 transition hover:opacity-80">
                  <img src={team.flag} alt={team.name} className="h-4 w-6 shrink-0 rounded object-cover ring-1 ring-white/10" loading="lazy" />
                  <span className="min-w-0 flex-1 truncate text-sm text-white/82">{team.name}</span>
                  <span className="tabular shrink-0 font-semibold" style={{ fontSize: "1rem", color: `rgb(255 154 31 ${opacities[index]})` }}>{team.pct}%</span>
                </div>);
              })}
            </div>
          </div>
        </motion.aside>

        <motion.div initial={{ opacity: 0, y: 16, filter: "blur(16px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.14, duration: 0.78, ease: [0.16, 1, 0.3, 1] }} className="grid gap-5">
          <div className="hero-card relative h-[360px] overflow-hidden p-0 sm:h-[330px]">
            <img src="/estadio-azteca-aerial.jpg" alt="Aerial view of Estadio Azteca" className="absolute inset-0 h-full w-full object-cover object-[78%_50%] opacity-[.82] saturate-[1.08]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,8,.98)_0%,rgba(5,8,8,.9)_34%,rgba(5,8,8,.42)_58%,rgba(5,8,8,.08)_100%),linear-gradient(0deg,rgba(5,8,8,.72)_0%,rgba(5,8,8,.08)_32%,rgba(5,8,8,.1)_100%),radial-gradient(circle_at_76%_52%,rgba(216,255,62,.2),transparent_26%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(216,255,62,.13),transparent_24%),radial-gradient(circle_at_68%_72%,rgba(255,154,31,.1),transparent_34%)]" />
            <div className="relative z-10 flex h-full flex-col items-center justify-between p-4 sm:p-8">
              <div className="flex w-full flex-col items-center">
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-white/52 sm:text-sm sm:tracking-[0.16em]"><span className="h-2 w-2 rounded-full bg-volt shadow-[0_0_16px_rgba(216,255,62,.85)]" />下一场比赛</div>
                  <p className="text-sm font-semibold uppercase tracking-[0.06em] text-white/72 sm:text-base sm:tracking-[0.08em]">{dateLabel}</p>
                </div>
                <div className="mt-7 flex w-full min-w-0 items-start justify-center gap-3 sm:mt-6 sm:gap-8">
                  <TeamSignal code={homeCode} image={teams?.home.image} name={teams?.home.name || "揭幕战"} />
                  <div className="flex h-12 items-center justify-center sm:h-16"><ArrowRight className="h-6 w-6 shrink-0 text-flare drop-shadow-[0_0_16px_rgba(255,154,31,.55)] sm:h-8 sm:w-8" /></div>
                  <TeamSignal code={awayCode} image={teams?.away.image} name={teams?.away.name || "官方赛程"} />
                </div>
              </div>
              <div className="mt-5 w-full max-w-sm grid gap-3 rounded-[1.45rem] bg-black/34 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-2xl sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/42">距离开赛</p>
                  <p className="mt-1 flex items-baseline text-3xl font-semibold leading-none text-volt sm:text-4xl" style={{ fontFamily: "ScreenMatrix, monospace" }}><span style={{ fontFamily: "Inter, system-ui, sans-serif" }}>{countdown.days}<span className="text-base font-normal text-white/38">天</span></span><span className="ml-2">{countdown.hours}</span><span className="countdown-colon text-3xl sm:text-4xl">:</span><span>{countdown.minutes}</span></p>
                </div>
                <div className="hidden rounded-full bg-volt/15 p-4 text-volt shadow-[0_0_44px_rgba(216,255,62,.34)] ring-1 ring-volt/25 sm:block"><ArrowRight className="h-7 w-7" /></div>
              </div>
            </div>
          </div>

          <div className="hero-card p-5">
            <div className="mb-5 flex items-center justify-between border-b border-white/[0.04] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5"><span className="live-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.7)]" /></span>
                <p className="text-sm font-semibold uppercase tracking-wide text-white">正在直播</p>
                <Radio className="h-3.5 w-3.5 text-red-400 animate-pulse" />
              </div>
              <a href="/matches" className="group inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition hover:text-volt">查看全部<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></a>
            </div>
            {displayMatches.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {displayMatches.map((match) => (<LiveMatchCard key={match.uid} match={match} isLive={liveNow.length > 0} />))}
              </div>
            ) : (
              <div className="rounded-3xl bg-white/[0.035] px-5 py-6 text-center ring-1 ring-white/[0.06]">
                <p className="text-sm font-semibold text-white/78">暂无正在直播的比赛</p>
                <p className="mt-2 text-xs leading-5 text-white/42">直播窗口会自动匹配官方赛程中的真实对阵。</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.aside initial={{ opacity: 0, y: 16, filter: "blur(16px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.2, duration: 0.72, ease: [0.16, 1, 0.3, 1] }} className="grid gap-5">
          <div className="hero-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/[0.04] pb-3">
              <div><div className="flex items-center gap-2"><Newspaper className="h-4 w-4 text-volt" /><p className="text-sm font-semibold uppercase text-white">最新动态</p></div></div>
              <a href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026" target="_blank" rel="noreferrer" className="group inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition hover:text-volt">查看全部<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></a>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {fifaNews.map((item) => (
                <a key={item.title} href={item.href} target="_blank" rel="noreferrer" className="group grid grid-cols-[90px_1fr] gap-3 py-3 transition hover:opacity-80">
                  {item.thumbnail ? (<img src={item.thumbnail} alt={item.tag} className="h-[60px] w-[90px] shrink-0 rounded-xl object-cover ring-1 ring-white/10" loading="lazy" />) : (<span className="grid h-[60px] w-[90px] shrink-0 place-items-center rounded-xl bg-volt/10 text-xs font-semibold text-volt ring-1 ring-volt/20">FIFA</span>)}
                  <span className="min-w-0"><span className="line-clamp-2 block text-sm leading-5 text-white/82 transition group-hover:text-volt">{item.title}</span><span className="mt-1 block text-[10px] tracking-[0.08em] text-white/32">{item.date}</span></span>
                </a>
              ))}
            </div>
          </div>

          <div className="hero-card p-5">
            <div className="relative mb-3 flex items-center justify-between border-b border-white/[0.04] pb-3">
              <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-volt" /><p className="text-sm font-semibold uppercase text-white">射手榜</p></div>
              <a href="#" className="group inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition hover:text-volt">查看全部<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></a>
              <span className="absolute bottom-0 right-0 w-5 translate-y-1/2 whitespace-nowrap bg-[#0b0b0b] text-center text-[9px] uppercase tracking-[0.12em] text-white/40">进球</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {topScorers.map((player, index) => (
                <div key={player.name} className="flex items-center gap-2 py-2">
                  <span className={`tabular w-5 shrink-0 text-xs font-semibold ${index < 3 ? "text-volt" : "text-white/40"}`}>{index + 1}</span>
                  <img src={player.flag} alt={player.nation} className="h-4 w-6 shrink-0 rounded object-cover ring-1 ring-white/10" loading="lazy" />
                  <span className="min-w-0 flex-1 truncate text-sm text-white/82">{player.name}</span>
                  <span className="w-12 shrink-0 text-left text-[10px] text-white/40">{player.nation}</span>
                  <span className="tabular w-5 shrink-0 text-center text-sm font-semibold text-volt">{player.goals}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
