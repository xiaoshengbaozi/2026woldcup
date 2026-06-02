"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { getTeamCodeFromName } from "@/lib/team-localization";
import { parseTeams } from "@/lib/teams";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import Link from "next/link";
import { formatRoundLabel } from "@/lib/stage";
import { formatDate, formatTime } from "@/lib/format";
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
    const targetCode = PROFILE_CODE_ALIASES[data.fifaCode] ?? data.fifaCode;
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
  }, [data.fifaCode, data.nameCn, data.nameEn, matches]);

  const { timeline, infoCards, stories, quote, gallery, keyPlayers } = data;
  const yearSpan = timeline.length ? `${timeline[0].year} - ${timeline[timeline.length - 1].year}` : "";
  const count = timeline.length;
  const flagImageCode = getFlagImageCode(data);

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

      {groupMatches.length > 0 && (
        <section className="tp-fixtures">
          <div className="tp-fixtures-grid">
            {groupMatches.map((match) => {
              const teams = parseTeams(match.summary);
              const roundLabel = formatRoundLabel(match.stage, match.summary);
              const matchDate = formatDate(match.start);
              const matchTime = formatTime(match.start);
              return (
                <div key={match.uid} className="tp-fixture-card">
                  <div className="tp-fixture-round">{roundLabel}</div>
                  <div className="tp-fixture-date">{matchDate} {matchTime}</div>
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
                    <span className="tp-fixture-vs">VS</span>
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
        </section>
      )}

      <div className="tp-info-grid">
        {infoCards.map((card, i) => (
          <div key={i} className="tp-info-cell">
            <div className="tp-info-label">{card.label}</div>
            <div className={`tp-info-value${card.highlight ? " volt" : ""}`}>{card.value}</div>
            <div className="tp-info-desc">{card.desc}</div>
          </div>
        ))}
      </div>

      <div className="tp-tl-section tp-glass">
        <div className="tp-section-hd">
          <div className="tp-section-hd-left">
            <div className="tp-section-icon">{"\u{1F3C6}"}</div>
            <span className="tp-section-title">世界杯征程</span>
            <span className="tp-section-badge">{count} 届</span>
          </div>
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

      <div className="tp-stories">
        <div className="tp-section-hd">
          <div className="tp-section-hd-left">
            <div className="tp-section-icon">{"\u{1F4D6}"}</div>
            <span className="tp-section-title">球队档案</span>
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

      <div className="tp-players">
        <div className="tp-section-hd">
          <div className="tp-section-hd-left">
            <div className="tp-section-icon">{"\u{1F465}"}</div>
            <span className="tp-section-title">关键球员</span>
          </div>
          <span className="tp-section-badge volt">TOP {keyPlayers.length}</span>
        </div>
        <div className="tp-players-grid">
          {keyPlayers.map((p) => (
            <div key={`${p.name}-${p.number}`} className="tp-player-cell">
              {p.photo ? (
                <div className="tp-player-photo-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt={p.name} className="tp-player-photo" loading="lazy" />
                </div>
              ) : (
                <div className="tp-player-avatar">{p.number}</div>
              )}
              <div className="tp-player-name">{p.name}</div>
              <div className="tp-player-pos">{p.position}</div>
              <div className="tp-player-club">{p.club}</div>
            </div>
          ))}
        </div>
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

function getFlagImageCode(data: TeamProfile) {
  if (data.fifaCode === "ENG") return "gb-eng";
  if (data.fifaCode === "SCO") return "gb-sct";
  return data.countryCode.toLowerCase();
}
