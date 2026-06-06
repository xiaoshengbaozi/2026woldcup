"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlayerXTimeline } from "@/components/player-x-timeline";
import playerArticles from "@/data/player-articles.json";
import { fetchPlayerXTimeline, type PlayerXTimelinePayload } from "@/lib/player-x-timeline";
import { fetchPopularPlayers, type PopularPlayerFollow } from "@/lib/user-system";
import { fallbackTopScorerProfiles } from "@/lib/world-cup-top-scorers";

type PlayerArticle = (typeof playerArticles.players)[number];
type PlayerTab = "superstars" | "wonderkids" | "popular";

const tabs: { id: PlayerTab; label: string }[] = [
  { id: "superstars", label: "超级巨星" },
  { id: "wonderkids", label: "神童" },
  { id: "popular", label: "最受欢迎" },
];

const countryNameCn: Record<string, string> = {
  Argentina: "阿根廷",
  Norway: "挪威",
  France: "法国",
  Egypt: "埃及",
  Brazil: "巴西",
  England: "英格兰",
  Spain: "西班牙",
  Uruguay: "乌拉圭",
  Portugal: "葡萄牙",
  Belgium: "比利时",
  Colombia: "哥伦比亚",
  Germany: "德国",
  Croatia: "克罗地亚",
  USA: "美国",
  Algeria: "阿尔及利亚",
  Senegal: "塞内加尔",
  Ecuador: "厄瓜多尔",
  Turkey: "土耳其",
  "Côte d'Ivoire": "科特迪瓦",
};

export function PlayersClient() {
  const [activeTab, setActiveTab] = useState<PlayerTab>("superstars");
  const [xTimeline, setXTimeline] = useState<PlayerXTimelinePayload | null>(null);
  const [xTimelineLoading, setXTimelineLoading] = useState(true);
  const [popularFollows, setPopularFollows] = useState<PopularPlayerFollow[]>([]);

  const popularPlayers = useMemo(() => {
    const articlesByKey = new Map<string, PlayerArticle>();
    for (const player of playerArticles.players) {
      [player.slug, player.nameEn, player.nameCn, String(player.apiPlayerId), String(player.id)]
        .filter(Boolean)
        .forEach((key) => articlesByKey.set(normalizePlayerLookupKey(key), player));
    }

    const seen = new Set<string>();
    return popularFollows
      .map((player) => articlesByKey.get(normalizePlayerLookupKey(player.id)) ?? articlesByKey.get(normalizePlayerLookupKey(player.name)))
      .filter((player): player is PlayerArticle => {
        if (!player || seen.has(player.id)) return false;
        seen.add(player.id);
        return true;
      });
  }, [popularFollows]);

  const visiblePlayers = useMemo(
    () => (activeTab === "popular" ? popularPlayers : playerArticles.players.filter((player) => player.category === activeTab)),
    [activeTab, popularPlayers]
  );

  const visiblePlayerIds = useMemo(() => visiblePlayers.map((player) => player.apiPlayerId || player.id), [visiblePlayers]);

  useEffect(() => {
    let active = true;
    fetchPopularPlayers(24)
      .then((payload) => {
        if (active) setPopularFollows(payload.players);
      })
      .catch(() => {
        if (active) setPopularFollows([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setXTimelineLoading(true);
    fetchPlayerXTimeline(visiblePlayerIds)
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
  }, [visiblePlayerIds]);

  return (
    <DashboardShell>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-5">
          <section className="hero-card px-4 py-4 sm:px-5">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="球员分类">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative rounded-full px-4 py-2 text-sm font-bold transition duration-300 ${
                      active
                        ? "bg-volt text-black shadow-[0_0_26px_rgba(216,255,62,.2)]"
                        : "bg-white/[0.045] text-white/58 ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
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
                className="mt-6 min-h-[7.5rem] sm:min-h-[8.75rem]"
              >
                <PlayerRail players={visiblePlayers} />
              </motion.div>
            </AnimatePresence>
          </section>

          <PlayerXTimeline
            items={xTimeline?.items ?? []}
            configured={xTimeline?.configured}
            warning={xTimeline?.warning}
            loading={xTimelineLoading}
          />

          <section className="space-y-4">
            {visiblePlayers.map((player, index) => (
              <TimelinePost key={player.id} player={player} index={index} />
            ))}
          </section>
        </main>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <ScorerBoard />
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/50">{"资料覆盖"}</h2>
              <span className="text-xs font-black text-volt">{playerArticles.count}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MiniStat label="巨星" value={playerArticles.players.filter((p) => p.category === "superstars").length} />
              <MiniStat label="新星" value={playerArticles.players.filter((p) => p.category === "wonderkids").length} />
            </div>
          </section>
        </aside>
      </div>
    </DashboardShell>
  );
}

function PlayerRail({ players }: { players: PlayerArticle[] }) {
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
  }, [checkScroll, players]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -el.clientWidth * 0.6 : el.clientWidth * 0.6, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {players.map((player) => (
            <Link
              key={player.id}
              href={playerProfileHref(player)}
              className="group flex w-20 shrink-0 flex-col items-center text-center sm:w-24"
            >
              <div className="relative h-17 w-17 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.1] transition duration-300 group-hover:scale-105 group-hover:ring-volt/45 sm:h-20 sm:w-20">
                <img src={player.photo} alt={player.nameCn} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
              </div>
              <span className="mt-2.5 w-full truncate text-[11px] font-medium text-white/60 group-hover:text-volt sm:mt-3 sm:text-xs">
                {player.nameCn}
              </span>
              <span className="mt-0.5 w-full truncate text-[10px] text-white/28 sm:text-[11px]">{countryLabel(player)}</span>
            </Link>
          ))}
        </div>

        {canScrollLeft && (
          <button
            type="button"
            aria-label="向左滚动"
            onClick={() => scroll("left")}
            className="absolute left-0 top-[34px] z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm ring-1 ring-white/[0.1] transition hover:bg-volt hover:text-black sm:top-[40px]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            aria-label="向右滚动"
            onClick={() => scroll("right")}
            className="absolute right-0 top-[34px] z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm ring-1 ring-white/[0.1] transition hover:bg-volt hover:text-black sm:top-[40px]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

const TimelinePost = memo(function TimelinePost({ player, index }: { player: PlayerArticle; index: number }) {
  const sections = player.articleCn?.sections ?? [];
  const coverText = sections[1]?.paragraphs?.[0] || player.excerpt;
  const tag = player.category === "superstars" ? "巨星" : "新星";

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.45 }}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-colors duration-300 hover:border-white/[0.1] hover:bg-white/[0.03]"
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <Link href={playerProfileHref(player)} className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.08] transition hover:ring-volt/45">
          <img src={player.photo} alt={player.nameCn} className="h-full w-full object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={playerProfileHref(player)} className="text-sm font-bold text-white hover:text-volt transition">
            {player.nameCn}
          </Link>
          <p className="truncate text-xs text-white/36">{countryLabel(player)} {"· "} {player.published || "FIFA"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-volt/[0.1] px-2.5 py-1 text-[10px] font-bold text-volt">
          {tag}
        </span>
      </div>

      <Link href={playerProfileHref(player)} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-white/[0.02]">
          <img
            src={player.coverImage || player.photo}
            alt={player.nameCn}
            className="h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-105 group-hover:opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">{player.title}</h2>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/55 sm:text-sm">{coverText}</p>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-4 border-t border-white/[0.04] px-4 py-2.5 sm:px-5">
        <Link
          href={playerProfileHref(player)}
          className="flex items-center gap-1.5 text-xs font-medium text-white/40 transition hover:text-volt"
        >
          <span>{"阅读全文"}</span>
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.article>
  );
});

function countryLabel(player: PlayerArticle) {
  return countryNameCn[player.countryCn] || countryNameCn[player.countryEn] || player.countryCn;
}

function normalizePlayerLookupKey(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function playerProfileHref(player: Pick<PlayerArticle, "apiPlayerId" | "id">) {
  return `/players/${player.apiPlayerId || player.id}/`;
}

function ScorerBoard() {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-volt/50">Ranking</p>
          <h2 className="mt-0.5 text-sm font-bold text-white/80">{"射手榜"}</h2>
        </div>
        <Trophy className="h-4 w-4 text-volt/60" />
      </div>
      <div className="divide-y divide-white/[0.04]">
        {fallbackTopScorerProfiles.map((player, index) => (
          <Link
            key={player.id}
            href={"/players/" + player.id + "/"}
            className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.03]"
          >
            <span className="w-4 text-center text-[11px] font-bold text-white/25 group-hover:text-white/50">{index + 1}</span>
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
              <img src={player.photo} alt={player.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-white/70 group-hover:text-white/90">{player.name}</p>
              <p className="truncate text-[11px] text-white/30">{player.teamName}</p>
            </div>
            <span className="text-xs font-bold text-volt/60 group-hover:text-volt">
              {player.goals ?? "-"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.04]">
      <p className="text-xl font-black tabular-nums text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/32">{label}</p>
    </div>
  );
}
