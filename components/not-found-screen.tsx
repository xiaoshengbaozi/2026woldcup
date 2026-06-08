"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Radar, Search } from "lucide-react";
import styles from "./not-found-screen.module.css";

export function NotFoundScreen() {
  return (
    <main className={`${styles.root} relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16`}>
      <div className={`${styles.aura} pointer-events-none absolute inset-0`} />
      <div className={`${styles.splatters} pointer-events-none absolute inset-0 opacity-80 blur-[1px]`} />
      <div className={`${styles.sparks} pointer-events-none absolute inset-0 opacity-55`} />
      <div className={`${styles.scanlines} pointer-events-none absolute inset-0 opacity-25`} />
      <div className={`${styles.centerGlow} pointer-events-none absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 blur-3xl`} />

      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-5xl"
      >
        <div className="mx-auto max-w-3xl">
          <div className="relative px-2 py-8 sm:px-8 sm:py-12">
            <div className={`${styles.signal} mb-10 flex items-center justify-center gap-3`}>
              <span className={`${styles.signalIcon} flex h-10 w-10 items-center justify-center rounded-full`}>
                <Radar className="h-5 w-5" />
              </span>
              <span className="font-[ScreenMatrix] text-sm uppercase tracking-[0.42em]">route signal error</span>
            </div>

            <p className={`${styles.errorText} font-[ScreenMatrix] text-center text-4xl lowercase tracking-[0.28em] sm:text-5xl`}>
              error
            </p>
            <div className={`${styles.digit} mt-2 flex items-center justify-center font-[ScreenMatrix] text-[7.5rem] leading-none sm:text-[11rem] md:text-[13rem]`}>
              <span className={`${styles.ghostDigit} relative after:absolute after:left-1 after:top-2 after:content-['4']`}>4</span>
              <span className={`${styles.zero} mx-1 flex h-[0.72em] w-[0.72em] items-center justify-center rounded-full border-[0.08em] text-transparent`}>
                <span className={`${styles.slash} h-[0.08em] w-[0.78em] rotate-[-45deg] rounded-full`} />
              </span>
              <span className={`${styles.ghostDigit} relative after:absolute after:left-1 after:top-2 after:content-['4']`}>4</span>
            </div>

            <div className="mx-auto mt-8 max-w-xl text-center">
              <h1 className={`${styles.title} text-2xl font-semibold sm:text-3xl`}>这条赛场通道暂时失联</h1>
              <p className={`${styles.copy} mt-4 text-base leading-7`}>
                你要访问的页面没有进入比赛名单。可以回到控制台，或重新搜索球队、赛程和球员数据。
              </p>
            </div>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className={`${styles.primaryLink} group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition`}
              >
                <Home className="h-4 w-4" />
                返回首页
              </Link>
              <Link
                href="/search"
                className={`${styles.secondaryLink} inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold backdrop-blur-2xl transition`}
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
