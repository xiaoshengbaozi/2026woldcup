"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Globe2 } from "lucide-react";
import {
  continentOrder,
  qualifiedTeams,
  teamContinentLabels,
  type QualifiedTeamCard,
} from "@/data/teams";

export function TeamsIndex() {
  return (
    <main className="relative min-h-screen overflow-hidden py-8 text-white">
      <div className="relative">
        <div className="space-y-10">
          {continentOrder.map((continent) => {
            const teams = qualifiedTeams.filter((team) => team.continent === continent);
            const label = teamContinentLabels[continent];

            return (
              <section key={continent} className="scroll-mt-24">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-volt/85">
                      <Globe2 className="h-4 w-4" />
                      {label.eyebrow}
                    </div>
                    <h2 className="mt-1 text-2xl font-black tracking-normal text-white sm:text-3xl">{label.title}</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-sm font-semibold text-white/62 backdrop-blur-xl">
                    {teams.length} 支球队
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {teams.map((team, index) => (
                    <TeamCard key={team.slug} team={team} index={index} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function TeamCard({ team, index }: { team: QualifiedTeamCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.035, 0.18), ease: "easeOut" }}
    >
      <Link
        href={team.detailHref}
        className="group relative block aspect-square overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,.34)] outline-none transition duration-500 hover:-translate-y-1 hover:border-volt/35 hover:shadow-[0_28px_100px_rgba(216,255,62,.10)] focus-visible:border-volt/60"
      >
        {/* Cover image */}
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <Image
            src={team.cover}
            alt={`${team.nameCn} 封面`}
            fill
            sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            className="object-cover saturate-[1.08] transition duration-700 group-hover:scale-105"
          />
        </div>

        {/* Bottom overlay: semi-transparent backdrop for info */}
        <div className="absolute inset-x-0 bottom-0 rounded-b-[2rem] bg-gradient-to-t from-black/75 via-black/45 to-transparent px-5 pt-12 pb-5">
          <h3 className="text-2xl font-black tracking-normal text-white drop-shadow-lg">{team.nameCn}</h3>
          <div className="mt-3 flex items-center justify-between">
            <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur-md">
              {team.confederation}
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/30 text-volt backdrop-blur-md transition duration-300 group-hover:border-volt/50 group-hover:bg-volt/[0.15]">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
