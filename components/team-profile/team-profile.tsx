"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getTeamCodeFromName } from "@/lib/team-localization";
import { localizeLocationText } from "@/lib/calendar";
import { parseTeams } from "@/lib/teams";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import Link from "next/link";
import { formatRoundLabel } from "@/lib/stage";
import { formatDate, formatTime } from "@/lib/format";
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

export function TeamProfile({ data }: TeamProfileProps) {
  const vpRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const { matches } = useWorldCupData();
  const [activeContentTab, setActiveContentTab] = useState<"profile" | "squad" | "fixtures">("profile");
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
    scrollToContentTabs();
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

  const { timeline, stories, quote, gallery, deepDive } = data;
  const yearSpan = timeline.length ? `${timeline[0].year} - ${timeline[timeline.length - 1].year}` : "";
  const count = timeline.length;
  const flagImageCode = getFlagImageCode(data);
  const fixturesGroupLabel = groupMatches[0]
    ? formatRoundLabel(groupMatches[0].stage, groupMatches[0].summary)
    : "";
  const fallbackCoachName = getCoachName(data);
  const coachName = localizeCoachName(squad?.coach || fallbackCoachName) || fallbackCoachName;
  const followPayload = {
    id: targetCode,
    name: data.nameCn,
    region: targetCode,
    logo: getFlagUrl(flagImageCode, 160),
  };
  const renderFixturesCard = (className = "tp-fixtures tp-side-card") => (
    <section className={className}>
      <div className="tp-side-card-heading">
        <div className="tp-side-card-title">比赛对阵</div>
        {fixturesGroupLabel && <div className="tp-fixtures-group">{fixturesGroupLabel}</div>}
      </div>
      {groupMatches.length > 0 ? (
        <div className="tp-fixtures-grid">
          {groupMatches.map((match) => {
            const teams = parseTeams(match.summary);
            const matchDate = formatDate(match.start);
            const matchTime = formatTime(match.start);
            return (
              <div key={match.uid} className="tp-fixture-card">
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
                  <div className="tp-fixture-venue">{localizeLocationText(match.location)}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tp-empty-state">赛程确认后自动同步</div>
      )}
    </section>
  );

  return (
    <div className="tp-wrap">
      <MobileSecondaryPageActions
        backHref="/teams"
        backLabel="返回球队"
        reserveSpace
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
                {groupMatches.map((match) => {
                  const teams = parseTeams(match.summary);
                  const matchDate = formatDate(match.start);
                  const matchTime = formatTime(match.start);
                  return (
                    <div key={match.uid} className="tp-fixture-card">
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
                        <div className="tp-fixture-venue">{localizeLocationText(match.location)}</div>
                      )}
                    </div>
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
                ? "fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+4.125rem)] z-[65] !px-3 !py-2"
                : ""
            }`}
            aria-label="球队内容"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeContentTab === "profile"}
              className={`tp-content-tab${activeContentTab === "profile" ? " active" : ""}`}
              onClick={() => handleContentTabChange("profile")}
            >
              球队档案
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeContentTab === "squad"}
              className={`tp-content-tab${activeContentTab === "squad" ? " active" : ""}`}
              onClick={() => handleContentTabChange("squad")}
            >
              本届阵容
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeContentTab === "fixtures"}
              className={`tp-content-tab tp-content-tab--mobile-only${activeContentTab === "fixtures" ? " active" : ""}`}
              onClick={() => handleContentTabChange("fixtures")}
            >
              比赛对阵
            </button>
          </div>

          <div className={`tp-content-panel${activeContentTab === "profile" ? " tp-content-panel--bare" : activeContentTab === "fixtures" ? " tp-content-panel--fixtures" : ""}`}>
            {activeContentTab === "profile" ? (
              <div className="tp-stories">
                {deepDive && (
                  <div className="tp-deep-dive">
                    <div className="tp-overview-strip">
                      {deepDive.overviewStats.map((stat) => (
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
              renderFixturesCard("tp-fixtures tp-fixtures--panel")
            )}
          </div>
        </main>
      </div>

      {quote && (
        <div className="tp-quote">
          <div className="tp-quote-text">{quote.text}</div>
          <div className="tp-quote-src">— {quote.source}</div>
        </div>
      )}

      {gallery && gallery.length > 0 && (
        <div className="tp-gallery">
          <div className="tp-section-hd">
            <div className="tp-section-hd-left">
              <div className="tp-section-icon">{"\u{1F4F8}"}</div>
              <span className="tp-section-title">经典瞬间</span>
            </div>
            <span className="tp-section-badge volt">{gallery.length} 张</span>
          </div>
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
      )}

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

function getFlagImageCode(data: TeamProfile) {
  if (data.fifaCode === "ENG") return "gb-eng";
  if (data.fifaCode === "SCO") return "gb-sct";
  return data.countryCode.toLowerCase();
}

function getCoachName(data: TeamProfile) {
  const name = data.infoCards.find((card) => /主教练|Coach/i.test(card.label))?.value ?? null;
  return localizeCoachName(name) || null;
}
