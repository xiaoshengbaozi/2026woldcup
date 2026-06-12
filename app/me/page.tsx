"use client";

import { FormEvent, Suspense, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe2,
  LogIn,
  LogOut,
  Pencil,
  Send,
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
import { PlayerXTimeline } from "@/components/player-x-timeline";
import {
  fallbackUserPreferenceCatalog,
  getPlayerAvatar,
  type UserPreferenceCatalog,
  type UserPreferencePlayer,
  type UserPreferenceTeam,
} from "@/lib/user-preferences";
import { useUserPreferenceCatalog } from "@/lib/use-user-preferences";
import { useUserSession } from "@/components/user-session-provider";
import { userApi, type PublicUser, type UserHomePayload } from "@/lib/user-system";
import { fetchMyPlayerXTimeline, type PlayerXTimelinePayload } from "@/lib/player-x-timeline";
import { fetchWorldCupTopScorers, TOP_SCORERS_REFRESH_MS, type WorldCupTopScorer } from "@/lib/world-cup-top-scorers";
import { getFlagUrl } from "@/lib/world-cup-2026";
import { generateMatchSlug } from "@/lib/match-detail";
import { hasMatchInLiveRefreshWindow } from "@/lib/live-match-queue";
import { formatStageLabel } from "@/lib/stage";
import { buildMatchRoundLabels } from "@/lib/stage-rounds";
import { parseTeams } from "@/lib/teams";
import { useNow } from "@/lib/use-now";
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
type TimelineTab = "combined" | "x";
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
const MOBILE_TOP_MODULE_OFFSET = 66;

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
  const requestedTab = normalizeMeTab(searchParams.get("tab"));
  const resetToken = searchParams.get("resetToken");
  const { home: sessionHome, signedIn, loading: sessionLoading, refreshSession, clearSession } = useUserSession();
  const [home, setHome] = useState<UserHomePayload | null>(null);
  const sharedCatalog = useUserPreferenceCatalog(true);
  const [catalog, setCatalog] = useState<UserPreferenceCatalog>(sharedCatalog);
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
  const [emailNotice, setEmailNotice] = useState("");
  const ignoreAuthParamRef = useRef(false);
  const { matches, warmupMatches } = useWorldCupData();
  const currentTime = useNow(30_000);
  const topScorersRefreshEnabled = useMemo(
    () => hasMatchInLiveRefreshWindow([...matches, ...warmupMatches], currentTime),
    [currentTime, matches, warmupMatches]
  );
  const popularTeams = usePopularTeams();

  const avatarPlayerId = selectedPlayerIds[0] ?? catalog.players[0]?.id ?? fallbackUserPreferenceCatalog.players[0].id;

  const clearAuthUrl = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (!nextParams.has("auth") && !nextParams.has("resetToken")) return;
    nextParams.delete("auth");
    nextParams.delete("resetToken");
    const query = nextParams.toString();
    router.replace(query ? `/me?${query}` : "/me", { scroll: false });
  }, [router, searchParams]);

  async function loadHome() {
    try {
      const payload = await userApi<UserHomePayload>("/api/me/home", { cache: "no-store" });
      setHome(payload);
      if (payload.catalog) setCatalog(payload.catalog);
      setError("");
    } catch {
      setHome(null);
    }
  }

  useEffect(() => {
    setCatalog(sharedCatalog);
    setSelectedTeamIds((current) => (current.some((id) => sharedCatalog.teams.some((team) => team.id === id)) ? current : compactIds(sharedCatalog.teams[0]?.id)));
    setSelectedPlayerIds((current) => (current.some((id) => sharedCatalog.players.some((player) => player.id === id)) ? current : compactIds(sharedCatalog.players[0]?.id)));
  }, [sharedCatalog]);

  useEffect(() => {
    if (sessionLoading) return;
    setLoading(false);

    if (signedIn === true) {
      if (sessionHome) {
        setHome((current) => ({
          catalog: current?.catalog,
          user: sessionHome.user,
          summary: sessionHome.summary,
        }));
      }
      void loadHome();
      return;
    }

    setHome(null);
  }, [sessionHome, sessionLoading, signedIn]);

  useEffect(() => {
    if (searchParams.get("emailVerified") !== "success") return;
    setEmailNotice("邮箱验证成功");
    void loadHome();
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("emailVerified");
    const query = nextParams.toString();
    router.replace(query ? `/me?${query}` : "/me", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    let active = true;
    const syncTopScorers = (forceRefresh = false) => {
      fetchWorldCupTopScorers({ forceRefresh })
        .then((players) => {
          if (active && players.length) setTopScorers(fillTopScorers(players).slice(0, 6));
        })
        .catch(() => {
          if (active && !forceRefresh) setTopScorers(DEFAULT_TOP_SCORERS);
        });
    };

    syncTopScorers(false);
    const refreshId = topScorersRefreshEnabled
      ? window.setInterval(() => syncTopScorers(true), TOP_SCORERS_REFRESH_MS)
      : null;

    return () => {
      active = false;
      if (refreshId !== null) window.clearInterval(refreshId);
    };
  }, [topScorersRefreshEnabled]);

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

  useEffect(() => {
    if (!resetToken) return;
    openAuth("login", false);
  }, [openAuth, resetToken]);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("login");
    setError("");

    try {
      await userApi<{ user: PublicUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await refreshSession();
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
    if (!invitationCode.trim()) return setError("请填写赛波码");

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
      await refreshSession();
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
      clearSession();
      setHome(null);
      setEmailNotice("");
    } finally {
      setBusy("");
    }
  }

  async function resendEmailVerification() {
    setBusy("resendEmail");
    setEmailNotice("");
    try {
      const result = await userApi<{ user: PublicUser; emailVerificationSent?: boolean; alreadyVerified?: boolean }>("/api/auth/resend-verification", {
        method: "POST",
        body: "{}",
      });
      await loadHome();
      setEmailNotice(result.alreadyVerified ? "邮箱已验证" : result.emailVerificationSent ? "验证邮件已发送，请查收邮箱" : "邮件服务暂未配置");
    } catch (err) {
      setEmailNotice(readableError(err, "验证邮件发送失败，请稍后再试"));
    } finally {
      setBusy("");
    }
  }

  async function updateSignature(signature: string) {
    const nextSignature = signature.trim();
    if (!nextSignature) return;
    setBusy("signature");
    try {
      await userApi<{ user: PublicUser }>("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ signature: nextSignature }),
      });
      await loadHome();
    } finally {
      setBusy("");
    }
  }

  async function updateDisplayName(displayName: string) {
    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) return;
    setBusy("displayName");
    try {
      await userApi<{ user: PublicUser }>("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName: nextDisplayName }),
      });
      await refreshSession();
      void loadHome();
    } finally {
      setBusy("");
    }
  }

  return (
    <DashboardShell>
      <section className="me-page grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0 space-y-5 order-last lg:order-none"
        >
          <ProfileBoard home={home} catalog={catalog} scheduleMatches={matches} initialTab={requestedTab} />
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="hidden h-fit gap-5 lg:sticky lg:top-5 lg:grid"
        >
          <section className="hero-card me-account-card grid h-[235px] overflow-hidden p-5 text-black sm:p-6">
            <AccountCard
              home={home}
              catalog={catalog}
              avatarPlayerId={avatarPlayerId}
              busy={busy}
              emailNotice={emailNotice}
              onLogin={() => openAuth("login")}
              onRegister={() => openAuth("register")}
              onLogout={logout}
              onResendVerification={resendEmailVerification}
              onSignatureChange={updateSignature}
              onDisplayNameChange={updateDisplayName}
            />
          </section>
          <ScorerBoard players={topScorers} />
          <PopularTeamsPanel teams={getDefaultPopularTeams(popularTeams, catalog.teams)} />
        </motion.aside>
      </section>

      <MeAuthDialog
        mode={authMode}
        resetToken={resetToken}
        onClose={closeAuth}
        onAuthenticated={() => {
          void refreshSession();
          void loadHome();
        }}
      />
    </DashboardShell>
  );
}

function ProfileBoard({
  home,
  catalog,
  scheduleMatches,
  initialTab,
}: {
  home: UserHomePayload | null;
  catalog: UserPreferenceCatalog;
  scheduleMatches: Match[];
  initialTab: MeTab;
}) {
  const [activeTab, setActiveTab] = useState<MeTab>(initialTab);
  const [activeTimelineTab, setActiveTimelineTab] = useState<TimelineTab>("combined");
  const [xTimeline, setXTimeline] = useState<PlayerXTimelinePayload | null>(null);
  const [xTimelineLoading, setXTimelineLoading] = useState(false);
  const timelineTabsSentinelRef = useRef<HTMLDivElement>(null);
  const timelineTabsRef = useRef<HTMLDivElement>(null);
  const [timelineTabsPinned, setTimelineTabsPinned] = useState(false);
  const [timelineTabsHeight, setTimelineTabsHeight] = useState(0);
  const players: PlayerCardItem[] = home?.user.followedPlayers.length
    ? home.user.followedPlayers.map((player) => ({
        id: player.id,
        name: getLocalizedPlayerName(player),
        team: player.team,
        photo: player.photo,
        href: playerHref(player),
      }))
    : [];

  const teams: TeamCardItem[] = home?.user.followedTeams.length
    ? home.user.followedTeams.map((team) => ({
        id: team.id,
        name: team.name,
        logo: normalizeTeamImage(team.logo),
        flag: getTeamFlag(team),
        href: teamHref(team),
      }))
    : [];

  const roundLabels = useMemo(() => buildMatchRoundLabels(scheduleMatches), [scheduleMatches]);
  const matches: MatchCardItem[] = home?.user.favoriteMatches.length
    ? home.user.favoriteMatches.map((match) => matchPreferenceToCard(match, findRoundLabelForFavorite(match, scheduleMatches, roundLabels)))
    : [];

  const timeline = buildTimelineItems(players, teams, matches, Boolean(home));
  const xItemCount = xTimeline?.items.length ?? 0;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 1023px)");

    const syncPinnedState = () => {
      if (!mobileQuery.matches) {
        setTimelineTabsPinned(false);
        setTimelineTabsHeight(0);
        return;
      }

      const sentinel = timelineTabsSentinelRef.current;
      const tabs = timelineTabsRef.current;
      if (!sentinel || !tabs) return;

      const nextHeight = tabs.offsetHeight;
      setTimelineTabsHeight((current) => (current === nextHeight ? current : nextHeight));
      setTimelineTabsPinned(sentinel.getBoundingClientRect().top <= MOBILE_TOP_MODULE_OFFSET);
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

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: timelineTabsPinned } }));
    return () => {
      window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: false } }));
    };
  }, [timelineTabsPinned]);

  useEffect(() => {
    let active = true;
    if (!home || !home.user.followedPlayers.length) {
      setXTimeline(null);
      setXTimelineLoading(false);
      return () => {
        active = false;
      };
    }

    setXTimelineLoading(true);
    fetchMyPlayerXTimeline()
      .then((payload) => {
        if (active) setXTimeline(payload);
      })
      .catch(() => {
        if (active) setXTimeline({ timestamp: Date.now(), configured: false, warning: "x_timeline_failed", players: [], items: [] });
      })
      .finally(() => {
        if (active) setXTimelineLoading(false);
      });

    return () => {
      active = false;
    };
  }, [home]);

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
                className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ${
                  active
                    ? "text-black"
                    : "bg-white/[0.045] text-white/58 ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="me-tab-pill"
                    className="absolute inset-0 rounded-full bg-volt shadow-[0_0_26px_rgba(216,255,62,.2)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>
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
            className="mt-6 h-[143px]"
          >
            {activeTab === "players" &&
              (players.length ? (
                <ScrollableRail ariaLabel="滚动关注球员">
                  {players.slice(0, 8).map((player) => (
                    <div key={player.id} className="w-20 shrink-0 sm:w-24">
                      <PlayerBubble player={player} catalogPlayers={catalog.players} dimmed={!home} />
                    </div>
                  ))}
                </ScrollableRail>
              ) : (
                <EmptyFollowState label="关注球员" description="关注后，这里才会显示球员动态。" />
              ))}
            {activeTab === "teams" &&
              (teams.length ? (
                <ScrollableRail ariaLabel="滚动关注球队">
                  {teams.slice(0, 8).map((team) => (
                    <div key={team.id} className="w-20 shrink-0 sm:w-24">
                      <TeamBadge team={team} dimmed={!home} />
                    </div>
                  ))}
                </ScrollableRail>
              ) : (
                <EmptyFollowState label="关注球队" description="关注后，这里才会显示球队动态。" />
              ))}
            {activeTab === "matches" &&
              (matches.length ? (
                <ScrollableRail ariaLabel="滚动收藏比赛">
                  {matches.map((match) => (
                    <div key={match.id} className="w-[min(440px,82vw)] shrink-0">
                      <MatchStrip match={match} dimmed={!home} />
                    </div>
                  ))}
                </ScrollableRail>
              ) : (
                <EmptyFollowState label="收藏比赛" description="收藏后，这里才会显示比赛卡片。" />
              ))}
          </motion.div>
        </AnimatePresence>
      </section>

      <section className="min-w-0 overflow-hidden">
        <div
          ref={timelineTabsSentinelRef}
          className="lg:hidden"
          style={{ height: timelineTabsPinned ? timelineTabsHeight : 0 }}
        />
        <div
          ref={timelineTabsRef}
          className={`${
            timelineTabsPinned
              ? "fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+4.125rem)] z-[75] px-4 py-2"
              : "relative -mx-4 bg-black/58 px-4 py-2 backdrop-blur-2xl sm:-mx-5 sm:px-5"
          } lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none`}
        >
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="个人时间线分类">
            {[
              { key: "combined" as const, title: "综合时间线", count: timeline.length },
              { key: "x" as const, title: "X Timeline", count: xItemCount },
            ].map((item) => {
              const isActive = activeTimelineTab === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTimelineTab(item.key)}
                  className={`group relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 text-left text-xs font-bold transition-colors duration-300 ${
                    isActive
                      ? "text-black"
                      : "bg-white/[0.055] text-white/62 ring-1 ring-white/[0.08] hover:bg-white/[0.09] hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="me-timeline-tab-pill"
                      className="absolute inset-0 rounded-full bg-volt shadow-[0_0_24px_rgba(216,255,62,.2)]"
                      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
                    />
                  )}
                  <span className="relative z-10">{item.title}</span>
                  <span
                    className={`relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums transition-colors duration-200 ${
                      isActive
                        ? "bg-black/15 text-black"
                        : "bg-black/25 text-volt/80 group-hover:bg-volt/[0.12]"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {activeTimelineTab === "combined" ? (
            timeline.length ? (
              timeline.map((item, index) => <TimelineCard key={item.id} item={item} index={index} />)
            ) : (
              <EmptyTimelineState signedIn={Boolean(home)} />
            )
          ) : home ? (
            home.user.followedPlayers.length ? (
              <PlayerXTimeline
                items={xTimeline?.items ?? []}
                configured={xTimeline?.configured}
                warning={xTimeline?.warning}
                loading={xTimelineLoading}
                compact
                showHeader={false}
              />
            ) : (
              <EmptyTimelineState signedIn />
            )
          ) : (
            <div className="rounded-2xl bg-white/[0.025] px-4 py-8 text-center text-sm font-semibold text-white/42 ring-1 ring-white/[0.06]">
              登录关注球员的日常动态
            </div>
          )}
        </div>
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
      <div ref={scrollRef} className="flex h-full items-start gap-4 overflow-x-auto py-2 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
    <div className={`me-follow-card group flex shrink-0 flex-col items-center text-center ${dimmed ? "opacity-60" : ""}`} style={{ width: "var(--me-follow-card-width)", height: 127 }}>
      <div className="me-follow-avatar relative overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.1] transition duration-300 group-hover:scale-105 group-hover:ring-volt/45" style={{ width: "var(--me-follow-avatar-size)", height: "var(--me-follow-avatar-size)", minHeight: "var(--me-follow-avatar-size)", maxHeight: "var(--me-follow-avatar-size)" }}>
        <Image src={player.photo || getPlayerAvatar(player.id, catalogPlayers)} alt={player.name} fill sizes="(min-width: 640px) 80px, 68px" className="object-cover" />
      </div>
      <span className="mt-2.5 w-full truncate text-[11px] font-medium text-white/60 group-hover:text-volt sm:mt-3 sm:text-xs">
        {player.name}
      </span>
      <span className="mt-0.5 w-full truncate text-[10px] text-white/28 sm:text-[11px]">{player.team || "国家待定"}</span>
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
    <div className={`me-follow-card group flex shrink-0 flex-col items-center text-center transition ${dimmed ? "opacity-60" : ""}`} style={{ width: "var(--me-follow-card-width)", height: 127 }}>
      <div className="me-follow-avatar relative overflow-hidden rounded-full bg-white/[0.06] p-1.5 ring-1 ring-white/[0.1] transition duration-300 group-hover:scale-105 group-hover:ring-volt/45" style={{ width: "var(--me-follow-avatar-size)", height: "var(--me-follow-avatar-size)", minHeight: "var(--me-follow-avatar-size)", maxHeight: "var(--me-follow-avatar-size)" }}>
        {team.flag ? <Image src={team.flag} alt={team.name} fill sizes="(min-width: 640px) 80px, 68px" className="object-cover opacity-92" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/42 via-black/8 to-transparent" />
        {team.logo && !team.flag ? <Image src={team.logo} alt={team.name} fill sizes="(min-width: 640px) 80px, 68px" className="object-contain p-2" /> : null}
        {!team.logo && !team.flag ? <Trophy className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-volt" /> : null}
        {team.pct !== undefined && <span className="absolute right-1 top-1 rounded-full bg-black/45 px-1.5 py-0.5 text-[8px] font-bold text-volt ring-1 ring-white/10">{team.pct}%</span>}
      </div>
      <p className="mt-2.5 w-full truncate text-[11px] font-medium text-white/60 group-hover:text-volt sm:mt-3 sm:text-xs">{team.name}</p>
      <p className="mt-0.5 w-full truncate text-[10px] text-white/28 sm:text-[11px]">{team.pct !== undefined ? `${team.pct}%` : "Team"}</p>
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

function EmptyFollowState({ label, description }: { label: string; description: string }) {
  return (
    <div className="grid h-full place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 text-center">
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-sm text-white/38">{description}</p>
      </div>
    </div>
  );
}

function EmptyTimelineState({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="rounded-2xl bg-white/[0.025] px-4 py-8 text-center text-sm font-semibold text-white/42 ring-1 ring-white/[0.06]">
      {signedIn ? "关注或收藏后，这里会出现你的个人时间线。" : "登录后关注或收藏，时间线才会开始显示。"}
    </div>
  );
}

function ScorerBoard({ players }: { players: WorldCupTopScorer[] }) {
  return (
    <section className="hero-card overflow-hidden p-4">
      <div className="flex items-center gap-2 px-1 pb-2">
        <Trophy className="h-4 w-4 text-volt" />
        <h2 className="text-sm font-semibold text-white">射手榜</h2>
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
      <div className="flex items-center gap-2 px-1 pb-3">
        <Star className="h-4 w-4 text-volt" />
        <h2 className="text-sm font-semibold text-white">热门球队</h2>
      </div>
      <div className="divide-y divide-white/[0.06]">
        {teams.slice(0, 6).map((team) => (
          <Link key={team.id} href={team.href || "/teams"} className="group flex items-center gap-3 px-1 py-3 transition hover:text-volt">
            <div className="relative h-8 w-11 shrink-0 overflow-hidden rounded-xl bg-white/[0.06] ring-1 ring-white/10">
              {team.flag ? <Image src={team.flag} alt={team.name} fill sizes="44px" className="object-cover" /> : team.logo ? <Image src={team.logo} alt={team.name} fill sizes="44px" className="object-contain p-1.5" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white/76 transition group-hover:text-volt">{team.name}</p>
            </div>
            {team.pct !== undefined && <span className="text-xs font-black text-volt">{team.pct}%</span>}
          </Link>
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
  emailNotice,
  onLogin,
  onRegister,
  onLogout,
  onResendVerification,
  onSignatureChange,
  onDisplayNameChange,
}: {
  home: UserHomePayload | null;
  catalog: UserPreferenceCatalog;
  avatarPlayerId: string;
  busy: string;
  emailNotice: string;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
  onResendVerification: () => void;
  onSignatureChange: (signature: string) => Promise<void>;
  onDisplayNameChange: (displayName: string) => Promise<void>;
}) {
  const avatar = home
    ? home.user.profile.avatarUrl || getPlayerAvatar(home.user.profile.avatarPlayerId, home.catalog?.players ?? catalog.players)
    : getPlayerAvatar(avatarPlayerId, catalog.players);
  const followedTeamFlags = home
    ? home.user.followedTeams
        .slice(0, 5)
        .map((team) => ({ id: team.id, name: team.name, flag: getTeamFlag(team) }))
        .filter((team) => team.flag)
    : [];
  const signature = home?.user.profile.signature?.trim() || "一脚世界波";
  const displayName = home?.user.profile.displayName ?? "";
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState(displayName);
  const [editingSignature, setEditingSignature] = useState(false);
  const [signatureDraft, setSignatureDraft] = useState(signature);

  useEffect(() => {
    setDisplayNameDraft(displayName);
  }, [displayName]);

  useEffect(() => {
    setSignatureDraft(signature);
  }, [signature]);

  async function saveDisplayName() {
    const nextDisplayName = displayNameDraft.trim();
    if (!nextDisplayName) return;
    await onDisplayNameChange(nextDisplayName);
    setEditingDisplayName(false);
  }

  async function saveSignature() {
    const nextSignature = signatureDraft.trim();
    if (!nextSignature) return;
    await onSignatureChange(nextSignature);
    setEditingSignature(false);
  }

  return (
    <div className="relative z-10 grid h-full content-center justify-items-center gap-4">
      {home ? (
        <div className="grid w-full gap-4 text-black">
          <div className="flex items-center justify-start gap-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-white/[0.06] shadow-[0_0_34px_rgba(12,19,0,.18)] ring-1 ring-black/10">
              <Image src={avatar} alt={home.user.profile.displayName} fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0">
              {editingDisplayName ? (
                <div className="flex min-w-0 items-center gap-1.5">
                  <input
                    value={displayNameDraft}
                    maxLength={24}
                    onChange={(event) => setDisplayNameDraft(event.target.value)}
                    className="h-8 min-w-0 flex-1 rounded-full bg-black/[0.07] px-3 text-sm font-semibold text-black outline-none ring-1 ring-black/10 focus:ring-black/25"
                  />
                  <button
                    type="button"
                    disabled={busy === "displayName"}
                    onClick={saveDisplayName}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:opacity-85 disabled:opacity-50"
                    aria-label="保存昵称"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-xl font-semibold text-black">{home.user.profile.displayName}</p>
                  <button
                    type="button"
                    onClick={() => setEditingDisplayName(true)}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-black/58 transition hover:bg-black/[0.1] hover:text-black"
                    aria-label="修改昵称"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
              {home.user.emailVerifiedAt ? (
                <div className="mt-1 flex min-w-0 items-center gap-1.5">
                  {editingSignature ? (
                    <>
                      <input
                        value={signatureDraft}
                        maxLength={36}
                        onChange={(event) => setSignatureDraft(event.target.value)}
                        className="h-7 min-w-0 flex-1 rounded-full bg-black/[0.07] px-3 text-xs font-semibold text-black outline-none ring-1 ring-black/10 focus:ring-black/25"
                      />
                      <button
                        type="button"
                        disabled={busy === "signature"}
                        onClick={saveSignature}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:opacity-85 disabled:opacity-50"
                        aria-label="保存签名"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="min-w-0 truncate text-xs font-semibold text-black/58">{signature}</p>
                      <button
                        type="button"
                        onClick={() => setEditingSignature(true)}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-black/58 transition hover:bg-black/[0.1] hover:text-black"
                        aria-label="修改签名"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold text-black/54">邮箱待验证</span>
                  <button
                    type="button"
                    disabled={busy === "resendEmail"}
                    onClick={onResendVerification}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-black px-2.5 text-[11px] font-bold text-white transition hover:opacity-85 disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    {busy === "resendEmail" ? "发送中" : "重发"}
                  </button>
                  {emailNotice && <span className="min-w-0 truncate text-xs font-semibold text-black/58">{emailNotice}</span>}
                </div>
              )}
              {followedTeamFlags.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  {followedTeamFlags.map((team) => (
                    <span key={team.id} className="relative h-5 w-7 overflow-hidden rounded-[0.35rem] bg-black/10 ring-1 ring-black/10">
                      <Image src={team.flag} alt={team.name} fill sizes="28px" className="object-cover" />
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-dashed border-[#20242d61] pt-4">
            <div className="grid grid-cols-3 divide-x divide-[#20242d61] text-center">
              <AccountStat value={home.summary.followedPlayerCount} label="关注球员" />
              <AccountStat value={home.summary.followedTeamCount} label="关注球队" />
              <AccountStat value={home.summary.favoriteMatchCount} label="收藏比赛" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid w-full grid-cols-2 gap-3">
          <button type="button" onClick={onLogin} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-xs font-medium text-white/82 ring-1 ring-white/12 transition hover:bg-white/[0.1]">
            <LogIn className="h-3.5 w-3.5" />
            登录
          </button>
          <button type="button" onClick={onRegister} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-volt px-3 text-xs font-semibold text-black shadow-[0_0_30px_rgba(216,255,62,.18)] transition hover:scale-[1.02]">
            <UserPlus className="h-3.5 w-3.5" />
            注册
          </button>
        </div>
      )}
    </div>
  );
}

function AccountStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="grid justify-items-center gap-1.5 px-2">
      <span className="text-3xl font-semibold leading-none tabular-nums text-black" style={{ fontFamily: "ScreenMatrix, monospace" }}>
        {value}
      </span>
      <span className="text-[12px] font-bold leading-none text-black/78">{label}</span>
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
      <AuthInput label="赛波码" value={invitationCode} required onChange={onInvitationCodeChange} />
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

function normalizeMeTab(value: string | null): MeTab {
  return value === "teams" || value === "matches" || value === "players" ? value : "players";
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
    invitation_code_required: "请填写赛波码",
    invalid_invitation_code: "赛波码无效",
    invitation_code_disabled: "这个赛波码已停用",
    invitation_code_expired: "这个赛波码已过期",
    invitation_code_exhausted: "这个赛波码使用次数已满",
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
