"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Radar, Search } from "lucide-react";

export function NotFoundScreen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#010401] px-5 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,255,36,0.09),transparent_32%),linear-gradient(180deg,rgba(3,14,4,0.82),#010401_58%,#000_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_8%_36%,rgba(94,255,38,.72)_0_8px,transparent_9px),radial-gradient(circle_at_18%_18%,rgba(75,255,28,.42)_0_3px,transparent_4px),radial-gradient(circle_at_32%_9%,rgba(69,255,27,.42)_0_6px,transparent_7px),radial-gradient(circle_at_88%_28%,rgba(98,255,37,.46)_0_5px,transparent_6px),radial-gradient(circle_at_92%_74%,rgba(78,255,30,.58)_0_16px,transparent_17px),radial-gradient(circle_at_14%_78%,rgba(67,255,29,.42)_0_11px,transparent_12px),radial-gradient(circle_at_70%_38%,rgba(92,255,37,.54)_0_7px,transparent_8px),radial-gradient(circle_at_55%_20%,rgba(50,206,28,.34)_0_4px,transparent_5px),radial-gradient(circle_at_38%_58%,rgba(109,255,35,.28)_0_15px,transparent_16px),radial-gradient(circle_at_76%_88%,rgba(86,255,32,.34)_0_5px,transparent_6px)] blur-[1px]" />
      <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_20%_46%,rgba(83,255,29,.7)_0_2px,transparent_3px),radial-gradient(circle_at_30%_74%,rgba(83,255,29,.5)_0_2px,transparent_3px),radial-gradient(circle_at_44%_26%,rgba(83,255,29,.56)_0_2px,transparent_3px),radial-gradient(circle_at_62%_14%,rgba(83,255,29,.42)_0_2px,transparent_3px),radial-gradient(circle_at_78%_52%,rgba(83,255,29,.7)_0_2px,transparent_3px),radial-gradient(circle_at_86%_65%,rgba(83,255,29,.5)_0_2px,transparent_3px),radial-gradient(circle_at_10%_90%,rgba(83,255,29,.48)_0_2px,transparent_3px)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(137,255,36,0.05)_1px,transparent_1px)] bg-[length:100%_8px] opacity-25" />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(140,255,20,0.18),transparent_68%)] blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-5xl"
      >
        <div className="mx-auto max-w-3xl">
          <div className="relative px-2 py-8 sm:px-8 sm:py-12">
            <div className="mb-10 flex items-center justify-center gap-3 text-lime-300/90">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-300/10 shadow-[0_0_32px_rgba(132,255,19,0.28)]">
                <Radar className="h-5 w-5" />
              </span>
              <span className="font-[ScreenMatrix] text-sm uppercase tracking-[0.42em]">route signal error</span>
            </div>

            <p className="font-[ScreenMatrix] text-center text-4xl lowercase tracking-[0.28em] text-lime-300 drop-shadow-[0_0_18px_rgba(132,255,19,0.85)] sm:text-5xl">
              error
            </p>
            <div className="mt-2 flex items-center justify-center font-[ScreenMatrix] text-[7.5rem] leading-none text-lime-300 drop-shadow-[0_0_28px_rgba(132,255,19,0.86)] sm:text-[11rem] md:text-[13rem]">
              <span className="relative after:absolute after:left-1 after:top-2 after:text-lime-500/30 after:content-['4']">4</span>
              <span className="mx-1 flex h-[0.72em] w-[0.72em] items-center justify-center rounded-full border-[0.08em] border-lime-300 text-transparent shadow-[0_0_32px_rgba(132,255,19,0.62)]">
                <span className="h-[0.08em] w-[0.78em] rotate-[-45deg] rounded-full bg-lime-300 shadow-[0_0_18px_rgba(132,255,19,0.95)]" />
              </span>
              <span className="relative after:absolute after:left-1 after:top-2 after:text-lime-500/30 after:content-['4']">4</span>
            </div>

            <div className="mx-auto mt-8 max-w-xl text-center">
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">这条赛场通道暂时失联</h1>
              <p className="mt-4 text-base leading-7 text-white/60">
                你要访问的页面没有进入比赛名单。可以回到控制台，或重新搜索球队、赛程和球员数据。
              </p>
            </div>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-lime-300 px-6 py-3 text-sm font-semibold text-black shadow-[0_0_34px_rgba(132,255,19,0.38)] transition hover:bg-white"
              >
                <Home className="h-4 w-4" />
                返回首页
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/8 px-6 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl transition hover:bg-white/14"
              >
                <Search className="h-4 w-4" />
                搜索内容
              </Link>
            </div>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
