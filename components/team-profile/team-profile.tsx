"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getTeamCodeFromName } from "@/lib/team-localization";
import { parseTeams } from "@/lib/teams";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import Link from "next/link";
import { formatRoundLabel } from "@/lib/stage";
import { formatDate, formatTime } from "@/lib/format";
import { fetchWorldCupSquadDetails, type WorldCupSquadDetail } from "@/lib/world-cup-squads";
import { TeamSquadCard } from "@/components/team-profile/team-squad-card";
import type { TeamProfile } from "@/types/team-profile";
import "./team-profile.css";

interface TeamProfileProps {
  data: TeamProfile;
}

const SCROLL_STEP = 300;
const PROFILE_CODE_ALIASES: Record<string, string> = {
  ALG: "DZA",
  KSA: "SAU",
};

export function TeamProfile({ data }: TeamProfileProps) {
  const vpRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const { matches } = useWorldCupData();
  const [activeContentTab, setActiveContentTab] = useState<"profile" | "squad">("profile");
  const [squad, setSquad] = useState<WorldCupSquadDetail | null>(null);
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadError, setSquadError] = useState<string | null>(null);
  const targetCode = PROFILE_CODE_ALIASES[data.fifaCode] ?? data.fifaCode;

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

  const scroll = useCallback((dir: number) => {
    vpRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: "smooth" });
    window.setTimeout(syncNav, 320);
  }, [syncNav]);

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
        if (codes.includes(targetCode)) return true;

        const normalizedSummary = match.summary.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
        return nameNeedles.some((needle) => normalizedSummary.includes(needle));
      })
      .slice(0, 3);
  }, [data.nameCn, data.nameEn, matches, targetCode]);

  const teamMeta = useMemo(() => {
    for (const match of groupMatches) {
      const teams = parseTeams(match.summary);
      const homeCode = match.homeTeam?.code || getTeamCodeFromName(teams.home.name);
      const awayCode = match.awayTeam?.code || getTeamCodeFromName(teams.away.name);
      if (homeCode === targetCode && match.homeTeam?.id) return match.homeTeam;
      if (awayCode === targetCode && match.awayTeam?.id) return match.awayTeam;
    }

    for (const match of matches) {
      if (match.homeTeam?.code === targetCode && match.homeTeam.id) return match.homeTeam;
      if (match.awayTeam?.code === targetCode && match.awayTeam.id) return match.awayTeam;
    }

    return null;
  }, [groupMatches, matches, targetCode]);

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

  const { timeline, stories, quote, gallery } = data;
  const yearSpan = timeline.length ? `${timeline[0].year} - ${timeline[timeline.length - 1].year}` : "";
  const count = timeline.length;
  const flagImageCode = getFlagImageCode(data);
  const fixturesGroupLabel = groupMatches[0]
    ? formatRoundLabel(groupMatches[0].stage, groupMatches[0].summary)
    : "";
  const coachName = getCoachName(data);

  return (
    <div className="tp-wrap">
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
            <h1>{data.nameCn}</h1>
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
                        <div className="tp-fixture-venue">{match.location}</div>
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
          <div className="tp-content-tabs" aria-label="球队内容">
            <button
              type="button"
              role="tab"
              aria-selected={activeContentTab === "profile"}
              className={`tp-content-tab${activeContentTab === "profile" ? " active" : ""}`}
              onClick={() => setActiveContentTab("profile")}
            >
              球队档案
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeContentTab === "squad"}
              className={`tp-content-tab${activeContentTab === "squad" ? " active" : ""}`}
              onClick={() => setActiveContentTab("squad")}
            >
              本届阵容
            </button>
          </div>

          <div className="tp-content-panel">
            {activeContentTab === "profile" ? (
              <div className="tp-stories">
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
              </div>
            ) : (
              <TeamSquadCard
                teamName={teamMeta?.name || data.nameCn}
                coach={coachName}
                squad={squad}
                loading={squadLoading}
                error={squadError}
              />
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
  return data.infoCards.find((card) => /主教练|Coach/i.test(card.label))?.value ?? null;
}
