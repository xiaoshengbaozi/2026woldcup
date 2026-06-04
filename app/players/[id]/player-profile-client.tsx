"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeAlert,
  BarChart3,
  CalendarClock,
  Crown,
  Dribbble,
  ExternalLink,
  GitCompareArrows,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackToTopButton } from "@/components/back-to-top-button";
import { MobileNavBar } from "@/components/mobile-nav-bar";
import { NavBar } from "@/components/nav-bar";
import { localizeClubName, localizeCountryName } from "@/lib/football-localization-client";
import { getTeamLandscapePathByCode } from "@/lib/team-landscapes";
import {
  fetchApiFootballPlayerProfileData,
  fetchOneVsOnePlayerSummary,
  type PlayerProfileData,
} from "@/lib/player-profile";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

type PlayerRow = {
  apiPlayerId: number | null;
  teamCode: string;
  countryCn: string;
  nameEn: string;
  nameCn: string;
  positionCn: string;
  number: number | null;
  photo: string;
};

type PlayerArticle = {
  apiPlayerId: number;
  nameEn: string;
  nameCn: string;
  countryCn: string;
  teamCode: string;
  photo: string;
  sourceUrl: string;
  title: string;
  published: string;
  deck: string;
  birthDate: string;
  teams: string;
  position: string;
  skills: string;
  excerpt: string;
  coverImage?: string;
  storyImages?: string[];
  articleCn: {
    title: string;
    published: string;
    sections: Array<{
      heading: string;
      paragraphs: string[];
    }>;
  } | null;
};

type Props = {
  playerId: string;
  nameHint: string;
  row: PlayerRow | null;
  article?: PlayerArticle | null;
};

type ProfilePanelTab = "overview" | "story" | "career";

const profilePanelTabs: { id: ProfilePanelTab; label: string }[] = [
  { id: "overview", label: "概览" },
  { id: "story", label: "故事" },
  { id: "career", label: "轨迹" },
];

const FIFA_CODE_TO_FLAG: Record<string, string> = {
  MEX:"mx",USA:"us",CAN:"ca",ARG:"ar",BRA:"br",COL:"co",ECU:"ec",PAR:"py",URU:"uy",
  JPN:"jp",IRN:"ir",UZB:"uz",KOR:"kr",JOR:"jo",AUS:"au",QAT:"qa",SAU:"sa",IRQ:"iq",
  MAR:"ma",TUN:"tn",EGY:"eg",DZA:"dz",GHA:"gh",CPV:"cv",RSA:"za",SEN:"sn",CIV:"ci",
  COD:"cd",NZL:"nz",CUW:"cw",HAI:"ht",PAN:"pa",ENG:"gb-eng",FRA:"fr",GER:"de",ESP:"es",
  POR:"pt",NED:"nl",BEL:"be",CRO:"hr",SUI:"ch",AUT:"at",NOR:"no",SCO:"gb-sct",SWE:"se",
  TUR:"tr",CZE:"cz",BIH:"ba",SRB:"rs",POL:"pl",UKR:"ua",DEN:"dk",ITA:"it",MLI:"ml",
  BFA:"bf",CMR:"cm",CGO:"cd",ZAM:"zm",NIG:"ng",GUI:"gn",BEN:"bn",RWA:"rw",CDF:"cd",
  SUR:"sr",JAM:"jm",GUY:"gy",HON:"hn",SLV:"sv",GUA:"gt",NIC:"ni",BAR:"bb",TRI:"tt",
  DMA:"dm",GRN:"gd",LCA:"lc",VIN:"vc",SKN:"kn",MAG:"mg",COM:"km",LBR:"lr",LES:"ls",
  BOT:"bw",SWZ:"sz",NAM:"na",MOZ:"mz",ANG:"ao",ETH:"et",ERI:"er",SUD:"sd",SSD:"ss",
  SOM:"so",KEN:"ke",UGA:"ug",TAN:"tz",BDI:"bi",CHA:"td",CAF:"cf",GAB:"ga",GNQ:"gq",
  STP:"st",PRK:"kp",CHN:"cn",TWN:"tw",HKG:"hk",MAS:"my",SIN:"sg",PHI:"ph",THA:"th",
  VIE:"vn",MYA:"mm",LAO:"la",CAM:"kh",BRN:"bn",TLS:"tl",IND:"in",PAK:"pk",BAN:"bd",
  SRI:"lk",NEP:"np",AFG:"af",SYR:"sy",YEM:"ye",LBN:"lb",PSE:"ps",
  KUW:"kw",BHR:"bh",OMA:"om",UAE:"ae",ALB:"al",ARM:"am",AZE:"az",BLR:"by",
  GEO:"ge",KAZ:"kz",KGZ:"kg",TJK:"tj",TKM:"tm",MDA:"md",ISL:"is",LUX:"lu",MLT:"mt",
  CYP:"cy",AND:"ad",LIE:"li",SMR:"sr",MCO:"mc",VAT:"va",GIB:"gi",FRO:"fo",EST:"ee",
  LAT:"lv",LTU:"lt",
};

/* ────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────── */

export function PlayerProfileClient({ playerId, nameHint, row, article }: Props) {
  const [data, setData] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [oneVsOneLoading, setOneVsOneLoading] = useState(false);
  const [activeMobilePanel, setActiveMobilePanel] = useState<ProfilePanelTab>("overview");
  const panelTabsSentinelRef = useRef<HTMLDivElement>(null);
  const panelTabsRef = useRef<HTMLDivElement>(null);
  const [panelTabsPinned, setPanelTabsPinned] = useState(false);
  const [panelTabsHeight, setPanelTabsHeight] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setOneVsOneLoading(false);
    fetchApiFootballPlayerProfileData(playerId)
      .then((payload) => {
        if (!active) return;

        setData(payload);
        setLoading(false);

        const player = payload.player;
        const fullName = [player?.firstname, player?.lastname].filter(Boolean).join(" ") || player?.name || nameHint;
        if (!fullName) return;

        setOneVsOneLoading(true);
        fetchOneVsOnePlayerSummary(fullName)
          .then((oneVsOne) => {
            if (active) setData((current) => current ? { ...current, oneVsOne } : current);
          })
          .catch((error) => {
            console.warn("[PlayerProfile] 1vs1 unavailable:", error);
          })
          .finally(() => {
            if (active) setOneVsOneLoading(false);
          });
      })
      .catch((error) => {
        console.warn("[PlayerProfile] unavailable:", error);
        if (active) setData(null);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [playerId, nameHint]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 1023px)");

    const syncPinnedState = () => {
      if (!mobileQuery.matches) {
        setPanelTabsPinned(false);
        setPanelTabsHeight(0);
        return;
      }

      const sentinel = panelTabsSentinelRef.current;
      const tabs = panelTabsRef.current;
      if (!sentinel || !tabs) return;

      const nextHeight = tabs.offsetHeight;
      setPanelTabsHeight((current) => (current === nextHeight ? current : nextHeight));
      setPanelTabsPinned(sentinel.getBoundingClientRect().top <= 0);
    };

    syncPinnedState();
    window.addEventListener("scroll", syncPinnedState, { passive: true });
    window.addEventListener("resize", syncPinnedState);
    mobileQuery.addEventListener?.("change", syncPinnedState);

    return () => {
      window.removeEventListener("scroll", syncPinnedState);
      window.removeEventListener("resize", syncPinnedState);
      mobileQuery.removeEventListener?.("change", syncPinnedState);
    };
  }, []);

  const scrollToPanelHead = () => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    const sentinel = panelTabsSentinelRef.current;
    if (!sentinel) return;

    const target = sentinel.getBoundingClientRect().top + window.scrollY;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: Math.max(target - 12, 0), behavior: "smooth" });
    });
  };

  const handleMobilePanelChange = (tab: ProfilePanelTab) => {
    if (tab === activeMobilePanel) return;
    setActiveMobilePanel(tab);
    scrollToPanelHead();
  };

  const player = data?.player;
  const displayName = row?.nameCn || player?.name || nameHint || `#${playerId}`;
  const englishName = player?.name || row?.nameEn || nameHint;
  const fullName = [player?.firstname, player?.lastname].filter(Boolean).join(" ");
  const photo = player?.photo || row?.photo || data?.oneVsOne?.player?.image || "";
  const currentTeam = localizeClubName(data?.currentTeam?.name || data?.oneVsOne?.player?.teamName) || "暂无俱乐部数据";
  const currentTeamLogo = data?.currentTeam?.logo || "";
  const total = useMemo(() => summarizeStats(data?.seasonStats ?? []), [data?.seasonStats]);
  const latestTransfers = (data?.transfers ?? []).slice(0, 5);
  const trophies = (data?.trophies ?? []).slice(0, 8);
  const sidelined = (data?.sidelined ?? []).slice(0, 4);
  const heroLandscape = getTeamLandscapePathByCode(row?.teamCode);

  const radarStats = useMemo(() => buildRadarStats(data), [data]);
  const careerTimeline = useMemo(() => buildCareerTimeline(latestTransfers, trophies), [latestTransfers, trophies]);

  return (
    <main className="player-profile-page relative min-h-screen overflow-hidden bg-ink-950 text-white">
      {/* ── Background Effects ── */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[min(800px,100vw)] -translate-x-1/2 rounded-full bg-volt/[0.07] blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[340px] w-[min(460px,80vw)] rounded-full bg-volt/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[280px] w-[min(380px,80vw)] rounded-full bg-flare/[0.04] blur-[100px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-4 pb-28 sm:px-6 sm:py-5 sm:pb-28 lg:px-8 lg:pb-5">
        {/* ── Site Navigation ── */}
        <div className="relative z-10"><NavBar /></div>

        {/* ── Profile Hero Card ── */}
        <section className="player-profile-hero hero-card relative z-0 mt-16 overflow-visible pt-20 pb-6 px-6 sm:px-8 sm:pb-8">
          {heroLandscape && (
            <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroLandscape}
                alt=""
                className="h-full w-full object-cover object-center opacity-65 saturate-100"
              />
              <div className="player-profile-hero-shade absolute inset-0 bg-[linear-gradient(135deg,rgba(5,8,8,0.78)_0%,rgba(5,8,8,0.34)_48%,rgba(5,8,8,0.72)_100%),linear-gradient(to_bottom,rgba(5,8,8,0.1)_0%,rgba(5,8,8,0.74)_100%)]" />
              <div className="player-profile-hero-fade absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950/70 to-transparent" />
            </div>
          )}

          {/* Top glow line */}
          <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-volt/40 to-transparent" />

          {/* Top-left: Back button */}
          <Link
            href="/players/"
            className="group absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/60 ring-1 ring-white/[0.08] backdrop-blur-md transition-all hover:bg-volt/[0.1] hover:text-volt hover:ring-volt/20 sm:left-6 sm:top-5"
          >
            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
            返回球员
          </Link>

          {/* Top-right: Follow button */}
          <button className="group absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/60 ring-1 ring-white/[0.08] backdrop-blur-md transition-all hover:bg-volt/[0.1] hover:text-volt hover:ring-volt/20 sm:right-6 sm:top-5">
            <Star className="h-3 w-3" />
            关注
          </button>

          {/* Avatar — overlapping top edge */}
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-volt/25 via-volt/10 to-transparent blur-xl" />
              <div className="relative h-28 w-28 overflow-hidden rounded-full ring-[3px] ring-volt/30 ring-offset-4 ring-offset-ink-950 sm:h-32 sm:w-32 sm:ring-[4px]">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={englishName} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-white/[0.06]">
                    <UserRound className="h-12 w-12 text-white/20" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Names — centered */}
          <div className="relative z-10 text-center">
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {displayName}
            </h1>
            <p className="mt-1.5 text-sm text-white/40 sm:text-base">{fullName || englishName}</p>
          </div>

          {/* Info Row */}
          <div className="relative z-10 mt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/55">
              <span className="inline-flex items-center gap-1.5">
                {row?.teamCode && FIFA_CODE_TO_FLAG[row.teamCode] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://flagcdn.com/${FIFA_CODE_TO_FLAG[row.teamCode]}.svg`}
                    alt=""
                    className="h-3.5 w-5 rounded-sm object-cover"
                  />
                )}
                {row?.countryCn || localizeCountryName(player?.nationality) || "国家队"}
              </span>
              <span className="text-white/20">|</span>
              <span>{row?.positionCn || player?.position || "位置待更新"}</span>
              {row?.number && (
                <>
                  <span className="text-white/20">|</span>
                  <span>{row.number}号</span>
                </>
              )}
              <span className="text-white/20">|</span>
              <span className="inline-flex items-center gap-1.5 text-white/65">
                {currentTeamLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentTeamLogo}
                    alt=""
                    className="h-4 w-4 rounded-full bg-white/[0.08] object-contain ring-1 ring-white/[0.08]"
                  />
                )}
                {currentTeam}
              </span>
              {player?.height && (
                <>
                  <span className="text-white/20">|</span>
                  <span>身高 <span className="font-mono text-white/65">{player.height}</span></span>
                </>
              )}
              {player?.weight && (
                <>
                  <span className="text-white/20">|</span>
                  <span>体重 <span className="font-mono text-white/65">{player.weight}</span></span>
                </>
              )}
              {player?.birth?.date && (
                <>
                  <span className="text-white/20">|</span>
                  <span>生日 <span className="font-mono text-white/65">{player.birth.date}</span></span>
                </>
              )}
            </div>
            {total.rating && (
              <div className="flex items-center justify-center gap-1.5">
                <span className="flex gap-0.5">
                  {[1,2,3,4,5].map((i) => {
                    const filled = Number(total.rating) / 2 >= i;
                    const half = !filled && Number(total.rating) / 2 >= i - 0.5;
                    return (
                      <svg key={i} className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                        <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.26l-4.94 2.45.94-5.5-4-3.9 5.53-.8L10 1.5z"
                          fill={filled ? "rgb(216,255,62)" : half ? "url(#half-star)" : "rgba(255,255,255,0.1)"}
                          stroke={filled || half ? "rgb(216,255,62)" : "rgba(255,255,255,0.15)"}
                          strokeWidth="1" />
                      </svg>
                    );
                  })}
                </span>
                <span className="font-mono text-sm font-bold text-volt/80">{total.rating}</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Quick Access Icon Row ── */}
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {quickAccessItems.map((item) => (
            <motion.div
              key={item.label}
              whileHover={{ y: -2, scale: 1.04 }}
                className="player-quick-card group flex flex-col items-center gap-2 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06] transition-colors hover:bg-volt/[0.08] hover:ring-volt/20 cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt/[0.1] text-volt/70 transition-colors group-hover:bg-volt/20 group-hover:text-volt">
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 group-hover:text-white/60 sm:text-xs">
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* ── Main Content Area ── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hero-card p-12 text-center"
            >
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-volt/30 border-t-volt" />
              <p className="text-sm text-white/50">正在同步球员数据...</p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* ── Three Column Layout ── */}
              <div
                ref={panelTabsSentinelRef}
                className="lg:hidden"
                style={{ height: panelTabsPinned ? panelTabsHeight : 0 }}
              />
              {panelTabsPinned ? (
                <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[calc(env(safe-area-inset-top)+6.25rem)] bg-black/72 backdrop-blur-2xl [mask-image:linear-gradient(to_bottom,black_0%,black_56%,rgba(0,0,0,0)_100%)] lg:hidden" />
              ) : null}
              <div
                ref={panelTabsRef}
                className={`${
                  panelTabsPinned
                    ? "fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+0.25rem)] z-[70] px-3 py-2"
                    : "relative -mx-3 bg-black/58 px-3 py-2 backdrop-blur-2xl"
                } lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none`}
              >
              <div className="hero-card grid grid-cols-3 gap-1 p-1 lg:hidden">
                {profilePanelTabs.map((tab) => {
                  const active = activeMobilePanel === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleMobilePanelChange(tab.id)}
                      className={`rounded-2xl px-3 py-2 text-xs font-black transition ${
                        active
                          ? "bg-volt text-black shadow-[0_0_22px_rgba(216,255,62,.18)]"
                          : "text-white/45 hover:bg-white/[0.05] hover:text-white/70"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[.78fr_1.45fr_.78fr]">
                <div className={`${activeMobilePanel === "overview" ? "block" : "hidden"} space-y-5 lg:block`}>
                  <DashPanel title="能力雷达" icon={BarChart3} center>
                    <div className="flex justify-center py-4">
                      <PlayerRadar stats={radarStats} />
                    </div>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      {radarStats.map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-xl bg-white/[0.03] px-3 py-2 text-center ring-1 ring-white/[0.04]"
                        >
                          <p
                            className="text-lg font-bold text-volt tabular-nums"
                            style={{ fontFamily: "ScreenMatrix, monospace" }}
                          >
                            {stat.value}
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-white/35">
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </DashPanel>

                  <DashPanel title="当前效力" icon={Shield} accent>
                    <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.05]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-volt/10 ring-1 ring-white/[0.06]">
                          {currentTeamLogo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={currentTeamLogo} alt="" className="h-8 w-8 object-contain" />
                          ) : (
                            <Shield className="h-6 w-6 text-volt/70" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white/88">{currentTeam}</p>
                          <p className="mt-0.5 text-xs text-white/40">俱乐部</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <StatBlock label="出场" value={total.appearances} />
                      <StatBlock label="分钟" value={total.minutes} />
                      <StatBlock label="进球" value={total.goals} accent />
                      <StatBlock label="助攻" value={total.assists} accent />
                    </div>

                    <div className="mt-5 space-y-2">
                      {(data?.seasonStats ?? []).slice(0, 4).map((item, index) => (
                        <div
                          key={`${item.league?.id}-${index}`}
                          className="flex items-center justify-between rounded-xl bg-white/[0.035] px-4 py-3 ring-1 ring-white/[0.05] transition-colors hover:bg-white/[0.055]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white/78">
                              {item.league?.name || "赛事"}
                            </p>
                            <p className="mt-0.5 text-xs text-white/35">
                              {item.team?.name || currentTeam}
                            </p>
                          </div>
                          <div className="ml-3 flex items-center gap-3">
                            <span className="text-xs text-white/40">
                              {item.games?.appearences ?? 0}场
                            </span>
                            <span className="rounded-lg bg-volt/10 px-2.5 py-1 font-mono text-xs font-bold text-volt">
                              {item.games?.minutes ?? 0}&#x2032;
                            </span>
                          </div>
                        </div>
                      ))}
                      {!(data?.seasonStats ?? []).length && <EmptyState text="暂无赛季统计数据" />}
                    </div>
                  </DashPanel>

                  <DashPanel title="扩展档案" icon={Star}>
                    {data?.oneVsOne?.found ? (
                      <a
                        href={data.oneVsOne.url || "https://one-versus-one.com/"}
                        target="_blank"
                        rel="noreferrer"
                        className="group mb-3 flex items-center justify-between rounded-xl bg-volt/[0.06] p-3.5 ring-1 ring-volt/12 transition-all hover:bg-volt/[0.1] hover:ring-volt/20"
                      >
                        <div>
                          <p className="text-sm font-bold text-white/80">1vs1 档案</p>
                          <p className="mt-0.5 text-xs text-white/38">
                            {localizeCountryName(data.oneVsOne.player?.nationality || player?.nationality) || ""}
                            {data.oneVsOne.player?.teamName ? ` · ${localizeClubName(data.oneVsOne.player.teamName)}` : ""}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-volt/50 transition-transform group-hover:translate-x-0.5 group-hover:text-volt" />
                      </a>
                    ) : oneVsOneLoading ? (
                      <EmptyState text="正在同步 1vs1 扩展档案" />
                    ) : (
                      <EmptyState text="暂无 1vs1 扩展档案" />
                    )}

                    <div className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.05]">
                      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white/68">
                        <BadgeAlert className="h-4 w-4 text-rose-300/60" />
                        伤停记录
                      </div>
                      {sidelined.length ? (
                        <div className="space-y-1.5">
                          {sidelined.map((item, index) => (
                            <p key={`${item.start}-${index}`} className="text-xs text-white/40">
                              {item.type || "伤停"} &middot; {item.start || "未知"} - {item.end || "未知"}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/30">暂无伤停数据</p>
                      )}
                    </div>
                  </DashPanel>
                </div>

                <div className={`${activeMobilePanel === "story" ? "block" : "hidden"} space-y-5 lg:block`}>
                  {article?.articleCn ? (
                    <PlayerArticleTimeline article={article} />
                  ) : article ? (
                    <PlayerArticlePreview article={article} />
                  ) : (
                    <FamePlaceholder
                      name={displayName}
                      photo={photo || row?.photo}
                      country={row?.countryCn || localizeCountryName(player?.nationality)}
                    />
                  )}
                </div>

                <div className={`${activeMobilePanel === "career" ? "block" : "hidden"} space-y-5 lg:block`}>
                  <DashPanel title="职业轨迹" icon={CalendarClock}>
                    <div className="space-y-2">
                      {careerTimeline.map((item, index) => (
                        <div
                          key={`${item.kind}-${item.date}-${index}`}
                          className="relative rounded-xl bg-white/[0.035] p-3.5 ring-1 ring-white/[0.05]"
                        >
                          {index < careerTimeline.length - 1 && (
                            <div className="absolute -bottom-2.5 left-5 h-2.5 w-px bg-white/10" />
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${item.kind === "honor" ? "bg-volt/[0.12] text-volt" : "bg-white/[0.06] text-white/45"}`}>
                                {item.kind === "honor" ? <Crown className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
                              </span>
                              <p className="truncate text-xs font-bold text-white/70">{item.date}</p>
                            </div>
                            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/40">
                              {item.kind === "honor" ? "荣誉" : "转会"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-white/62">{item.title}</p>
                          {item.detail && <p className="mt-1 text-xs text-white/38">{item.detail}</p>}
                        </div>
                      ))}
                      {!careerTimeline.length && <EmptyState text="暂无职业轨迹数据" />}
                    </div>
                  </DashPanel>
                </div>
              </div>

              {/* ── Bottom Info Row ── */}
              <div className="flex flex-wrap items-center justify-between gap-4 hero-card px-6 py-4">
                <div className="flex items-center gap-6 text-xs text-white/35">
                  <span>
                    API ID: <span className="font-mono text-white/55">{playerId}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-volt/30">
                  <Sparkles className="h-3 w-3" />
                  Powered by API-Football
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <MobileNavBar />
      <BackToTopButton />
    </main>
  );
}

function PlayerArticleTimeline({ article }: { article: PlayerArticle }) {
  const sections = article.articleCn?.sections ?? [];
  const storyImages = article.storyImages ?? [];
  const inlineImages = [article.coverImage || article.photo, ...storyImages].filter(Boolean);

  return (
    <section className="hero-card overflow-hidden p-5 sm:p-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-volt/[0.08] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-volt ring-1 ring-volt/15">
          <Sparkles className="h-3.5 w-3.5" />
          FIFA Story
        </div>
        <h2 className="mt-4 text-xl font-black leading-snug text-white sm:text-2xl">{article.title}</h2>
        <p className="mt-2 text-xs text-white/38">{article.published}</p>
      </div>

      <div className="mt-6 space-y-4">
        {sections.slice(0, 6).map((section, index) => {
          const image = inlineImages[index % inlineImages.length];
          return (
            <article key={`${section.heading}-${index}`} className="rounded-[1.35rem] bg-white/[0.03] p-4 ring-1 ring-white/[0.055]">
              {image && index < inlineImages.length && (
                <div className="mb-4 overflow-hidden rounded-2xl bg-white/[0.035] ring-1 ring-white/[0.06]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={`${article.title} ${index + 1}`}
                    className="aspect-[16/9] h-full w-full object-cover transition duration-700 hover:scale-105"
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-volt/[0.1] text-[11px] font-black text-volt">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-sm font-black text-white/82 sm:text-base">{section.heading}</h3>
              </div>
              <div className="mt-3 space-y-3">
                {section.paragraphs.slice(0, 3).map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-white/55">
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────
   Radar Chart Component (SVG Pentagon)
   ──────────────────────────────────────────── */

function PlayerArticlePreview({ article }: { article: PlayerArticle }) {
  const storyImages = [article.coverImage || article.photo, ...(article.storyImages ?? [])].filter(Boolean);

  return (
    <section className="hero-card overflow-hidden p-5 sm:p-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-volt/[0.08] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-volt ring-1 ring-volt/15">
          <Sparkles className="h-3.5 w-3.5" />
          FIFA Story
        </div>
        <h2 className="mt-4 text-xl font-black leading-snug text-white sm:text-2xl">{article.title}</h2>
        <p className="mt-2 text-xs text-white/38">{article.published}</p>
      </div>

      {storyImages[0] && (
        <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-white/[0.035] ring-1 ring-white/[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={storyImages[0]}
            alt={article.title}
            className="aspect-[16/10] h-full w-full object-cover transition duration-700 hover:scale-105"
          />
        </div>
      )}

      <div className="mt-5 rounded-[1.35rem] bg-white/[0.03] p-4 ring-1 ring-white/[0.055]">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-volt/[0.1] text-[11px] font-black text-volt">
            01
          </span>
          <h3 className="text-sm font-black text-white/82 sm:text-base">官方故事已接入</h3>
        </div>
        <p className="mt-3 text-sm leading-7 text-white/55">{article.deck || article.excerpt}</p>
        {article.sourceUrl && (
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="group mt-4 inline-flex items-center gap-2 rounded-full bg-white/[0.045] px-4 py-2 text-xs font-black text-white/70 ring-1 ring-white/[0.07] transition hover:bg-volt/[0.1] hover:text-volt hover:ring-volt/20"
          >
            查看 FIFA 原文
            <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        )}
      </div>

      {storyImages.length > 1 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {storyImages.slice(1, 3).map((image, index) => (
            <div key={image} className="overflow-hidden rounded-2xl bg-white/[0.035] ring-1 ring-white/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={`${article.title} ${index + 2}`}
                className="aspect-[16/10] h-full w-full object-cover transition duration-700 hover:scale-105"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type RadarStat = { label: string; value: number };

function FamePlaceholder({ name, photo, country }: { name: string; photo?: string; country?: string }) {
  return (
    <section className="hero-card overflow-hidden p-5 sm:p-6">
      <div className="inline-flex items-center gap-2 rounded-full bg-volt/[0.08] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-volt ring-1 ring-volt/15">
        <Sparkles className="h-3.5 w-3.5" />
        一球成名
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.5rem] bg-white/[0.035] ring-1 ring-white/[0.06]">
        <div className="relative aspect-[16/11]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={name} className="h-full w-full object-cover opacity-75" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-white/[0.035]">
              <UserRound className="h-12 w-12 text-white/18" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/22 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <h2 className="text-2xl font-black text-white sm:text-3xl">{name}</h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              {country ? `${country} · ` : ""}FIFA Story 暂未接入，先保留一张聚焦高光时刻的占位卡。
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {["首秀", "爆点", "舞台"].map((label) => (
          <div key={label} className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.055]">
            <p className="text-xs font-black text-volt/70">{label}</p>
            <p className="mt-2 text-xs leading-5 text-white/38">等待补充关键比赛与人物故事。</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlayerRadar({ stats }: { stats: RadarStat[] }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 105;
  const levels = 5;
  const n = stats.length;

  if (n === 0) return null;

  // Generate polygon points for each level and the data shape
  const getPoint = (index: number, radius: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Grid polygons
  const gridPolygons = Array.from({ length: levels }, (_, i) => {
    const r = (maxRadius / levels) * (i + 1);
    return Array.from({ length: n }, (_, j) => getPoint(j, r))
      .map((p) => `${p.x},${p.y}`)
      .join(" ");
  });

  // Data polygon
  const dataPoints = stats.map((stat, i) => {
    const r = (stat.value / 100) * maxRadius;
    return getPoint(i, r);
  });
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Axis lines
  const axisLines = Array.from({ length: n }, (_, i) => {
    const end = getPoint(i, maxRadius);
    return { x1: cx, y1: cy, x2: end.x, y2: end.y };
  });

  // Label positions
  const labelRadius = maxRadius + 22;
  const labels = stats.map((stat, i) => {
    const p = getPoint(i, labelRadius);
    return { ...stat, x: p.x, y: p.y };
  });

  return (
    <div className="relative">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Glow filter */}
        <defs>
          <filter id="radar-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(216, 255, 62)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(216, 255, 62)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grid polygons */}
        {gridPolygons.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Data polygon - glow layer */}
        <polygon
          points={dataPath}
          fill="url(#radar-fill)"
          stroke="rgb(216, 255, 62)"
          strokeWidth="2"
          filter="url(#radar-glow)"
          opacity="0.6"
        />

        {/* Data polygon - main */}
        <polygon
          points={dataPath}
          fill="url(#radar-fill)"
          stroke="rgb(216, 255, 62)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="rgb(216, 255, 62)" opacity="0.3" />
            <circle cx={p.x} cy={p.y} r="3" fill="rgb(216, 255, 62)" />
          </g>
        ))}

        {/* Labels */}
        {labels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white/50 text-[10px] font-semibold"
          >
            {label.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────── */

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Shield;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl p-3.5 ring-1 backdrop-blur-xl transition-colors ${
        accent
          ? "bg-volt/[0.07] ring-volt/15 hover:bg-volt/[0.1]"
          : "bg-white/[0.05] ring-white/[0.07] hover:bg-white/[0.07]"
      }`}
    >
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
          accent ? "bg-volt/15 text-volt" : "bg-white/[0.06] text-white/40"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">{label}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-white/85">{value}</p>
      </div>
    </div>
  );
}

function DashPanel({
  title,
  icon: Icon,
  children,
  accent,
  center,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  accent?: boolean;
  center?: boolean;
}) {
  return (
    <section
      className="hero-card overflow-hidden p-5"
    >
      <div
        className={`mb-4 flex items-center gap-2.5 ${
          center ? "justify-center" : ""
        }`}
      >
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            accent ? "bg-volt/15 text-volt" : "bg-white/[0.06] text-volt/50"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <h2
          className={`text-sm font-bold uppercase tracking-wider ${
            accent ? "text-volt/80" : "text-white/70"
          }`}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center ring-1 ${
        accent
          ? "bg-volt/[0.06] ring-volt/12"
          : "bg-white/[0.03] ring-white/[0.05]"
      }`}
    >
      <p
        className={`text-2xl font-black tabular-nums ${
          accent ? "text-volt" : "text-white"
        }`}
        style={{ fontFamily: "ScreenMatrix, monospace" }}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-white/35">
        {label}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-white/[0.025] px-4 py-5 text-center text-xs text-white/30 ring-1 ring-white/[0.04]">
      {text}
    </div>
  );
}

/* ────────────────────────────────────────────
   Data Helpers
   ──────────────────────────────────────────── */

function buildCareerTimeline(
  transfers: PlayerProfileData["transfers"],
  trophies: PlayerProfileData["trophies"]
) {
  const transferItems = transfers.map((item) => ({
    kind: "transfer" as const,
    date: item.date || "日期待更新",
    sortKey: item.date || "",
    title: `${item.teams?.out?.name || "未知"} → ${item.teams?.in?.name || "未知"}`,
    detail: item.type || "转会",
  }));

  const honorItems = trophies.map((item) => ({
    kind: "honor" as const,
    date: item.season || "赛季待更新",
    sortKey: item.season || "",
    title: item.league || "赛事荣誉",
    detail: [item.place, item.country].filter(Boolean).join(" · "),
  }));

  return [...transferItems, ...honorItems]
    .sort((a, b) => String(b.sortKey).localeCompare(String(a.sortKey)))
    .slice(0, 10);
}

function summarizeStats(stats: NonNullable<PlayerProfileData["seasonStats"]>) {
  const totals = stats.reduce(
    (acc, item) => {
      acc.appearances += item.games?.appearences ?? 0;
      acc.minutes += item.games?.minutes ?? 0;
      acc.goals += item.goals?.total ?? 0;
      acc.assists += item.goals?.assists ?? 0;
      const rating = Number(item.games?.rating);
      if (Number.isFinite(rating)) acc.ratings.push(rating);
      return acc;
    },
    { appearances: 0, minutes: 0, goals: 0, assists: 0, ratings: [] as number[] }
  );
  const rating = totals.ratings.length
    ? (totals.ratings.reduce((sum, value) => sum + value, 0) / totals.ratings.length).toFixed(1)
    : "";

  return { ...totals, rating };
}

function buildRadarStats(data: PlayerProfileData | null): RadarStat[] {
  if (!data?.seasonStats?.length) {
    return [
      { label: "进攻", value: 0 },
      { label: "传球", value: 0 },
      { label: "防守", value: 0 },
      { label: "盘带", value: 0 },
      { label: "体能", value: 0 },
    ];
  }

  const stats = data.seasonStats;
  const totalGoals = stats.reduce((s, i) => s + (i.goals?.total ?? 0), 0);
  const totalAssists = stats.reduce((s, i) => s + (i.goals?.assists ?? 0), 0);
  const totalShots = stats.reduce((s, i) => s + (i.shots?.total ?? 0), 0);
  const keyPasses = stats.reduce((s, i) => s + (i.passes?.key ?? 0), 0);
  const passAccuracy = stats.reduce((s, i) => s + (i.passes?.accuracy ?? 0), 0) / stats.length;
  const totalTackles = stats.reduce((s, i) => s + (i.tackles?.total ?? 0), 0);
  const interceptions = stats.reduce((s, i) => s + (i.tackles?.interceptions ?? 0), 0);
  const appearances = stats.reduce((s, i) => s + (i.games?.appearences ?? 0), 0);
  const minutes = stats.reduce((s, i) => s + (i.games?.minutes ?? 0), 0);

  // Benchmark: world-class season values (~38 matches)
  // attack:  goals×10 + shots×1.5 + assists×5  →  ~300 for elite striker
  // passing: passAccuracy + keyPasses×5          →  ~100 for elite playmaker
  // defense: tackles×3 + interceptions×4         →  ~200 for elite defender
  // dribble: assists×10 + keyPasses×3            →  ~120 for elite winger
  // stamina: minutes/appearances/90×100          →  ~95 for ever-present player

  const clamp = (v: number) => Math.max(15, Math.min(95, Math.round(v)));

  const attackRaw = totalGoals * 10 + totalShots * 1.5 + totalAssists * 5;
  const passingRaw = passAccuracy + keyPasses * 5;
  const defenseRaw = totalTackles * 3 + interceptions * 4;
  const dribbleRaw = totalAssists * 10 + keyPasses * 3;
  const staminaRaw = (minutes / Math.max(appearances, 1) / 90) * 100;

  return [
    { label: "进攻", value: clamp((attackRaw / 300) * 100) || 25 },
    { label: "传球", value: clamp((passingRaw / 100) * 100) || 25 },
    { label: "防守", value: clamp((defenseRaw / 200) * 100) || 25 },
    { label: "盘带", value: clamp((dribbleRaw / 120) * 100) || 25 },
    { label: "体能", value: clamp(staminaRaw) || 40 },
  ];
}

const quickAccessItems = [
  { icon: Shield, label: "资料" },
  { icon: BarChart3, label: "数据" },
  { icon: Trophy, label: "荣誉" },
  { icon: CalendarClock, label: "转会" },
  { icon: Target, label: "射门" },
  { icon: Dribbble, label: "盘带" },
  { icon: GitCompareArrows, label: "对比" },
  { icon: TrendingUp, label: "趋势" },
];
