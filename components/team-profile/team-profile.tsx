"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getTeamCodeFromName } from "@/lib/team-localization";
import { localizeLocationText } from "@/lib/calendar";
import { parseTeams } from "@/lib/teams";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import Link from "next/link";
import { formatRoundLabel, getStageGroupId } from "@/lib/stage";
import { formatDate, formatTime } from "@/lib/format";
import { generateMatchRouteSlug } from "@/lib/match-detail";
import { fetchWorldCupSquadDetails, type WorldCupSquadDetail } from "@/lib/world-cup-squads";
import { localizeCoachName } from "@/lib/coach-localization";
import { TeamSquadCard } from "@/components/team-profile/team-squad-card";
import { MobileSecondaryPageActions } from "@/components/mobile-secondary-page-actions";
import { UserActionButton } from "@/components/user-action-button";
import { getFlagUrl } from "@/lib/world-cup-2026";
import type { TeamProfile } from "@/types/team-profile";
import "./team-profile.css";

interface TeamProfileProps {
  data: TeamProfile;
}

const SCROLL_STEP = 300;
const MOBILE_TOP_MODULE_OFFSET = 66;
const PROFILE_CODE_ALIASES: Record<string, string> = {
  ALG: "DZA",
  KSA: "SAU",
};

const TEAM_OUTLOOKS = [
  { country: "阿根廷", tier: "顶尖夺冠热门", view: "卫冕冠军依然保持着惊人的凝聚力。拥有刻入骨髓的家庭式战术文化，尽管面临更新换代，依然是所有人想要击败的终极标杆。" },
  { country: "西班牙", tier: "顶尖夺冠热门", view: "新一代斗牛士军团正处在风暴中心。以亚马尔为代表的年轻血液，正在用无与伦比的速度与创造力，颠覆过去传统的控球哲学。" },
  { country: "法国", tier: "顶尖夺冠热门", view: "阵容深度最可怕的掠夺者" },
  { country: "英格兰", tier: "顶尖夺冠热门", view: "阵容深度最可怕的掠夺者" },
  { country: "葡萄牙", tier: "顶尖夺冠热门", view: "这一代天才球员拥有赢得一切的拼图" },
  { country: "荷兰", tier: "顶尖夺冠热门", view: "阵容深度最可怕的掠夺者" },
  { country: "德国", tier: "顶尖夺冠热门", view: "本土化突破后迎来了青年才俊的全面爆发" },
  { country: "巴西", tier: "顶尖夺冠热门", view: "五星底蕴的最高敬意。内马尔、卡塞米罗等老将的经验，是时隔24年再度冲击大力神杯的底气。" },
  { country: "摩洛哥", tier: "黑马与中坚", view: "不再只是黑马，而是真正具备统治力的非洲王者。保留了高强度防守反击基因，并加入了更多欧洲顶级联赛淬炼过的青年新星。" },
  { country: "挪威", tier: "黑马与中坚", view: "拥有世界第一终结者（哈兰德）的深水炸弹" },
  { country: "苏格兰", tier: "黑马与中坚", view: "时隔28年重返世界杯大舞台" },
  { country: "克罗地亚", tier: "黑马与中坚", view: "永远不能被低估的铁血意志与足坛长青树" },
  { country: "日本", tier: "黑马与中坚", view: "打破欧美垄断的核心中坚。拥有前所未有的自信心与战术执行力。" },
  { country: "韩国", tier: "黑马与中坚", view: "打破欧美垄断的核心中坚" },
  { country: "伊朗", tier: "黑马与中坚", view: "打破欧美垄断的核心中坚" },
  { country: "沙特", tier: "黑马与中坚", view: "打破欧美垄断的核心中坚" },
  { country: "埃及", tier: "黑马与中坚", view: "打破欧美垄断的核心中坚" },
  { country: "塞内加尔", tier: "黑马与中坚", view: "打破欧美垄断的核心中坚" },
  { country: "乌兹别克斯坦", tier: "历史首秀新军", view: "真正实现了世界的破壁。晋级证明了48队赛制对全球足球普及与激发的积极意义。" },
  { country: "约旦", tier: "历史首秀新军", view: "真正实现了世界的破壁。晋级证明了48队赛制对全球足球普及与激发的积极意义。" },
  { country: "佛得角", tier: "历史首秀新军", view: "真正实现了世界的破壁" },
  { country: "库拉索", tier: "历史首秀新军", view: "真正实现了世界的破壁" },
  { country: "海地", tier: "时隔多年的回归者（1974后首次）", view: "不仅是足球的胜利，更是关于信仰和坚守的史诗故事" },
  { country: "伊拉克", tier: "时隔多年的回归者（1986后首次）", view: "不仅是足球的胜利，更是关于信仰和坚守的史诗故事" },
  { country: "美国", tier: "东道主", view: "朝气蓬勃的星条旗青年军距离真正的世界巨星行列仍有一段路要走，但在主场球迷的狂热加持下，拥有掀翻任何豪门的可能性。" },
  { country: "墨西哥", tier: "东道主", view: "呈现出极致的\"年龄两极化\"（17岁到43岁），拥有本届最年轻的17岁中场新星，在老辣与青春之间寻找平衡。" },
  { country: "加拿大", tier: "东道主", view: "北美正在崛起的红色风暴，速度与反击将是主场克敌制胜的法宝。" },
];

const TEAM_OUTLOOK_BY_CODE: Record<string, (typeof TEAM_OUTLOOKS)[number]> = {
  ARG: TEAM_OUTLOOKS[0],
  ESP: TEAM_OUTLOOKS[1],
  FRA: TEAM_OUTLOOKS[2],
  ENG: TEAM_OUTLOOKS[3],
  POR: TEAM_OUTLOOKS[4],
  NED: TEAM_OUTLOOKS[5],
  GER: TEAM_OUTLOOKS[6],
  BRA: TEAM_OUTLOOKS[7],
  MAR: TEAM_OUTLOOKS[8],
  NOR: TEAM_OUTLOOKS[9],
  SCO: TEAM_OUTLOOKS[10],
  CRO: TEAM_OUTLOOKS[11],
  JPN: TEAM_OUTLOOKS[12],
  KOR: TEAM_OUTLOOKS[13],
  IRN: TEAM_OUTLOOKS[14],
  SAU: TEAM_OUTLOOKS[15],
  KSA: TEAM_OUTLOOKS[15],
  EGY: TEAM_OUTLOOKS[16],
  SEN: TEAM_OUTLOOKS[17],
  UZB: TEAM_OUTLOOKS[18],
  JOR: TEAM_OUTLOOKS[19],
  CPV: TEAM_OUTLOOKS[20],
  CUW: TEAM_OUTLOOKS[21],
  HAI: TEAM_OUTLOOKS[22],
  IRQ: TEAM_OUTLOOKS[23],
  USA: TEAM_OUTLOOKS[24],
  MEX: TEAM_OUTLOOKS[25],
  CAN: TEAM_OUTLOOKS[26],
};

export function TeamProfile({ data }: TeamProfileProps) {
  const vpRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const { matches } = useWorldCupData();
  const [activeContentTab, setActiveContentTab] = useState<"profile" | "squad" | "fixtures">("squad");
  const contentTabsSentinelRef = useRef<HTMLDivElement>(null);
  const contentTabsRef = useRef<HTMLDivElement>(null);
  const [contentTabsPinned, setContentTabsPinned] = useState(false);
  const [contentTabsHeight, setContentTabsHeight] = useState(0);
  const [squad, setSquad] = useState<WorldCupSquadDetail | null>(null);
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadError, setSquadError] = useState<string | null>(null);
  const targetCode = PROFILE_CODE_ALIASES[data.fifaCode] ?? data.fifaCode;
  const matchCodes = useMemo(
    () => new Set([data.fifaCode, targetCode].filter(Boolean)),
    [data.fifaCode, targetCode]
  );

  const syncNav = useCallback(() => {
    const el = vpRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const atStart = el.scrollLeft <= 2;
    const atEnd = max <= 2 || el.scrollLeft >= max - 2;
    prevRef.current?.classList.toggle("off", atStart);
    nextRef.current?.classList.toggle("off", atEnd);
  }, []);

  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    syncNav();
    el.addEventListener("scroll", syncNav, { passive: true });
    window.addEventListener("resize", syncNav);
    return () => {
      el.removeEventListener("scroll", syncNav);
      window.removeEventListener("resize", syncNav);
    };
  }, [syncNav, data.timeline.length]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 1023px)");

    const syncPinnedState = () => {
      if (!mobileQuery.matches) {
        setContentTabsPinned(false);
        setContentTabsHeight(0);
        return;
      }

      const sentinel = contentTabsSentinelRef.current;
      const tabs = contentTabsRef.current;
      if (!sentinel || !tabs) return;

      const nextHeight = tabs.offsetHeight;
      setContentTabsHeight((current) => (current === nextHeight ? current : nextHeight));
      setContentTabsPinned(sentinel.getBoundingClientRect().top <= MOBILE_TOP_MODULE_OFFSET);
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
    window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: contentTabsPinned } }));
    return () => {
      window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: false } }));
    };
  }, [contentTabsPinned]);

  const scroll = useCallback((dir: number) => {
    vpRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: "smooth" });
    window.setTimeout(syncNav, 320);
  }, [syncNav]);

  const scrollToContentTabs = () => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    const sentinel = contentTabsSentinelRef.current;
    if (!sentinel) return;

    const offset = MOBILE_TOP_MODULE_OFFSET + (contentTabsRef.current?.offsetHeight ?? 0) + 12;
    const target = sentinel.getBoundingClientRect().top + window.scrollY - offset;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: Math.max(target, 0), behavior: "smooth" });
    });
  };

  const handleContentTabChange = (tab: "profile" | "squad" | "fixtures") => {
    if (tab === activeContentTab) return;
    setActiveContentTab(tab);
    if (!contentTabsPinned) scrollToContentTabs();
  };

  const groupMatches = useMemo(() => {
    const nameNeedles = [data.nameCn, data.nameEn]
      .map((name) => name.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase())
      .filter(Boolean);

    return matches
      .filter((match) => {
        const isGroupMatch = /Group|小组赛/.test(match.stage) || /Group|小组赛/.test(match.summary);
        if (!isGroupMatch) return false;

        const teams = parseTeams(match.summary);
        const codes = [teams.home.name, teams.away.name].map((name) => getTeamCodeFromName(name));
        if (codes.some((code) => matchCodes.has(code))) return true;

        const normalizedSummary = match.summary.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
        return nameNeedles.some((needle) => normalizedSummary.includes(needle));
      })
      .slice(0, 3);
  }, [data.nameCn, data.nameEn, matchCodes, matches]);

  const teamMeta = useMemo(() => {
    for (const match of groupMatches) {
      const teams = parseTeams(match.summary);
      const homeCode = match.homeTeam?.code || getTeamCodeFromName(teams.home.name);
      const awayCode = match.awayTeam?.code || getTeamCodeFromName(teams.away.name);
      if (matchCodes.has(homeCode) && match.homeTeam?.id) return match.homeTeam;
      if (matchCodes.has(awayCode) && match.awayTeam?.id) return match.awayTeam;
    }

    for (const match of matches) {
      if (match.homeTeam?.code && matchCodes.has(match.homeTeam.code) && match.homeTeam.id) return match.homeTeam;
      if (match.awayTeam?.code && matchCodes.has(match.awayTeam.code) && match.awayTeam.id) return match.awayTeam;
    }

    return null;
  }, [groupMatches, matchCodes, matches]);

  useEffect(() => {
    let active = true;
    setSquad(null);
    setSquadError(null);

    if (!teamMeta?.id) return;

    const teamId = teamMeta.id;
    setSquadLoading(true);
    fetchWorldCupSquadDetails([teamId])
      .then((squads) => {
        if (!active) return;
        setSquad(squads.get(teamId) ?? null);
      })
      .catch((err) => {
        if (!active) return;
        setSquadError(err instanceof Error ? err.message : "squad_request_failed");
      })
      .finally(() => {
        if (active) setSquadLoading(false);
      });

    return () => {
      active = false;
    };
  }, [teamMeta?.id]);

  const { timeline, stories, gallery, deepDive } = data;
  const yearSpan = timeline.length ? `${timeline[0].year} - ${timeline[timeline.length - 1].year}` : "";
  const count = timeline.length;
  const flagImageCode = getFlagImageCode(data);
  const fixturesGroupLabel = groupMatches[0] ? getFixtureGroupLabel(groupMatches[0].stage, groupMatches[0].summary) : "";
  const fallbackCoachName = getCoachName(data);
  const coachName = localizeCoachName(squad?.coach || fallbackCoachName) || fallbackCoachName;
  const profileOverviewStats = deepDive?.overviewStats.slice(2) ?? [];
  const teamOutlook = TEAM_OUTLOOK_BY_CODE[data.fifaCode] ?? TEAM_OUTLOOKS.find((item) => item.country === data.nameCn);
  const followPayload = {
    id: targetCode,
    name: data.nameCn,
    region: targetCode,
    logo: getFlagUrl(flagImageCode, 160),
  };
  const renderGallery = () =>
    gallery && gallery.length > 0 ? (
      <div className="tp-gallery">
        <div className="tp-gallery-grid">
          {gallery.map((g, i) => (
            <div key={i} className="tp-gallery-cell">
              <div className="tp-gallery-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.src} alt={g.caption} className="tp-gallery-img" loading="lazy" />
                <div className="tp-gallery-overlay">
                  <div className="tp-gallery-caption">{g.caption}</div>
                  {g.credit && <div className="tp-gallery-credit">© {g.credit}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null;
  const renderFixturesCard = (className = "tp-fixtures tp-side-card") => (
    <section className={className}>
      <div className="tp-side-card-heading">
        <div className="tp-side-card-title">比赛对阵</div>
        {fixturesGroupLabel && <div className="tp-fixtures-group">{fixturesGroupLabel}</div>}
      </div>
      {groupMatches.length > 0 ? (
        <div className="tp-fixtures-grid">
          {groupMatches.map((match, index) => {
            const teams = parseTeams(match.summary);
            const matchDate = formatDate(match.start);
            const matchTime = formatTime(match.start);
            const matchRoundLabel = getFixtureRoundLabel(match.stage, match.summary, index);
            return (
              <Link
                key={match.uid}
                href={`/matches/${generateMatchRouteSlug(match)}/`}
                className="tp-fixture-card"
                aria-label={`${teams.home.name} vs ${teams.away.name}`}
              >
                <div className="tp-fixture-teams">
                  <div className="tp-fixture-team">
                    <div className="tp-fixture-flag">
                      {teams.home.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={teams.home.image} alt="" />
                      ) : (
                        <span>{teams.home.badge}</span>
                      )}
                    </div>
                    <span className="tp-fixture-team-name">{teams.home.name}</span>
                  </div>
                  <div className="tp-fixture-kickoff">
                    <span>{matchDate}</span>
                    <span>{matchTime}</span>
                  </div>
                  <div className="tp-fixture-team tp-fixture-team--right">
                    <div className="tp-fixture-flag">
                      {teams.away.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={teams.away.image} alt="" />
                      ) : (
                        <span>{teams.away.badge}</span>
                      )}
                    </div>
                    <span className="tp-fixture-team-name">{teams.away.name}</span>
                  </div>
                </div>
                {match.location && (
                  <div className="tp-fixture-meta">
                    <span className="tp-fixture-round">{matchRoundLabel}</span>
                    <span className="tp-fixture-venue">{localizeLocationText(match.location)}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="tp-empty-state">赛程确认后自动同步</div>
      )}
    </section>
  );

  const renderOutlookCard = () => {
    const outlook = teamOutlook;
    const quote = data.quote;

    if (!outlook && !quote) return null;

    return (
      <div className="tp-quote tp-outlook-card">
        {outlook ? (
          <div className="tp-quote-text">{outlook.view}</div>
        ) : (
          <>
            <div className="tp-quote-text">{quote?.text}</div>
            <div className="tp-quote-src">— {quote?.source}</div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="tp-wrap">
      <MobileSecondaryPageActions
        backHref="/teams"
        backLabel="返回球队"
        title={contentTabsPinned ? data.nameCn : undefined}
        rightAction={
          <UserActionButton
            kind="team"
            payload={followPayload}
            iconOnly
          />
        }
      />
      <div className="tp-hero">
        {data.heroBanner && (
          <div className="tp-hero-banner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.heroBanner} alt="" className="tp-hero-banner-img" />
            <div className="tp-hero-banner-overlay" />
          </div>
        )}
        <Link href="/teams" className="tp-hero-back">
          <span className="tp-hero-back-arrow">{"←"}</span>
          <span>球队档案</span>
        </Link>
        <div className="tp-hero-inner">
          <div className="tp-flag" aria-label={`${data.nameCn} flag`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://flagcdn.com/${flagImageCode}.svg`} alt="" className="tp-flag-img" />
          </div>
          <div className="tp-hero-info">
            <div className="tp-hero-title-row">
              <h1>{data.nameCn}</h1>
              <UserActionButton
                kind="team"
                payload={followPayload}
                className="tp-hero-follow-button h-9 px-3 text-[10px] backdrop-blur-md"
              />
            </div>
            <div className="tp-hero-sub">
              <span className="accent">{data.nameEn}</span> · {data.confederation} · FIFA 排名 #{data.fifaRanking}
            </div>
            <div className="tp-hero-tags">
              {data.heroTags.map((tag, i) => (
                <span key={i} className={`tp-chip${i === 0 ? " volt" : ""}`}>{tag}</span>
              ))}
            </div>
          </div>
          <div className="tp-hero-stats">
            {data.heroStats.map((s, i) => (
              <div key={i}>
                <div className={`tp-hero-stat-val${isNumericStat(s.value) ? " is-number" : ""}`}>{s.value}</div>
                <div className="tp-hero-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="tp-sketch-grid">
        <aside className="tp-sidebar">
          <section className="tp-fixtures tp-side-card">
            <div className="tp-side-card-heading">
              <div className="tp-side-card-title">比赛对阵</div>
              {fixturesGroupLabel && <div className="tp-fixtures-group">{fixturesGroupLabel}</div>}
            </div>
            {groupMatches.length > 0 ? (
              <div className="tp-fixtures-grid">
                {groupMatches.map((match, index) => {
                  const teams = parseTeams(match.summary);
                  const matchDate = formatDate(match.start);
                  const matchTime = formatTime(match.start);
                  const matchRoundLabel = getFixtureRoundLabel(match.stage, match.summary, index);
                  return (
                    <Link
                      key={match.uid}
                      href={`/matches/${generateMatchRouteSlug(match)}/`}
                      className="tp-fixture-card"
                      aria-label={`${teams.home.name} vs ${teams.away.name}`}
                    >
                      <div className="tp-fixture-teams">
                        <div className="tp-fixture-team">
                          <div className="tp-fixture-flag">
                            {teams.home.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={teams.home.image} alt="" />
                            ) : (
                              <span>{teams.home.badge}</span>
                            )}
                          </div>
                          <span className="tp-fixture-team-name">{teams.home.name}</span>
                        </div>
                        <div className="tp-fixture-kickoff">
                          <span>{matchDate}</span>
                          <span>{matchTime}</span>
                        </div>
                        <div className="tp-fixture-team tp-fixture-team--right">
                          <div className="tp-fixture-flag">
                            {teams.away.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={teams.away.image} alt="" />
                            ) : (
                              <span>{teams.away.badge}</span>
                            )}
                          </div>
                          <span className="tp-fixture-team-name">{teams.away.name}</span>
                        </div>
                      </div>
                      {match.location && (
                        <div className="tp-fixture-meta">
                          <span className="tp-fixture-round">{matchRoundLabel}</span>
                          <span className="tp-fixture-venue">{localizeLocationText(match.location)}</span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="tp-empty-state">赛程确认后自动同步</div>
            )}
          </section>
        </aside>

        <main className="tp-main">
          <div
            ref={contentTabsSentinelRef}
            className="lg:hidden"
            style={{ height: contentTabsPinned ? contentTabsHeight : 0 }}
          />
          <div
            ref={contentTabsRef}
            className={`tp-content-tabs ${
              contentTabsPinned
                ? "fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+4.125rem)] z-[75] !px-3 !py-1"
                : ""
            }`}
            role="tablist"
            aria-label="球队内容"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeContentTab === "squad"}
              className={`tp-content-tab${activeContentTab === "squad" ? " active" : ""}`}
              onClick={() => handleContentTabChange("squad")}
            >
              {"\u672c\u5c4a\u9635\u5bb9"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeContentTab === "profile"}
              className={`tp-content-tab${activeContentTab === "profile" ? " active" : ""}`}
              onClick={() => handleContentTabChange("profile")}
            >
              {"\u7403\u961f\u6863\u6848"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeContentTab === "fixtures"}
              className={`tp-content-tab tp-content-tab--mobile-only${activeContentTab === "fixtures" ? " active" : ""}`}
              onClick={() => handleContentTabChange("fixtures")}
            >
              {"\u6bd4\u8d5b\u5bf9\u9635"}
            </button>
          </div>

          <div className={`tp-content-panel${activeContentTab === "profile" ? " tp-content-panel--bare" : activeContentTab === "fixtures" ? " tp-content-panel--fixtures" : ""}`}>
            {activeContentTab === "profile" ? (
              <div className="tp-stories">
                {deepDive && (
                  <div className="tp-deep-dive">
                    <div className="tp-overview-strip">
                      {profileOverviewStats.map((stat) => (
                        <div key={stat.label} className="tp-overview-card">
                          <div className={`tp-overview-value${isNumericStat(stat.value) ? " is-number" : ""}`}>{stat.value}</div>
                          <div className="tp-overview-label">{stat.label}</div>
                          {stat.note && <div className="tp-overview-note">{stat.note}</div>}
                        </div>
                      ))}
                    </div>

                    <section className={`tp-coach-card${deepDive.coach.image ? " has-image" : ""}`}>
                      <div className="tp-coach-copy">
                        <div className="tp-module-kicker">{deepDive.coach.title}</div>
                        <h2>{coachName || localizeCoachName(deepDive.coach.name) || deepDive.coach.name}</h2>
                        <p>{deepDive.coach.bio}</p>
                        {deepDive.coach.highlights && (
                          <div className="tp-coach-highlights">
                            {deepDive.coach.highlights.map((item) => (
                              <span key={item}>{item}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {deepDive.coach.image && (
                        <div className="tp-coach-media">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={deepDive.coach.image} alt={deepDive.coach.imageAlt ?? coachName ?? deepDive.coach.name} loading="lazy" />
                        </div>
                      )}
                    </section>

                    {deepDive.historyFacts.length > 0 && (
                      <section className="tp-history-grid" aria-label={`${data.nameCn} 历史数据`}>
                        {deepDive.historyFacts.map((fact) => (
                          <div key={fact.label} className="tp-history-cell">
                            <div className="tp-history-label">{fact.label}</div>
                            <div className="tp-history-value">{fact.value}</div>
                            {fact.note && <div className="tp-history-note">{fact.note}</div>}
                          </div>
                        ))}
                      </section>
                    )}

                    <article className="tp-feature-story">
                      <div className="tp-feature-media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={deepDive.featureStory.image} alt={deepDive.featureStory.imageAlt} loading="lazy" />
                      </div>
                      <div className="tp-feature-copy">
                        <div className="tp-module-kicker">{deepDive.featureStory.kicker}</div>
                        <h2>{deepDive.featureStory.title}</h2>
                        {deepDive.featureStory.body.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                        {deepDive.featureStory.source && (
                          <div className="tp-feature-source">{deepDive.featureStory.source}</div>
                        )}
                      </div>
                    </article>

                    <div className="tp-roadmap">
                      {deepDive.qualificationTimeline.map((item, index) => (
                        <div key={item} className="tp-roadmap-node">
                          <div className="tp-roadmap-index">{String(index + 1).padStart(2, "0")}</div>
                          <div className="tp-roadmap-dot" />
                          <div className="tp-roadmap-label">{item}</div>
                        </div>
                      ))}
                    </div>
                    {renderOutlookCard()}
                  </div>
                )}

                {!deepDive && (
                  <>
                    <div className="tp-tl-section tp-glass">
                      <div className="tp-tl-meta">
                        <span className="tp-section-badge">{count} 届</span>
                        <span className="tp-section-badge volt">{yearSpan}</span>
                      </div>
                      <div className="tp-tl-vp" ref={vpRef}>
                        <button ref={prevRef} className="tp-tl-nav prev off" onClick={() => scroll(-1)} aria-label="向左滚动">{"‹"}</button>
                        <button ref={nextRef} className="tp-tl-nav next" onClick={() => scroll(1)} aria-label="向右滚动">{"›"}</button>
                        <div className="tp-tl-track">
                          <div className="tp-tl-line" />
                          {timeline.map((t) => {
                            const isHl = !!t.highlight;
                            const isNow = t.year === 2026;
                            return (
                              <div key={t.year} className={`tp-tl-node${isHl ? " hl" : ""}${isNow ? " now" : ""}`}>
                                <div className="tp-tl-yr">{t.year}</div>
                                <div className="tp-tl-dot" />
                                <div className="tp-tl-result">{t.result}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="tp-story-grid">
                      {stories.map((s, i) => (
                        <div key={i} className={`tp-story-card${s.coverImg ? " has-img" : ""}`}>
                          {s.coverImg && (
                            <div className="tp-story-cover">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={s.coverImg} alt={s.title} className="tp-story-cover-img" loading="lazy" />
                              <div className="tp-story-cover-overlay" />
                            </div>
                          )}
                          <div className="tp-story-body">
                            <div className="tp-story-icon">{s.icon}</div>
                            <h3>{s.title}</h3>
                            <p>{s.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {renderOutlookCard()}
                  </>
                )}
              </div>
            ) : activeContentTab === "squad" ? (
              <TeamSquadCard
                teamName={teamMeta?.name || data.nameCn}
                coach={coachName}
                squad={squad}
                loading={squadLoading}
                error={squadError}
              />
            ) : (
              <>
                {renderGallery()}
                {renderFixturesCard("tp-fixtures tp-fixtures--panel")}
              </>
            )}
          </div>
        </main>
      </div>

      <div className="tp-cta">
        <a className="tp-btn tp-btn-primary" href="/matches">查看赛程安排</a>
        <a className="tp-btn tp-btn-ghost" href="/data">进入预测市场</a>
      </div>
    </div>
  );
}

function isNumericStat(value: string | number) {
  return typeof value === "number" || /^\d+$/.test(String(value));
}

function getFixtureGroupLabel(stage: string, summary?: string) {
  const groupId = getStageGroupId([stage, summary].filter(Boolean).join(" ")) ?? getStageGroupId(stage);
  return groupId ? `${groupId}组` : formatRoundLabel(stage, summary);
}

function getFixtureRoundLabel(stage: string, summary: string | undefined, index: number) {
  const source = [stage, summary].filter(Boolean).join(" ");
  const digitMatch =
    source.match(/(?:Round|Matchday)\s*(\d+)/i) ??
    source.match(/Group\s*Stage\s*-\s*(\d+)/i) ??
    source.match(/第\s*(\d+)\s*轮/);

  return `第 ${digitMatch?.[1] ?? index + 1} 轮`;
}

function getFlagImageCode(data: TeamProfile) {
  if (data.fifaCode === "ENG") return "gb-eng";
  if (data.fifaCode === "SCO") return "gb-sct";
  return data.countryCode.toLowerCase();
}

function getCoachName(data: TeamProfile) {
  const name = data.infoCards.find((card) => /主教练|Coach/i.test(card.label))?.value ?? null;
  return localizeCoachName(name) || null;
}
