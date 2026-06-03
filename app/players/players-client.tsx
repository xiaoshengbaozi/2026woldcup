"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronRight, Flame, Radio, Search, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import playerArticles from "@/data/player-articles.json";
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

  const visiblePlayers = useMemo(() => {
    if (activeTab === "popular") return [];
    return playerArticles.players.filter((player) => player.category === activeTab);
  }, [activeTab]);

  const featuredPlayer = visiblePlayers[0] ?? null;

  return (
    <DashboardShell>
      <section className="hero-card overflow-hidden px-4 py-5 sm:px-6 lg:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-volt/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-volt ring-1 ring-volt/15">
              <Radio className="h-3.5 w-3.5" />
              Player signal
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">
              世界杯球员动态
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48 sm:text-base">
              聚合 FIFA 超级巨星与新星文章，按球员整理成可浏览的个人档案和动态时间线。
            </p>
          </div>

          <div className="flex min-h-11 items-center gap-2 rounded-full bg-white/[0.045] px-3 ring-1 ring-white/[0.08] backdrop-blur-2xl sm:min-w-72">
            <Search className="h-4 w-4 text-white/28" />
            <span className="text-sm text-white/35">搜索稍后接入</span>
          </div>
        </div>
      </section>

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
              {activeTab === "popular" ? (
                <motion.div
                  key="popular-empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-8 rounded-[1.5rem] bg-white/[0.025] px-5 py-10 text-center ring-1 ring-white/[0.06]"
                >
                  <Flame className="mx-auto h-8 w-8 text-volt/45" />
                  <p className="mt-3 text-sm font-bold text-white/70">最受欢迎榜单暂未开放</p>
                  <p className="mt-2 text-xs text-white/35">这里先按你的要求留空，后续可接收藏、浏览或搜索热度。</p>
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6"
                >
                  <PlayerRail players={visiblePlayers} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {featuredPlayer && <FeaturedStrip player={featuredPlayer} />}

          <section className="space-y-4">
            {visiblePlayers.map((player, index) => (
              <TimelinePost key={player.id} player={player} index={index} />
            ))}
          </section>
        </main>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <ScorerBoard />
          <section className="hero-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white/82">资料覆盖</h2>
              <span className="rounded-full bg-volt/[0.1] px-2.5 py-1 text-xs font-black text-volt">
                {playerArticles.count}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
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
  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {players.map((player) => (
          <Link
            key={player.id}
            href={`/players/${player.id}/`}
            className="group flex w-24 shrink-0 flex-col items-center text-center sm:w-28"
          >
            <div className="relative h-17 w-17 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.1] transition duration-300 group-hover:scale-105 group-hover:ring-volt/45 sm:h-20 sm:w-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={player.photo} alt={player.nameCn} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            </div>
            <span className="mt-3 w-full truncate text-sm font-bold text-white/78 group-hover:text-volt">
              {player.nameCn}
            </span>
            <span className="mt-1 w-full truncate text-xs text-white/35">{countryLabel(player)}</span>
          </Link>
        ))}
      </div>
      <button type="button" aria-label="更多球员" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.05] text-white/70 ring-1 ring-white/[0.1] transition hover:bg-volt hover:text-black">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function FeaturedStrip({ player }: { player: PlayerArticle }) {
  return (
    <Link href={`/players/${player.id}/`} className="hero-card group grid overflow-hidden p-4 transition lg:grid-cols-[92px_minmax(0,1fr)_auto] lg:items-center">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.08]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={player.photo} alt={player.nameCn} className="h-full w-full object-cover" />
        </div>
        <div className="lg:hidden">
          <p className="font-bold text-white">{player.nameCn}</p>
          <p className="text-xs text-white/38">{countryLabel(player)}</p>
        </div>
      </div>
      <div className="mt-4 min-w-0 lg:mt-0">
        <p className="hidden font-bold text-white lg:block">{player.nameCn}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/52">{player.excerpt}</p>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-volt lg:mt-0">
        进入个人页
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function TimelinePost({ player, index }: { player: PlayerArticle; index: number }) {
  const sections = player.articleCn?.sections ?? [];
  const coverText = sections[1]?.paragraphs?.[0] || player.excerpt;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.45 }}
      className="hero-card overflow-hidden p-4 sm:p-5"
    >
      <div className="flex items-center gap-3">
        <Link href={`/players/${player.id}/`} className="h-11 w-11 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.08]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={player.photo} alt={player.nameCn} className="h-full w-full object-cover" />
        </Link>
        <div className="min-w-0">
          <Link href={`/players/${player.id}/`} className="font-black text-white hover:text-volt">
            {player.nameCn}
          </Link>
          <p className="truncate text-xs text-white/36">{countryLabel(player)} · {player.published || "FIFA"}</p>
        </div>
      </div>

      <Link href={`/players/${player.id}/`} className="mt-4 block overflow-hidden rounded-[1.5rem] bg-black/40 ring-1 ring-white/[0.07]">
        <div className="relative min-h-64 sm:min-h-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={player.photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55 blur-sm scale-110" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,.9),rgba(5,5,5,.44),rgba(5,5,5,.84))]" />
          <div className="relative z-10 flex min-h-64 items-end p-5 sm:min-h-80 sm:p-7">
            <div className="max-w-2xl">
              <span className="rounded-full bg-volt px-3 py-1 text-xs font-black text-black">
                {player.category === "superstars" ? "超级巨星" : "神童"}
              </span>
              <h2 className="mt-4 text-2xl font-black text-white sm:text-3xl">{player.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/62">{coverText}</p>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function countryLabel(player: PlayerArticle) {
  return countryNameCn[player.countryCn] || countryNameCn[player.countryEn] || player.countryCn;
}

function ScorerBoard() {
  return (
    <section className="hero-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-volt/55">Ranking</p>
          <h2 className="mt-1 text-lg font-black text-white">射手榜</h2>
        </div>
        <Trophy className="h-5 w-5 text-volt" />
      </div>
      <div className="space-y-3">
        {fallbackTopScorerProfiles.map((player, index) => (
          <Link key={player.id} href={`/players/${player.id}/`} className="flex items-center gap-3 rounded-2xl bg-white/[0.035] p-3 ring-1 ring-white/[0.055] transition hover:bg-white/[0.065]">
            <span className="w-5 text-center text-xs font-black text-white/32">{index + 1}</span>
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={player.photo} alt={player.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white/82">{player.name}</p>
              <p className="truncate text-xs text-white/34">{player.teamName}</p>
            </div>
            <span className="rounded-full bg-volt/[0.1] px-2 py-1 text-xs font-black text-volt">
              {player.goals ?? "—"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/[0.035] p-4 ring-1 ring-white/[0.055]">
      <p className="text-2xl font-black tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-white/36">{label}</p>
    </div>
  );
}
