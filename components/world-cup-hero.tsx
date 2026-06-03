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
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFifaNews } from "@/lib/fifa-news";
import { formatCountdown, formatDate } from "@/lib/format";
import { parseTeams } from "@/lib/teams";
import { fallbackTopScorerProfiles, fetchWorldCupTopScorers, type WorldCupTopScorer } from "@/lib/world-cup-top-scorers";
import type { Match } from "@/types/match";
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

type PopularTeam = ReturnType<typeof usePopularTeams>[number];

function PopularTeamsCard({ popularTeams, className = "" }: { popularTeams: PopularTeam[]; className?: string }) {
  return (
    <div className={`hero-card p-5 ${className}`}>
      <div className="relative mb-4 flex items-center justify-between border-b border-white/[0.04] pb-3">
        <div className="flex items-center gap-2"><Star className="h-4 w-4 text-volt" /><p className="text-sm font-semibold uppercase text-white">热门球队</p></div>
        <a href="/data" className="group inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition hover:text-volt">查看全部<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></a>
        <span className="absolute bottom-0 right-0 translate-y-1/2 whitespace-nowrap bg-[#0b0b0b] text-[9px] uppercase tracking-[0.12em] text-white/40">赔率</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {popularTeams.map((team, index) => {
          const opacities = ["/1", "/0.8", "/0.6", "/0.4", "/0.3"];
          const content = (
            <>
              <img src={team.flag} alt={team.name} className="h-4 w-6 shrink-0 rounded object-cover ring-1 ring-white/10" loading="lazy" />
              <span className="min-w-0 flex-1 truncate text-sm text-white/82 transition-colors group-hover:text-volt">{team.name}</span>
              <span className="tabular shrink-0 font-semibold" style={{ fontSize: "1rem", color: `rgb(255 154 31 ${opacities[index]})` }}>{team.pct}%</span>
            </>
          );

          return team.href ? (
            <Link key={team.code} href={team.href} className="group flex items-center gap-2 py-2 transition hover:opacity-90">
              {content}
            </Link>
          ) : (
            <div key={team.code} className="group flex items-center gap-2 py-2 transition hover:opacity-90">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WorldCupHero({ matches, firstMatch, progress, completedCount, ongoingCount, calendarUrl, webcalUrl, matchCount }: WorldCupHeroProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const { news: fifaNews, loading: newsLoading } = useFifaNews();
  const popularTeams = usePopularTeams();
  const [topScorers, setTopScorers] = useState<WorldCupTopScorer[]>(fallbackTopScorerProfiles);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    fetchWorldCupTopScorers()
      .then((items) => {
        if (active) setTopScorers(items.length ? items.slice(0, 5) : fallbackTopScorerProfiles);
      })
      .catch((error) => {
        console.warn("[WorldCupHero] top scorers unavailable:", error);
        if (active) setTopScorers(fallbackTopScorerProfiles);
      })

    return () => {
      active = false;
    };
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
  const progressMarker = Math.min(100, Math.max(0, progress || 0));

  return (
    <section className="space-y-5">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[.78fr_1.45fr_.78fr]">
        <motion.aside initial={{ opacity: 0, y: 16, filter: "blur(16px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.08, duration: 0.72, ease: [0.16, 1, 0.3, 1] }} className="grid gap-5">
          <div className="hero-card relative h-auto min-h-[230px] overflow-hidden p-5">
            <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_78%_62%,rgba(216,255,62,.18),transparent_30%),radial-gradient(circle_at_45%_48%,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:auto,12px_12px]" />
            <img
              src="https://digitalhub.fifa.com/transform/157d23bf-7e13-4d7b-949e-5d27d340987e/WC26_Logo?&io=transform:fill&quality=75"
              alt=""
              className="pointer-events-none absolute right-[calc(1rem+10vw)] top-[44px] h-[106px] w-auto object-contain opacity-90 drop-shadow-[0_12px_34px_rgba(0,0,0,.55)] sm:hidden"
              aria-hidden="true"
            />
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
            <div className="mb-5 hidden items-center justify-between border-b border-white/[0.04] pb-3 sm:flex">
              <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-volt" /><p className="text-sm font-semibold uppercase text-white">赛事进度</p></div>
              <span className="tabular text-sm text-volt">{progress}%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:divide-x sm:divide-white/[0.04]">
              <Metric label="比赛" value={matchCount || "--"} />
              <Metric label="完赛" value={completedCount} />
              <Metric label="进行中" value={ongoingCount} accent />
            </div>
            <div className="relative mt-[0.6rem] h-[18px]">
              <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_8px_rgba(0,0,0,.42)]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressMarker}%` }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} className="h-full rounded-full bg-gradient-to-r from-volt to-flare shadow-[0_0_22px_rgba(216,255,62,.45)]" />
              </div>
              <motion.div
                initial={{ left: "0%" }}
                animate={{ left: `${progressMarker}%` }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute top-1/2 grid h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 place-items-center"
                aria-hidden="true"
              >
                <motion.span
                  initial={{ opacity: 0, scale: 0.72, rotate: -18 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  className="grid h-[18px] w-[18px] place-items-center"
                >
                  <svg viewBox="0 0 32 32" className="h-[18px] w-[18px] drop-shadow-[0_0_10px_rgba(216,255,62,.42)]">
                    <circle cx="16" cy="16" r="14" fill="url(#football-glass)" />
                    <path d="m16 7.4 5.1 3.7-1.95 5.95h-6.3L10.9 11.1 16 7.4Z" fill="#111" />
                    <path d="m6.2 14.3 4.7-3.2 1.95 5.95-3.9 4.7-3.25-2.25c-.22-1.7-.05-3.48.5-5.2Zm19.6 0c.55 1.72.72 3.5.5 5.2l-3.25 2.25-3.9-4.7 1.95-5.95 4.7 3.2ZM11.35 26.85l-2.4-5.1 3.9-4.7h6.3l3.9 4.7-2.4 5.1a13.9 13.9 0 0 1-9.3 0Z" fill="#111" />
                    <path d="M9.2 21.95 5.9 19.7m16.9 2.25 3.3-2.25M12.85 17.05l-1.95-5.95m8.25 5.95 1.95-5.95m-1.95 5.95 3.9 4.7m-10.2-4.7-3.9 4.7" fill="none" stroke="rgba(255,255,255,.7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
                    <defs>
                      <radialGradient id="football-glass" cx="0" cy="0" r="1" gradientTransform="matrix(18 22 -22 18 10 7)">
                        <stop stopColor="#fff" />
                        <stop offset=".5" stopColor="#d8ff3e" stopOpacity=".92" />
                        <stop offset="1" stopColor="#ff9a1f" stopOpacity=".84" />
                      </radialGradient>
                    </defs>
                  </svg>
                </motion.span>
              </motion.div>
            </div>
          </div>

          <PopularTeamsCard popularTeams={popularTeams} className="hidden lg:block" />
        </motion.aside>

        <motion.div initial={{ opacity: 0, y: 16, filter: "blur(16px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.14, duration: 0.78, ease: [0.16, 1, 0.3, 1] }} className="grid gap-5">
          <div className="hero-card relative h-[288px] overflow-hidden p-0 sm:h-[330px]">
            <img src="/estadio-azteca-aerial.jpg" alt="Aerial view of Estadio Azteca" className="absolute inset-0 h-full w-full object-cover object-[78%_50%] opacity-[.82] saturate-[1.08]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,8,.98)_0%,rgba(5,8,8,.9)_34%,rgba(5,8,8,.42)_58%,rgba(5,8,8,.08)_100%),linear-gradient(0deg,rgba(5,8,8,.72)_0%,rgba(5,8,8,.08)_32%,rgba(5,8,8,.1)_100%),radial-gradient(circle_at_76%_52%,rgba(216,255,62,.2),transparent_26%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(216,255,62,.13),transparent_24%),radial-gradient(circle_at_68%_72%,rgba(255,154,31,.1),transparent_34%)]" />
            <div className="relative z-10 flex h-full flex-col items-center justify-between p-4 sm:p-8">
              <div className="flex w-full flex-col items-center">
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="flex shrink-0 items-center gap-3 text-xs uppercase tracking-[0.12em] text-white/52 sm:text-sm sm:tracking-[0.16em]"><span className="h-2 w-2 rounded-full bg-volt shadow-[0_0_16px_rgba(216,255,62,.85)]" />下一场比赛</div>
                  <p className="min-w-0 text-right text-sm font-semibold uppercase leading-5 tracking-[0.06em] text-white/72 sm:text-base sm:tracking-[0.08em]">{dateLabel}</p>
                </div>
                <div className="mt-4 flex w-full min-w-0 items-start justify-center gap-3 sm:mt-6 sm:gap-8">
                  <TeamSignal code={homeCode} image={teams?.home.image} name={teams?.home.name || "揭幕战"} />
                  <div className="flex h-12 items-center justify-center sm:h-16"><ArrowRight className="h-6 w-6 shrink-0 text-flare drop-shadow-[0_0_16px_rgba(255,154,31,.55)] sm:h-8 sm:w-8" /></div>
                  <TeamSignal code={awayCode} image={teams?.away.image} name={teams?.away.name || "官方赛程"} />
                </div>
              </div>
              <div className="mt-3 grid w-full max-w-sm grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[1.45rem] bg-black/34 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-2xl sm:mt-5 sm:p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/42">距离开赛</p>
                  <p className="mt-1 flex items-baseline text-3xl font-semibold leading-none text-volt sm:text-4xl" style={{ fontFamily: "ScreenMatrix, monospace" }}><span style={{ fontFamily: "Inter, system-ui, sans-serif" }}>{countdown.days}<span className="text-base font-normal text-white/38">天</span></span><span className="ml-2">{countdown.hours}</span><span className="countdown-colon text-3xl sm:text-4xl">:</span><span>{countdown.minutes}</span></p>
                </div>
                <div className="rounded-full bg-volt/15 p-3 text-volt shadow-[0_0_44px_rgba(216,255,62,.34)] ring-1 ring-volt/25 sm:p-4"><ArrowRight className="h-5 w-5 sm:h-7 sm:w-7" /></div>
              </div>
            </div>
          </div>

          <PopularTeamsCard popularTeams={popularTeams} className="lg:hidden" />

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
          <div className="hero-card hidden p-5 lg:block">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/[0.04] pb-3">
              <div><div className="flex items-center gap-2"><Newspaper className="h-4 w-4 text-volt" /><p className="text-sm font-semibold uppercase text-white">最新动态</p></div></div>
              <div className="flex items-center gap-3">
                {newsLoading && <span className="h-1.5 w-1.5 rounded-full bg-volt shadow-[0_0_12px_rgba(216,255,62,.75)]" />}
                <a href="/news" className="group inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition hover:text-volt">查看全部<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></a>
              </div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {fifaNews.map((item, index) => (
                <a key={`${item.id}-${item.href || index}`} href={item.href} target="_blank" rel="noreferrer" className="group grid min-h-[84px] grid-cols-[88px_minmax(0,1fr)] gap-3 py-3 transition hover:opacity-80">
                  {item.thumbnail ? (<img src={item.thumbnail} alt={item.tag} className="h-[58px] w-[88px] shrink-0 rounded-2xl object-cover ring-1 ring-white/10" loading="lazy" />) : (<span className="grid h-[58px] w-[88px] shrink-0 place-items-center rounded-2xl bg-volt/10 text-[10px] font-semibold uppercase tracking-[0.12em] text-volt ring-1 ring-volt/20">{item.tag.slice(0, 8)}</span>)}
                  <span className="flex min-w-0 flex-col justify-center">
                    <span className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-white/82 transition group-hover:text-volt">{item.title}</span>
                    <span className="mt-1 block truncate text-[10px] tracking-[0.08em] text-white/32">{item.source} · {item.date}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="hero-card p-5">
            <div className="relative mb-3 flex items-center justify-between border-b border-white/[0.04] pb-3">
              <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-volt" /><p className="text-sm font-semibold uppercase text-white">射手榜</p></div>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">实时数据<ArrowRight className="h-3.5 w-3.5" /></span>
              <span className="absolute bottom-0 right-0 w-5 translate-y-1/2 whitespace-nowrap bg-[#0b0b0b] text-center text-[9px] uppercase tracking-[0.12em] text-white/40">进球</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {topScorers.map((player, index) => (
                <Link key={player.id} href={`/players/${player.id}/`} className="group flex items-center gap-2 py-2 transition">
                  <span className={`tabular w-5 shrink-0 text-xs font-semibold transition-colors group-hover:text-volt ${index < 3 ? "text-volt" : "text-white/40"}`}>{index + 1}</span>
                  {player.photo ? (
                    <img src={player.photo} alt={player.name} className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/12" loading="lazy" />
                  ) : (
                    <span className="h-7 w-7 shrink-0 rounded-full bg-white/[0.06] ring-1 ring-white/10" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-white/82 transition-colors group-hover:text-volt">{player.name}</span>
                  <span className="flex w-16 shrink-0 items-center gap-1.5 text-left text-[10px] text-white/40 transition-colors group-hover:text-white/62">
                    {player.teamLogo && <img src={player.teamLogo} alt={player.teamName} className="h-3.5 w-3.5 shrink-0 rounded-full object-contain" loading="lazy" />}
                    <span className="min-w-0 truncate">{player.teamName}</span>
                  </span>
                  <span className="tabular w-5 shrink-0 text-center text-sm font-semibold text-volt transition-colors group-hover:text-white">{player.goals ?? "—"}</span>
                </Link>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
