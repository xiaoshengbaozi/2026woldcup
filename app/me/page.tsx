"use client";

import { FormEvent, Suspense, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe2,
  LogIn,
  LogOut,
  Sparkles,
  Star,
  Trophy,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { MeAuthDialog } from "@/components/me-auth-dialog";
import { MatchTimelineBanner } from "@/components/match-detail/match-hero";
import {
  fallbackUserPreferenceCatalog,
  getPlayerAvatar,
  type UserPreferenceCatalog,
  type UserPreferencePlayer,
  type UserPreferenceTeam,
} from "@/lib/user-preferences";
import { userApi, type PublicUser, type UserHomePayload } from "@/lib/user-system";
import { fetchWorldCupTopScorers, type WorldCupTopScorer } from "@/lib/world-cup-top-scorers";
import { getFlagUrl } from "@/lib/world-cup-2026";
import { generateMatchSlug } from "@/lib/match-detail";
import { formatStageLabel } from "@/lib/stage";
import { buildMatchRoundLabels } from "@/lib/stage-rounds";
import { parseTeams } from "@/lib/teams";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import { usePopularTeams } from "@/components/world-cup-hero/use-popular-teams";
import type { Match } from "@/types/match";
import { qualifiedTeams } from "@/data/teams";
import playerArticles from "@/data/player-articles.json";
import { teamProfiles } from "@/data/team-profiles";
import playerNameTranslations from "@/data/localization/players.json";

type AuthMode = "login" | "register";
type RegisterStep = "account" | "preferences";
type ContinentKey = "all" | "asia" | "europe" | "africa" | "americas" | "oceania";
type MeTab = "players" | "teams" | "matches";
type TimelineItem = {
  id: string;
  kind: "player" | "team" | "match";
  title: string;
  subtitle: string;
  eyebrow: string;
  href?: string;
  image?: string;
  homeName?: string;
  awayName?: string;
  homeCode?: string;
  awayCode?: string;
  homeFlag?: string;
  awayFlag?: string;
  stage?: string;
  startsAt?: string;
};

type PlayerStoryArticle = {
  id?: string | number;
  apiPlayerId?: string | number;
  slug?: string;
  nameEn?: string;
  nameCn?: string;
  coverImage?: string;
  photo?: string;
  storyImages?: string[];
};

const PLAYER_STORY_ARTICLES = (playerArticles as { players?: PlayerStoryArticle[] }).players ?? [];

const ME_TABS: Array<{ id: MeTab; label: string; icon: ReactNode }> = [
  { id: "players", label: "关注球员", icon: <UsersRound className="h-4 w-4" /> },
  { id: "teams", label: "关注球队", icon: <Globe2 className="h-4 w-4" /> },
  { id: "matches", label: "收藏比赛", icon: <Bookmark className="h-4 w-4" /> },
];

const PLAYER_NAME_TRANSLATIONS = playerNameTranslations as Record<string, string>;

const CONTINENTS: Array<{ id: ContinentKey; label: string }> = [
  { id: "all", label: "全部大洲" },
  { id: "asia", label: "亚洲" },
  { id: "europe", label: "欧洲" },
  { id: "africa", label: "非洲" },
  { id: "americas", label: "美洲" },
  { id: "oceania", label: "大洋洲" },
];

const TEAM_CONTINENTS: Record<string, ContinentKey> = {
  ARG: "americas",
  BRA: "americas",
  COL: "americas",
  ECU: "americas",
  PAR: "americas",
  URU: "americas",
  CAN: "americas",
  CRC: "americas",
  CUW: "americas",
  HAI: "americas",
  JAM: "americas",
  MEX: "americas",
  PAN: "americas",
  USA: "americas",
  AUS: "asia",
  IRN: "asia",
  IRQ: "asia",
  JPN: "asia",
  JOR: "asia",
  KOR: "asia",
  KSA: "asia",
  QAT: "asia",
  UZB: "asia",
  AUT: "europe",
  BEL: "europe",
  BIH: "europe",
  CRO: "europe",
  CZE: "europe",
  DEN: "europe",
  ENG: "europe",
  ESP: "europe",
  FRA: "europe",
  GER: "europe",
  NED: "europe",
  NOR: "europe",
  POL: "europe",
  POR: "europe",
  SCO: "europe",
  SRB: "europe",
  SUI: "europe",
  SWE: "europe",
  TUR: "europe",
  ALG: "africa",
  CIV: "africa",
  COD: "africa",
  CPV: "africa",
  EGY: "africa",
  GHA: "africa",
  MAR: "africa",
  NGA: "africa",
  RSA: "africa",
  SEN: "africa",
  TUN: "africa",
  NZL: "oceania",
};

const NAME_CONTINENTS: Record<string, ContinentKey> = {
  阿根廷: "americas",
  巴西: "americas",
  哥伦比亚: "americas",
  厄瓜多尔: "americas",
  巴拉圭: "americas",
  乌拉圭: "americas",
  美国: "americas",
  墨西哥: "americas",
  加拿大: "americas",
  巴拿马: "americas",
  库拉索: "americas",
  海地: "americas",
  澳大利亚: "asia",
  伊朗: "asia",
  伊拉克: "asia",
  日本: "asia",
  约旦: "asia",
  韩国: "asia",
  沙特阿拉伯: "asia",
  卡塔尔: "asia",
  乌兹别克斯坦: "asia",
  奥地利: "europe",
  比利时: "europe",
  波黑: "europe",
  克罗地亚: "europe",
  捷克: "europe",
  英格兰: "europe",
  西班牙: "europe",
  法国: "europe",
  德国: "europe",
  荷兰: "europe",
  挪威: "europe",
  葡萄牙: "europe",
  苏格兰: "europe",
  瑞士: "europe",
  瑞典: "europe",
  土耳其: "europe",
  阿尔及利亚: "africa",
  科特迪瓦: "africa",
  刚果民主共和国: "africa",
  佛得角: "africa",
  埃及: "africa",
  加纳: "africa",
  摩洛哥: "africa",
  南非: "africa",
  塞内加尔: "africa",
  突尼斯: "africa",
  新西兰: "oceania",
};

type PlayerCardItem = {
  id: string;
  name: string;
  team?: string;
  photo?: string;
  goals?: number | null;
  href?: string;
};

type TeamCardItem = {
  id: string;
  name: string;
  logo?: string;
  flag?: string;
  pct?: number;
  href?: string;
};

type MatchCardItem = {
  id: string;
  title: string;
  stage?: string;
  startsAt?: string;
  homeName: string;
  awayName: string;
  homeCode?: string;
  awayCode?: string;
  homeFlag?: string;
  awayFlag?: string;
  href?: string;
};

const DEFAULT_TOP_SCORERS: WorldCupTopScorer[] = [
  { id: 278, name: "Kylian Mbappe", photo: "https://media.api-sports.io/football/players/278.png", teamName: "法国", teamLogo: "https://media.api-sports.io/football/teams/2.png", goals: null },
  { id: 386828, name: "Lamine Yamal", photo: "https://media.api-sports.io/football/players/386828.png", teamName: "西班牙", teamLogo: "https://media.api-sports.io/football/teams/9.png", goals: null },
  { id: 762, name: "Vinicius Junior", photo: "https://media.api-sports.io/football/players/762.png", teamName: "巴西", teamLogo: "https://media.api-sports.io/football/teams/6.png", goals: null },
  { id: 1100, name: "Erling Haaland", photo: "https://media.api-sports.io/football/players/1100.png", teamName: "挪威", teamLogo: "https://media.api-sports.io/football/teams/1090.png", goals: null },
  { id: 154, name: "Lionel Messi", photo: "https://media.api-sports.io/football/players/154.png", teamName: "阿根廷", teamLogo: "https://media.api-sports.io/football/teams/26.png", goals: null },
  { id: 276, name: "Neymar", photo: "https://media.api-sports.io/football/players/276.png", teamName: "巴西", teamLogo: "https://media.api-sports.io/football/teams/6.png", goals: null },
];

const STATIC_PLAYER_PAGE_IDS = new Set(["278", "386828", "762", "1100", "154", "276", "909"]);
const DEFAULT_POPULAR_TEAM_CODES = ["ARG", "BRA", "FRA", "ENG", "ESP"];

export default function MePage() {
  return (
    <Suspense fallback={<MePageFallback />}>
      <MePageContent />
    </Suspense>
  );
}

function MePageFallback() {
  return (
    <DashboardShell>
      <main className="relative min-h-screen overflow-hidden px-4 pb-20 pt-24 text-white sm:px-6 lg:px-8">
        <section className="mx-auto grid min-h-[50vh] max-w-6xl place-items-center">
          <div className="rounded-[2rem] bg-white/[0.045] px-6 py-5 text-sm font-semibold text-white/62 shadow-glass ring-1 ring-white/10 backdrop-blur-2xl">
            Loading profile...
          </div>
        </section>
      </main>
    </DashboardShell>
  );
}

function MePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [home, setHome] = useState<UserHomePayload | null>(null);
  const [catalog, setCatalog] = useState<UserPreferenceCatalog>(fallbackUserPreferenceCatalog);
  const [topScorers, setTopScorers] = useState<WorldCupTopScorer[]>(DEFAULT_TOP_SCORERS);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [registerStep, setRegisterStep] = useState<RegisterStep>("account");
  const [email, setEmail] = useState("demo@worldcup.local");
  const [password, setPassword] = useState("worldcup2026");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(compactIds(fallbackUserPreferenceCatalog.teams[0]?.id));
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(compactIds(fallbackUserPreferenceCatalog.players[0]?.id));
  const [teamContinent, setTeamContinent] = useState<ContinentKey>("all");
  const [playerContinent, setPlayerContinent] = useState<ContinentKey>("all");
  const [playerCountry, setPlayerCountry] = useState("all");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const ignoreAuthParamRef = useRef(false);
  const { matches } = useWorldCupData();
  const popularTeams = usePopularTeams();

  const avatarPlayerId = selectedPlayerIds[0] ?? catalog.players[0]?.id ?? fallbackUserPreferenceCatalog.players[0].id;

  const clearAuthUrl = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (!nextParams.has("auth")) return;
    nextParams.delete("auth");
    const query = nextParams.toString();
    router.replace(query ? `/me?${query}` : "/me", { scroll: false });
  }, [router, searchParams]);

  async function loadHome() {
    try {
      setLoading(true);
      const payload = await userApi<UserHomePayload>("/api/me/home", { cache: "no-store" });
      setHome(payload);
      if (payload.catalog) setCatalog(payload.catalog);
      setError("");
    } catch {
      setHome(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHome();
    userApi<UserPreferenceCatalog>("/api/user-preferences", { cache: "no-store" })
      .then((payload) => {
        setCatalog(payload);
        setSelectedTeamIds((current) => (current.some((id) => payload.teams.some((team) => team.id === id)) ? current : compactIds(payload.teams[0]?.id)));
        setSelectedPlayerIds((current) => (current.some((id) => payload.players.some((player) => player.id === id)) ? current : compactIds(payload.players[0]?.id)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    fetchWorldCupTopScorers()
      .then((players) => {
        if (active && players.length) setTopScorers(fillTopScorers(players).slice(0, 6));
      })
      .catch(() => {
        if (active) setTopScorers(DEFAULT_TOP_SCORERS);
      });

    return () => {
      active = false;
    };
  }, []);

  const openAuth = useCallback((mode: AuthMode, syncUrl = true) => {
    ignoreAuthParamRef.current = false;
    setAuthMode(mode);
    setRegisterStep("account");
    setError("");
    if (mode === "register") {
      setEmail("");
      setDisplayName("");
      setPassword("");
      setRepeatPassword("");
      setInvitationCode("");
    }
    if (syncUrl) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("auth", mode);
      router.replace(`/me?${nextParams.toString()}`, { scroll: false });
    }
  }, [router, searchParams]);

  function closeAuth() {
    if (busy) return;
    ignoreAuthParamRef.current = true;
    setAuthMode(null);
    setRegisterStep("account");
    setError("");
    clearAuthUrl();
  }

  useEffect(() => {
    const requestedMode = searchParams.get("auth");
    if (requestedMode !== "login" && requestedMode !== "register") {
      ignoreAuthParamRef.current = false;
      return;
    }

    if (ignoreAuthParamRef.current) return;

    if (home && (requestedMode === "login" || requestedMode === "register")) {
      setAuthMode(null);
      clearAuthUrl();
      return;
    }

    if (!home && (requestedMode === "login" || requestedMode === "register") && authMode !== requestedMode) {
      openAuth(requestedMode, false);
    }
  }, [authMode, clearAuthUrl, home, openAuth, searchParams]);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("login");
    setError("");

    try {
      await userApi<{ user: PublicUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await loadHome();
      closeAuth();
    } catch (err) {
      setError(readableError(err, "登录失败，请检查邮箱和密码"));
    } finally {
      setBusy("");
    }
  }

  function continueToPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!displayName.trim()) return setError("请填写昵称");
    if (!email.trim()) return setError("请填写邮箱");
    if (!isValidEmail(email)) return setError("请输入有效的邮箱地址");
    if (!password) return setError("请填写密码");
    if (password.length < 8) return setError("密码至少需要 8 位");
    if (password !== repeatPassword) return setError("两次输入的密码不一致");
    if (!invitationCode.trim()) return setError("请填写邀请码");

    setRegisterStep("preferences");
  }

  async function submitRegister() {
    setBusy("register");
    setError("");

    const followedTeams = catalog.teams.filter((team) => selectedTeamIds.includes(team.id));
    const followedPlayers = catalog.players
      .filter((player) => selectedPlayerIds.includes(player.id))
      .map(({ avatar, ...player }) => ({
        ...player,
        name: getLocalizedPlayerName(player),
      }));

    try {
      await userApi<{ user: PublicUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          invitationCode: invitationCode.trim(),
          displayName: displayName.trim(),
          avatarPlayerId,
          followedTeams,
          followedPlayers,
          favoriteMatches: inferFavoriteMatches(catalog, followedTeams, followedPlayers),
        }),
      });
      await loadHome();
      closeAuth();
    } catch (err) {
      setError(readableError(err, "注册失败，请稍后再试"));
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    setBusy("logout");
    try {
      await userApi("/api/auth/logout", { method: "POST", body: "{}" });
      setHome(null);
    } finally {
      setBusy("");
    }
  }

  return (
    <DashboardShell>
      <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0 space-y-5 order-last lg:order-none"
        >
          <section className="hero-card overflow-hidden p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="glass-chip inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-volt">
                  <Sparkles className="h-3.5 w-3.5" />
                  MY WORLD CUP
                </div>
                <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">我的世界杯主页</h1>
              </div>
              <p className="max-w-sm text-sm leading-6 text-white/44">
                {home ? `${home.user.profile.displayName} 的关注与收藏。` : loading ? "正在同步个人数据。" : "登录后显示你的关注球员、球队和收藏比赛。"}
              </p>
            </div>
          </section>

          <ProfileBoard home={home} catalog={catalog} topScorers={topScorers} popularTeams={popularTeams} scheduleMatches={matches} />
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="hidden h-fit gap-5 lg:sticky lg:top-5 lg:grid"
        >
          <section className="hero-card grid gap-5 p-5 sm:p-6">
            <AccountCard
              home={home}
              catalog={catalog}
              avatarPlayerId={avatarPlayerId}
              busy={busy}
              onLogin={() => openAuth("login")}
              onRegister={() => openAuth("register")}
              onLogout={logout}
            />
          </section>
          <ScorerBoard players={topScorers} />
          <PopularTeamsPanel teams={getDefaultPopularTeams(popularTeams, catalog.teams)} />
        </motion.aside>
      </section>

      <MeAuthDialog mode={authMode} onClose={closeAuth} onAuthenticated={loadHome} />
    </DashboardShell>
  );
}

function ProfileBoard({
  home,
  catalog,
  topScorers,
  popularTeams,
  scheduleMatches,
}: {
  home: UserHomePayload | null;
  catalog: UserPreferenceCatalog;
  topScorers: WorldCupTopScorer[];
  popularTeams: Array<{ name: string; flag: string; pct: number; code: string }>;
  scheduleMatches: Match[];
}) {
  const [activeTab, setActiveTab] = useState<MeTab>("players");
  const players: PlayerCardItem[] = home?.user.followedPlayers.length
    ? home.user.followedPlayers.map((player) => ({
        id: player.id,
        name: getLocalizedPlayerName(player),
        team: player.team,
        photo: player.photo,
        href: playerHref(player),
      }))
    : fillTopScorers(topScorers).slice(0, 6).map((player) => ({
        id: String(player.id),
        name: getLocalizedPlayerName({ id: String(player.id), name: player.name }),
        team: player.teamName,
        photo: player.photo,
        goals: player.goals,
        href: `/players/${player.id}/`,
      }));

  const teams: TeamCardItem[] = home?.user.followedTeams.length
    ? home.user.followedTeams.map((team) => ({
        id: team.id,
        name: team.name,
        logo: normalizeTeamImage(team.logo),
        flag: getTeamFlag(team),
        href: teamHref(team),
      }))
    : getDefaultPopularTeams(popularTeams, catalog.teams);

  const roundLabels = useMemo(() => buildMatchRoundLabels(scheduleMatches), [scheduleMatches]);
  const matches: MatchCardItem[] = home?.user.favoriteMatches.length
    ? home.user.favoriteMatches.map((match) => matchPreferenceToCard(match, findRoundLabelForFavorite(match, scheduleMatches, roundLabels)))
    : getRecentScheduleMatches(scheduleMatches, catalog, roundLabels).slice(0, 4);

  const timeline = buildTimelineItems(players, teams, matches, Boolean(home));

  return (
    <div className="grid min-w-0 gap-5">
      <section className="hero-card overflow-hidden px-4 py-4 sm:px-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="我的关注分类">
          {ME_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition duration-300 ${
                  active
                    ? "bg-volt text-black shadow-[0_0_26px_rgba(216,255,62,.2)]"
                    : "bg-white/[0.045] text-white/58 ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-5 lg:h-[132px]"
          >
            {activeTab === "players" && (
              <ScrollableRail ariaLabel="滚动关注球员">
                {players.slice(0, 8).map((player) => (
                  <div key={player.id} className="w-32 shrink-0">
                    <PlayerBubble player={player} catalogPlayers={catalog.players} dimmed={!home} />
                  </div>
                ))}
              </ScrollableRail>
            )}
            {activeTab === "teams" && (
              <ScrollableRail ariaLabel="滚动关注球队">
                {teams.slice(0, 8).map((team) => (
                  <div key={team.id} className="w-36 shrink-0 sm:w-40">
                    <TeamBadge team={team} dimmed={!home} />
                  </div>
                ))}
              </ScrollableRail>
            )}
            {activeTab === "matches" && (
              <ScrollableRail ariaLabel="滚动收藏比赛">
                {matches.map((match) => (
                  <div key={match.id} className="w-[min(440px,82vw)] shrink-0">
                    <MatchStrip match={match} dimmed={!home} />
                  </div>
                ))}
              </ScrollableRail>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      <section className="min-w-0 space-y-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-volt/55">Timeline</p>
            <h2 className="mt-1 text-base font-semibold text-white">综合时间线</h2>
          </div>
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-bold text-white/42">{timeline.length} 条</span>
        </div>
        {timeline.map((item, index) => (
          <TimelineCard key={item.id} item={item} index={index} />
        ))}
      </section>
    </div>
  );
}

function ScrollableRail({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const eps = 2;
    setCanScrollLeft(el.scrollLeft > eps);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - eps);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, children]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -el.clientWidth * 0.65 : el.clientWidth * 0.65, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex h-full items-start gap-3 overflow-x-auto py-2 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>

      {canScrollLeft && (
        <button
          type="button"
          aria-label={`${ariaLabel}向左`}
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm ring-1 ring-white/[0.1] transition hover:bg-volt hover:text-black"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          aria-label={`${ariaLabel}向右`}
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm ring-1 ring-white/[0.1] transition hover:bg-volt hover:text-black"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function PlayerBubble({ player, catalogPlayers, dimmed }: { player: PlayerCardItem; catalogPlayers: UserPreferencePlayer[]; dimmed: boolean }) {
  const content = (
    <div className={`group flex w-[68px] shrink-0 flex-col items-center text-center sm:w-20 ${dimmed ? "opacity-60" : ""}`}>
      <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.1] transition duration-300 group-hover:scale-105 group-hover:ring-volt/45 sm:h-16 sm:w-16">
        <Image src={player.photo || getPlayerAvatar(player.id, catalogPlayers)} alt={player.name} fill sizes="64px" className="object-cover" />
      </div>
      <span className="mt-2 w-full truncate text-[10px] font-medium text-white/60 group-hover:text-volt sm:mt-2.5 sm:text-[11px]">
        {player.name}
      </span>
      <span className="mt-0.5 w-full truncate text-[9px] text-white/28 sm:text-[10px]">{player.team || "国家待定"}</span>
    </div>
  );

  if (!player.href) return content;
  return (
    <Link href={player.href} className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-volt/60 rounded-full">
      {content}
    </Link>
  );
}

function TeamBadge({ team, dimmed }: { team: TeamCardItem; dimmed: boolean }) {
  const content = (
    <div className={`grid justify-items-center gap-[9px] transition ${dimmed ? "opacity-60" : ""}`}>
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-white/[0.045] p-1.5 ring-1 ring-white/10">
        {team.flag ? <Image src={team.flag} alt={team.name} fill sizes="120px" className="object-contain opacity-92" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-transparent" />
        {team.logo && !team.flag ? <Image src={team.logo} alt={team.name} fill sizes="48px" className="object-contain p-2" /> : null}
        {!team.logo && !team.flag ? <Trophy className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-volt" /> : null}
        {team.pct !== undefined && <span className="absolute right-1 top-1 rounded-full bg-black/45 px-1.5 py-0.5 text-[8px] font-bold text-volt ring-1 ring-white/10">{team.pct}%</span>}
      </div>
      <p className="max-w-full truncate text-[10px] font-medium text-white/60 sm:text-[11px]">{team.name}</p>
    </div>
  );

  if (!team.href) return content;
  return (
    <Link href={team.href} className="block rounded-xl outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-volt/60">
      {content}
    </Link>
  );
}

function MatchStrip({ match, dimmed }: { match: MatchCardItem; dimmed: boolean }) {
  const content = (
    <article className={`relative overflow-hidden rounded-[1.35rem] bg-[#10150d]/90 p-4 shadow-glass ring-1 ring-white/10 transition ${dimmed ? "opacity-60" : ""}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/40 to-transparent" />
      <div className="flex items-center justify-between gap-4">
        <MatchTeam name={match.homeName} image={match.homeFlag} align="left" />
        <div className="shrink-0 text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/36">{match.stage || "Match"}</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-white">{formatMatchTime(match.startsAt)}</p>
        </div>
        <MatchTeam name={match.awayName} image={match.awayFlag} align="right" />
      </div>
    </article>
  );

  if (!match.href) return content;
  return (
    <Link href={match.href} className="block rounded-[1.35rem] outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-volt/60">
      {content}
    </Link>
  );
}

function MatchTeam({ name, image, align }: { name: string; image?: string; align: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
        {image ? <Image src={image} alt={name} fill sizes="48px" className="object-cover" /> : null}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.12em] text-white/34">{align === "left" ? "Home" : "Away"}</p>
      </div>
    </div>
  );
}

function TimelineCard({ item, index }: { item: TimelineItem; index: number }) {
  const icon = item.kind === "player" ? <UsersRound className="h-4 w-4" /> : item.kind === "team" ? <Globe2 className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />;
  const content = (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: Math.min(index * 0.03, 0.18), duration: 0.42 }}
      className="group w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-colors duration-300 hover:border-white/[0.1] hover:bg-white/[0.03]"
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-volt/[0.1] text-volt ring-1 ring-volt/20">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{item.title}</p>
          <p className="truncate text-xs text-white/36">{item.subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold text-white/42">{item.eyebrow}</span>
      </div>

      {item.kind === "match" ? (
        <div className="w-full">
          {item.href ? (
            <Link href={item.href} className="block outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-volt/60">
              <MatchTimelineBanner
                home={{ name: item.homeName || item.title, image: item.homeFlag, code: item.homeCode }}
                away={{ name: item.awayName || "TBD", image: item.awayFlag, code: item.awayCode }}
                startsAt={item.startsAt}
                stage={item.stage || item.eyebrow}
              />
            </Link>
          ) : (
            <MatchTimelineBanner
              home={{ name: item.homeName || item.title, image: item.homeFlag, code: item.homeCode }}
              away={{ name: item.awayName || "TBD", image: item.awayFlag, code: item.awayCode }}
              startsAt={item.startsAt}
              stage={item.stage || item.eyebrow}
            />
          )}
        </div>
      ) : (
        <div className="relative aspect-[16/9] w-full max-w-full min-w-0 overflow-hidden bg-white/[0.02] sm:aspect-[16/8] lg:aspect-[16/7]">
          {item.image ? <Image src={item.image} alt={item.title} fill sizes="760px" className="object-cover opacity-70 transition duration-700 group-hover:scale-[1.02] group-hover:opacity-90" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <p className="text-sm leading-6 text-white/62">{item.kind === "team" ? "球队文章稍后补充，当前先汇总关注球队的赛程线索与热度变化。" : "关注球员动态已进入你的个人时间线，后续可接入新闻、伤停与首发提醒。"}</p>
          </div>
        </div>
      )}
    </motion.article>
  );

  if (!item.href || item.kind === "match") return content;
  return (
    <Link href={item.href} className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-volt/60">
      {content}
    </Link>
  );
}

function ScorerBoard({ players }: { players: WorldCupTopScorer[] }) {
  return (
    <section className="hero-card overflow-hidden p-4">
      <div className="flex items-center justify-between px-1 pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-volt/50">Ranking</p>
          <h2 className="mt-0.5 text-sm font-bold text-white/80">射手榜</h2>
        </div>
        <Trophy className="h-4 w-4 text-volt/60" />
      </div>
      <div className="divide-y divide-white/[0.04]">
        {fillTopScorers(players).slice(0, 6).map((player, index) => (
          <Link key={player.id} href={`/players/${player.id}/`} className="group flex items-center gap-3 px-1 py-2.5 transition hover:bg-white/[0.03]">
            <span className="w-4 text-center text-[11px] font-bold text-white/25 group-hover:text-white/50">{index + 1}</span>
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
              <Image src={player.photo} alt={player.name} fill sizes="32px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-white/70 group-hover:text-white/90">{getLocalizedPlayerName({ id: player.id, name: player.name })}</p>
              <p className="truncate text-[11px] text-white/30">{player.teamName}</p>
            </div>
            <span className="text-xs font-bold text-volt/60 group-hover:text-volt">{player.goals ?? "-"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PopularTeamsPanel({ teams }: { teams: TeamCardItem[] }) {
  return (
    <section className="hero-card p-4">
      <div className="flex items-center justify-between px-1 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-volt/50">Teams</p>
          <h2 className="mt-0.5 text-sm font-bold text-white/80">热门球队</h2>
        </div>
        <Globe2 className="h-4 w-4 text-volt/60" />
      </div>
      <div className="grid gap-2">
        {teams.slice(0, 6).map((team) => (
          <div key={team.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.05]">
            <div className="relative h-8 w-11 shrink-0 overflow-hidden rounded-xl bg-white/[0.06] ring-1 ring-white/10">
              {team.flag ? <Image src={team.flag} alt={team.name} fill sizes="44px" className="object-cover" /> : team.logo ? <Image src={team.logo} alt={team.name} fill sizes="44px" className="object-contain p-1.5" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white/76">{team.name}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">World Cup Signal</p>
            </div>
            {team.pct !== undefined && <span className="text-xs font-black text-volt">{team.pct}%</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

function AccountCard({
  home,
  catalog,
  avatarPlayerId,
  busy,
  onLogin,
  onRegister,
  onLogout,
}: {
  home: UserHomePayload | null;
  catalog: UserPreferenceCatalog;
  avatarPlayerId: string;
  busy: string;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
}) {
  const avatar = home
    ? home.user.profile.avatarUrl || getPlayerAvatar(home.user.profile.avatarPlayerId, home.catalog?.players ?? catalog.players)
    : getPlayerAvatar(avatarPlayerId, catalog.players);

  return (
    <div className="relative z-10 grid justify-items-center gap-6 py-4">
      {home && (
        <div className="relative h-28 w-28 overflow-hidden rounded-full bg-white/[0.06] shadow-[0_0_44px_rgba(216,255,62,.13)] ring-1 ring-volt/28 sm:h-32 sm:w-32">
          <Image src={avatar} alt={home.user.profile.displayName} fill sizes="128px" className="object-cover" />
        </div>
      )}

      {home ? (
        <div className="grid w-full gap-5 text-center">
          <div>
            <p className="text-xl font-semibold text-white">{home.user.profile.displayName}</p>
            <p className="mt-1 text-sm text-white/44">{home.user.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            disabled={busy === "logout"}
            className="mx-auto inline-flex h-11 items-center gap-2 rounded-full bg-white/[0.06] px-5 text-sm font-semibold text-white/72 shadow-glass transition hover:bg-white/[0.1] hover:text-white disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </div>
      ) : (
        <div className="grid w-full grid-cols-2 gap-4">
          <button type="button" onClick={onLogin} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/[0.06] text-sm font-semibold text-white/82 ring-1 ring-white/12 transition hover:bg-white/[0.1]">
            <LogIn className="h-4 w-4" />
            登录
          </button>
          <button type="button" onClick={onRegister} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-volt text-sm font-bold text-black shadow-[0_0_30px_rgba(216,255,62,.18)] transition hover:scale-[1.02]">
            <UserPlus className="h-4 w-4" />
            注册
          </button>
        </div>
      )}
    </div>
  );
}

function AuthModal({ mode, registerStep, onClose, children }: { mode: AuthMode; registerStep: RegisterStep; onClose: () => void; children: ReactNode }) {
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-8 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-[#090b10]/92 shadow-[0_24px_90px_rgba(0,0,0,.55)] ring-1 ring-white/12"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_50%_0%,rgba(216,255,62,.16),transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase text-volt/80">{mode === "login" ? "SIGN IN" : registerStep === "account" ? "CREATE ACCOUNT" : "PREFERENCES"}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{mode === "login" ? "登录个人主页" : registerStep === "account" ? "创建个人主页" : "设置关注偏好"}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/58 transition hover:bg-white/[0.1] hover:text-white" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative max-h-[calc(88vh-96px)] overflow-y-auto p-5 sm:p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function LoginForm({
  email,
  password,
  busy,
  error,
  onEmailChange,
  onPasswordChange,
  onSwitchToRegister,
  onSubmit,
}: {
  email: string;
  password: string;
  busy: string;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSwitchToRegister: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <AuthInput label="邮箱" type="email" value={email} required onChange={onEmailChange} />
      <AuthInput label="密码" type="password" value={password} required onChange={onPasswordChange} />
      <ModalFooter error={error}>
        <div className="flex flex-wrap items-center gap-3">
          <SecondaryButton type="button" disabled={Boolean(busy)} onClick={onSwitchToRegister}>
            <UserPlus className="h-4 w-4" />
            注册
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={Boolean(busy)}>
            <UserRound className="h-4 w-4" />
            {busy === "login" ? "登录中" : "进入主页"}
          </PrimaryButton>
        </div>
      </ModalFooter>
    </form>
  );
}

function RegisterAccountForm({
  displayName,
  email,
  password,
  repeatPassword,
  invitationCode,
  error,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onRepeatPasswordChange,
  onInvitationCodeChange,
  onSwitchToLogin,
  onSubmit,
}: {
  displayName: string;
  email: string;
  password: string;
  repeatPassword: string;
  invitationCode: string;
  error: string;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRepeatPasswordChange: (value: string) => void;
  onInvitationCodeChange: (value: string) => void;
  onSwitchToLogin: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <AuthInput label="昵称" value={displayName} required onChange={onDisplayNameChange} />
      <AuthInput label="邮箱" type="email" value={email} required onChange={onEmailChange} />
      <AuthInput label="密码" type="password" value={password} required onChange={onPasswordChange} />
      <AuthInput label="重复密码" type="password" value={repeatPassword} required onChange={onRepeatPasswordChange} />
      <AuthInput label="邀请码" value={invitationCode} required onChange={onInvitationCodeChange} />
      <ModalFooter error={error}>
        <div className="flex flex-wrap items-center gap-3">
          <SecondaryButton type="button" onClick={onSwitchToLogin}>
            <LogIn className="h-4 w-4" />
            登录
          </SecondaryButton>
          <PrimaryButton type="submit">
            下一步
            <ChevronRight className="h-4 w-4" />
          </PrimaryButton>
        </div>
      </ModalFooter>
    </form>
  );
}

function RegisterPreferences({
  catalog,
  selectedTeamIds,
  selectedPlayerIds,
  teamContinent,
  playerContinent,
  playerCountry,
  busy,
  error,
  onBack,
  onTeamContinentChange,
  onPlayerContinentChange,
  onPlayerCountryChange,
  onTeamToggle,
  onPlayerToggle,
  onSubmit,
}: {
  catalog: UserPreferenceCatalog;
  selectedTeamIds: string[];
  selectedPlayerIds: string[];
  teamContinent: ContinentKey;
  playerContinent: ContinentKey;
  playerCountry: string;
  busy: string;
  error: string;
  onBack: () => void;
  onTeamContinentChange: (value: ContinentKey) => void;
  onPlayerContinentChange: (value: ContinentKey) => void;
  onPlayerCountryChange: (value: string) => void;
  onTeamToggle: (id: string) => void;
  onPlayerToggle: (id: string) => void;
  onSubmit: () => void;
}) {
  const teamsByName = useMemo(() => new Map(catalog.teams.map((team) => [team.name, team])), [catalog.teams]);
  const filteredTeams = useMemo(() => catalog.teams.filter((team) => teamContinent === "all" || getTeamContinent(team) === teamContinent), [catalog.teams, teamContinent]);
  const countryOptions = useMemo(() => {
    const countries = new Set(
      catalog.players
        .filter((player) => playerContinent === "all" || getPlayerContinent(player, teamsByName) === playerContinent)
        .map((player) => player.team)
        .filter(Boolean) as string[]
    );
    return ["all", ...Array.from(countries).sort((a, b) => a.localeCompare(b, "zh-CN"))];
  }, [catalog.players, playerContinent, teamsByName]);
  const filteredPlayers = useMemo(
    () =>
      catalog.players.filter((player) => {
        const matchesContinent = playerContinent === "all" || getPlayerContinent(player, teamsByName) === playerContinent;
        const matchesCountry = playerCountry === "all" || player.team === playerCountry;
        return matchesContinent && matchesCountry;
      }),
    [catalog.players, playerContinent, playerCountry, teamsByName]
  );

  return (
    <div className="grid gap-5">
      <PreferencePicker
        title="关注球队"
        description="按大洲筛选，可多选。"
        controls={
          <SelectControl label="大洲" value={teamContinent} onChange={(value) => onTeamContinentChange(value as ContinentKey)}>
            {CONTINENTS.map((continent) => (
              <option key={continent.id} value={continent.id}>
                {continent.label}
              </option>
            ))}
          </SelectControl>
        }
      >
        <TeamGrid items={filteredTeams} selected={selectedTeamIds} onToggle={onTeamToggle} />
      </PreferencePicker>

      <PreferencePicker
        title="关注球员"
        description="先按大洲，再按国家筛选，可多选。"
        controls={
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectControl label="大洲" value={playerContinent} onChange={(value) => onPlayerContinentChange(value as ContinentKey)}>
              {CONTINENTS.map((continent) => (
                <option key={continent.id} value={continent.id}>
                  {continent.label}
                </option>
              ))}
            </SelectControl>
            <SelectControl label="国家" value={playerCountry} onChange={onPlayerCountryChange}>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country === "all" ? "全部国家" : country}
                </option>
              ))}
            </SelectControl>
          </div>
        }
      >
        <PlayerGrid items={filteredPlayers} selected={selectedPlayerIds} catalogPlayers={catalog.players} onToggle={onPlayerToggle} />
      </PreferencePicker>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="h-11 rounded-full bg-white/[0.06] px-5 text-sm font-semibold text-white/64 transition hover:bg-white/[0.1] hover:text-white">
          返回
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {error && <p className="text-sm text-flare/80">{error}</p>}
          <PrimaryButton type="button" disabled={Boolean(busy)} onClick={onSubmit}>
            <UserPlus className="h-4 w-4" />
            {busy === "register" ? "创建中" : "完成注册"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function AuthInput({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm text-white/52">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl bg-black/24 px-4 text-white outline-none ring-1 ring-white/10 transition placeholder:text-white/24 focus:ring-volt/45"
      />
    </label>
  );
}

function SelectControl({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm text-white/52">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-2xl bg-black/40 px-4 text-white outline-none ring-1 ring-white/10 transition focus:ring-volt/45">
        {children}
      </select>
    </label>
  );
}

function ModalFooter({ error, children }: { error: string; children: ReactNode }) {
  return (
    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
      <p className="min-h-5 text-sm text-flare/80">{error}</p>
      {children}
    </div>
  );
}

function PreferencePicker({ title, description, controls, children }: { title: string; description: string; controls: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-[1.5rem] bg-white/[0.035] p-4 shadow-glass ring-1 ring-white/10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-white/42">{description}</p>
        </div>
        <div className="min-w-56">{controls}</div>
      </div>
      {children}
    </section>
  );
}

function TeamGrid({ items, selected, onToggle }: { items: UserPreferenceTeam[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((team) => {
        const checked = selected.includes(team.id);
        return (
          <button
            key={team.id}
            type="button"
            onClick={() => onToggle(team.id)}
            className={`min-h-14 rounded-[1.1rem] px-3 text-left text-sm transition ring-1 ${
              checked ? "bg-volt/12 text-white ring-volt/35 shadow-[0_0_22px_rgba(216,255,62,.12)]" : "bg-white/[0.035] text-white/64 ring-white/8 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
                {team.logo ? <Image src={team.logo} alt={team.name} fill sizes="32px" className="object-contain p-1" /> : <Trophy className="m-2 h-4 w-4 text-volt" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{team.name}</span>
                <span className="mt-0.5 block text-xs text-white/36">{continentLabel(getTeamContinent(team))}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PlayerGrid({ items, selected, catalogPlayers, onToggle }: { items: UserPreferencePlayer[]; selected: string[]; catalogPlayers: UserPreferencePlayer[]; onToggle: (id: string) => void }) {
  return (
    <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((player) => {
        const checked = selected.includes(player.id);
        const displayName = getLocalizedPlayerName(player);
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onToggle(player.id)}
            className={`min-h-14 rounded-[1.1rem] px-3 text-left text-sm transition ring-1 ${
              checked ? "bg-volt/12 text-white ring-volt/35 shadow-[0_0_22px_rgba(216,255,62,.12)]" : "bg-white/[0.035] text-white/64 ring-white/8 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-volt/20">
                <Image src={player.photo || getPlayerAvatar(player.id, catalogPlayers)} alt={displayName} fill sizes="36px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{displayName}</span>
                <span className="mt-0.5 block truncate text-xs text-white/36">{[player.team, player.position].filter(Boolean).join(" · ")}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex h-12 min-w-32 items-center justify-center gap-2 rounded-full bg-volt px-5 text-sm font-bold text-black shadow-[0_0_30px_rgba(216,255,62,.2)] transition hover:scale-[1.02] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex h-12 min-w-28 items-center justify-center gap-2 rounded-full bg-white/[0.06] px-5 text-sm font-semibold text-white/78 ring-1 ring-white/12 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function inferFavoriteMatches(catalog: UserPreferenceCatalog, teams: UserPreferenceTeam[], players: UserPreferencePlayer[]) {
  const tokens = new Set<string>();
  for (const team of teams) {
    tokens.add(team.name);
    if (team.region) tokens.add(team.region);
  }
  for (const player of players) {
    if (player.team) tokens.add(player.team);
  }
  return catalog.matches.filter((match) => Array.from(tokens).some((token) => token && match.title.includes(token)));
}

function getPlayerStoryTimelineImage(player: PlayerCardItem) {
  const id = String(player.id);
  const normalizedName = normalizeLookupText(player.name);
  const article = PLAYER_STORY_ARTICLES.find((item) => {
    const itemIds = [item.id, item.apiPlayerId].filter((value) => value != null).map(String);
    return (
      itemIds.includes(id) ||
      normalizeLookupText(item.nameCn) === normalizedName ||
      normalizeLookupText(item.nameEn) === normalizedName
    );
  });

  return article?.coverImage || article?.storyImages?.[0] || "";
}

function getTeamProfileTimelineImage(team: TeamCardItem) {
  const slug = getTeamSlug(team);
  const profile = slug ? teamProfiles[slug as keyof typeof teamProfiles] : undefined;

  return (
    profile?.heroBanner ||
    profile?.deepDive?.featureStory?.image ||
    profile?.stories.find((story) => Boolean(story.coverImg))?.coverImg ||
    profile?.gallery?.[0]?.src ||
    ""
  );
}

function getTeamSlug(team: TeamCardItem) {
  const hrefSlug = team.href?.match(/\/teams\/([^/?#]+)/)?.[1];
  if (hrefSlug && teamProfiles[hrefSlug as keyof typeof teamProfiles]) return hrefSlug;

  const key = normalizeTeamCode(team.id);
  const qualifiedTeam = qualifiedTeams.find((item) => normalizeTeamCode(item.code) === key);
  if (qualifiedTeam?.slug) return qualifiedTeam.slug;

  const normalizedName = normalizeLookupText(team.name);
  const byProfile = Object.entries(teamProfiles).find(([, profile]) => (
    normalizeTeamCode(profile.fifaCode) === key ||
    normalizeTeamCode(profile.countryCode) === key ||
    normalizeLookupText(profile.nameCn) === normalizedName ||
    normalizeLookupText(profile.nameEn) === normalizedName
  ));

  return byProfile?.[0] || "";
}

function normalizeLookupText(value?: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function buildTimelineItems(players: PlayerCardItem[], teams: TeamCardItem[], matches: MatchCardItem[], isSignedIn: boolean): TimelineItem[] {
  const playerItems: TimelineItem[] = players.slice(0, 3).map((player) => ({
    id: `player-${player.id}`,
    kind: "player",
    title: player.name,
    subtitle: player.team ? `${player.team} · 关注球员动态` : "关注球员动态",
    eyebrow: isSignedIn ? "球员" : "推荐",
    href: player.href,
    image: getPlayerStoryTimelineImage(player) || player.photo,
  }));

  const teamItems: TimelineItem[] = teams.slice(0, 3).map((team) => ({
    id: `team-${team.id}`,
    kind: "team",
    title: team.name,
    subtitle: "球队文章稍后补充",
    eyebrow: isSignedIn ? "球队" : "热门",
    href: team.href,
    image: getTeamProfileTimelineImage(team) || team.flag || team.logo,
  }));

  const matchItems: TimelineItem[] = matches.map((match) => ({
    id: `match-${match.id}`,
    kind: "match",
    title: match.title,
    subtitle: [match.stage ? formatStageLabel(match.stage, match.title) : "", formatMatchTime(match.startsAt)].filter(Boolean).join(" · "),
    eyebrow: isSignedIn ? "收藏" : "赛程",
    href: match.href,
    stage: match.stage ? formatStageLabel(match.stage, match.title) : undefined,
    startsAt: match.startsAt,
    homeName: match.homeName,
    awayName: match.awayName,
    homeCode: match.homeCode,
    awayCode: match.awayCode,
    homeFlag: match.homeFlag,
    awayFlag: match.awayFlag,
  }));

  return [...playerItems, ...teamItems, ...matchItems];
}

function fillTopScorers(players: WorldCupTopScorer[]) {
  const byId = new Map<number, WorldCupTopScorer>();
  for (const player of [...players, ...DEFAULT_TOP_SCORERS]) {
    if (!STATIC_PLAYER_PAGE_IDS.has(String(player.id))) continue;
    byId.set(player.id, player);
  }
  return [...byId.values()];
}

function getDefaultPopularTeams(popularTeams: Array<{ name: string; flag: string; pct: number; code: string }>, catalogTeams: UserPreferenceTeam[]): TeamCardItem[] {
  if (popularTeams.length) {
    return popularTeams.slice(0, 5).map((team) => ({
      id: team.code,
      name: team.name,
      flag: team.flag,
      pct: team.pct,
      href: teamHref({ id: team.code, name: team.name, region: team.code }),
    }));
  }

  return DEFAULT_POPULAR_TEAM_CODES.map((code) => {
    const team = catalogTeams.find((item) => item.region === code || item.name === code);
    return {
      id: team?.id ?? code,
      name: team?.name ?? code,
      logo: team?.logo,
      flag: getFlagUrl(normalizeFlagCode(code), 160),
      href: teamHref({ id: team?.id ?? code, name: team?.name ?? code, region: code }),
    };
  });
}

function getRecentScheduleMatches(matches: Match[], catalog: UserPreferenceCatalog, roundLabels?: Map<string, string>): MatchCardItem[] {
  const now = Date.now();
  const upcoming = matches
    .filter((match) => match.start.getTime() >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const source = upcoming.length ? upcoming : [...matches].sort((a, b) => Math.abs(a.start.getTime() - now) - Math.abs(b.start.getTime() - now));

  if (source.length) return source.map((match) => matchToCard(match, roundLabels?.get(match.uid)));

  return catalog.matches.map((match) => matchPreferenceToCard(match));
}

function matchToCard(match: Match, stageLabel?: string): MatchCardItem {
  const teams = parseTeams(match.summary);
  const homeName = match.homeTeam?.name || teams.home.name;
  const awayName = match.awayTeam?.name || teams.away.name;
  const homeCode = normalizeTeamCode(match.homeTeam?.code) || getTeamCodeByName(homeName);
  const awayCode = normalizeTeamCode(match.awayTeam?.code) || getTeamCodeByName(awayName);
  const homeFlag = match.homeTeam?.code ? getFlagUrl(normalizeFlagCode(match.homeTeam.code), 160) : teams.home.image;
  const awayFlag = match.awayTeam?.code ? getFlagUrl(normalizeFlagCode(match.awayTeam.code), 160) : teams.away.image;

  return {
    id: match.uid,
    title: formatMatchTitle(match.summary),
    stage: stageLabel || match.stage,
    startsAt: match.start.toISOString(),
    homeName,
    awayName,
    homeCode,
    awayCode,
    homeFlag,
    awayFlag,
    href: `/matches/${generateMatchSlug(match.summary)}/`,
  };
}

function matchPreferenceToCard(match: { id: string; title: string; stage?: string; startsAt?: string }, stageLabel?: string): MatchCardItem {
  const [homeName, awayName] = splitMatchTitle(match.title);

  return {
    id: match.id,
    title: formatMatchTitle(match.title),
    stage: stageLabel || match.stage,
    startsAt: match.startsAt,
    homeName,
    awayName,
    homeCode: getTeamCodeByName(homeName),
    awayCode: getTeamCodeByName(awayName),
    homeFlag: getFlagByTeamName(homeName),
    awayFlag: getFlagByTeamName(awayName),
    href: `/matches/${generateMatchSlug(match.title)}/`,
  };
}

function findRoundLabelForFavorite(
  favorite: { id: string; title: string; startsAt?: string },
  scheduleMatches: Match[],
  roundLabels: Map<string, string>,
) {
  const direct = roundLabels.get(favorite.id);
  if (direct) return direct;

  const title = formatMatchTitle(favorite.title);
  const startMs = favorite.startsAt ? new Date(favorite.startsAt).getTime() : NaN;
  const matched = scheduleMatches.find((match) => {
    if (formatMatchTitle(match.summary) !== title) return false;
    if (!Number.isFinite(startMs)) return true;
    return Math.abs(match.start.getTime() - startMs) < 60_000;
  });

  return matched ? roundLabels.get(matched.uid) : undefined;
}

function getTeamCodeByName(name: string) {
  return normalizeTeamCode(TEAM_NAME_TO_FLAG_CODE[cleanTeamName(name)]);
}

function getTeamFlag(team: { id?: string; region?: string; logo?: string; name: string }) {
  const logoFlag = normalizeTeamImage(team.logo);
  if (logoFlag?.includes("flagcdn.com/")) return logoFlag;

  const region = normalizeTeamCode(team.region);
  if (region) return getFlagUrl(region, 160);

  const id = normalizeTeamCode(team.id);
  if (id) return getFlagUrl(id, 160);

  return getFlagByTeamName(team.name);
}

function getFlagByTeamName(name: string) {
  const code = TEAM_NAME_TO_FLAG_CODE[cleanTeamName(name)];
  return code ? getFlagUrl(normalizeFlagCode(code), 160) : "";
}

function playerHref(player: { id: string; name?: string }) {
  return STATIC_PLAYER_PAGE_IDS.has(player.id) || /^\d+$/.test(player.id)
    ? `/players/${player.id}/`
    : `/players/?q=${encodeURIComponent(player.name || player.id)}`;
}

function teamHref(team: { id?: string; name: string; region?: string }) {
  const key = (team.region || team.id || "").toUpperCase();
  const qualifiedTeam = qualifiedTeams.find((item) => (
    item.code === key ||
    item.nameCn === team.name ||
    item.nameEn === team.name
  ));

  return qualifiedTeam?.detailHref || `/teams/${slugifyRoute(team.name)}`;
}

function slugifyRoute(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getLocalizedPlayerName(player: { id?: string | number | null; name?: string }) {
  const id = player.id == null ? "" : String(player.id);
  return PLAYER_NAME_TRANSLATIONS[id] || player.name || "球员";
}

function spreadPlayersByTeam(players: UserPreferencePlayer[], limit: number) {
  const selected: UserPreferencePlayer[] = [];
  const seenTeams = new Set<string>();

  for (const player of players) {
    const team = player.team || player.id;
    if (seenTeams.has(team)) continue;
    selected.push(player);
    seenTeams.add(team);
    if (selected.length >= limit) return selected;
  }

  for (const player of players) {
    if (selected.some((item) => item.id === player.id)) continue;
    selected.push(player);
    if (selected.length >= limit) return selected;
  }

  return selected;
}

function normalizeFlagCode(code: string) {
  const upper = code.toUpperCase();
  if (upper === "ALG") return "DZA";
  if (upper === "KSA") return "SAU";
  return upper;
}

function normalizeTeamCode(code?: string) {
  if (!code) return "";
  const upper = code.trim().toUpperCase();
  if (!upper || ["AFC", "CAF", "CONCACAF", "CONMEBOL", "OFC", "UEFA"].includes(upper)) return "";
  return normalizeFlagCode(upper);
}

function normalizeTeamImage(src?: string) {
  if (!src) return "";
  const svgMatch = src.match(/^https:\/\/flagcdn\.com\/([a-z-]+)\.svg$/i);
  if (svgMatch) return `https://flagcdn.com/w160/${svgMatch[1].toLowerCase()}.png`;
  return src;
}

const TEAM_NAME_TO_FLAG_CODE: Record<string, string> = {
  墨西哥: "MEX",
  南非: "RSA",
  韩国: "KOR",
  捷克: "CZE",
  加拿大: "CAN",
  波黑: "BIH",
  美国: "USA",
  巴拉圭: "PAR",
  卡塔尔: "QAT",
  瑞士: "SUI",
  巴西: "BRA",
  摩洛哥: "MAR",
  海地: "HAI",
  苏格兰: "SCO",
  土耳其: "TUR",
  日本: "JPN",
  德国: "GER",
  库拉索: "CUW",
  澳大利亚: "AUS",
  伊拉克: "IRQ",
  挪威: "NOR",
  科特迪瓦: "CIV",
  厄瓜多尔: "ECU",
  瑞典: "SWE",
  突尼斯: "TUN",
  西班牙: "ESP",
  佛得角: "CPV",
  比利时: "BEL",
  埃及: "EGY",
  沙特阿拉伯: "KSA",
  乌拉圭: "URU",
  伊朗: "IRN",
  新西兰: "NZL",
  法国: "FRA",
  塞内加尔: "SEN",
  阿根廷: "ARG",
  阿尔及利亚: "ALG",
  哥伦比亚: "COL",
  奥地利: "AUT",
  英格兰: "ENG",
  葡萄牙: "POR",
  荷兰: "NED",
};

function getTeamContinent(team: UserPreferenceTeam): ContinentKey {
  const code = team.region?.toUpperCase();
  if (code && TEAM_CONTINENTS[code]) return TEAM_CONTINENTS[code];
  return NAME_CONTINENTS[team.name] ?? "americas";
}

function getPlayerContinent(player: UserPreferencePlayer, teamsByName: Map<string, UserPreferenceTeam>): ContinentKey {
  const team = player.team ? teamsByName.get(player.team) : undefined;
  if (team) return getTeamContinent(team);
  return player.team ? NAME_CONTINENTS[player.team] ?? "americas" : "americas";
}

function continentLabel(continent: ContinentKey) {
  return CONTINENTS.find((item) => item.id === continent)?.label ?? "未分类";
}

function readableError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  const messages: Record<string, string> = {
    invalid_credentials: "邮箱或密码不符合要求，密码至少 8 位",
    invalid_email_or_password: "邮箱或密码不正确",
    email_already_registered: "这个邮箱已经注册过了",
    user_disabled: "这个账号已被停用",
    authentication_required: "请先登录",
    invitation_code_required: "请填写邀请码",
    invalid_invitation_code: "邀请码无效",
    invitation_code_disabled: "这个邀请码已停用",
    invitation_code_expired: "这个邀请码已过期",
    invitation_code_exhausted: "这个邀请码使用次数已满",
  };
  return messages[message] ?? fallback;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatMatchTime(startsAt: string | undefined) {
  if (!startsAt) return "TBD";

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(startsAt));
  } catch {
    return startsAt;
  }
}

function splitMatchTitle(title: string) {
  const teams = parseTeams(title);
  return [teams.home.name, teams.away.name];
}

function formatMatchTitle(title: string) {
  const [homeName, awayName] = splitMatchTitle(title);
  return `${homeName} vs ${awayName}`;
}

function cleanTeamName(name: string) {
  return name.trim().replace(/^[A-Z]{2,3}\s+(?=\p{L})/u, "").trim();
}

function toggleValue(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

function compactIds(id: string | undefined) {
  return id ? [id] : [];
}
