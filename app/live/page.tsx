"use client";

import { Radio } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { MobileLiveMatchesList } from "@/components/mobile-live-matches-list";
import { useWorldCupData } from "@/lib/use-world-cup-data";

export default function LivePage() {
  const router = useRouter();
  const { matches, warmupMatches } = useWorldCupData();
  const [isClosing, setIsClosing] = useState(false);
  const closeStartedRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const liveQueueMatches = useMemo(
    () => [...matches, ...warmupMatches].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [matches, warmupMatches]
  );

  useEffect(() => {
    const handleClose = () => {
      if (closeStartedRef.current) return;

      closeStartedRef.current = true;
      const returnUrl = window.sessionStorage.getItem("mobile-live-return-url") || "/matches";
      window.sessionStorage.removeItem("mobile-live-return-url");
      setIsClosing(true);

      closeTimerRef.current = window.setTimeout(() => {
        router.push(returnUrl);
      }, 180);
    };

    window.addEventListener("mobile-live-close", handleClose);
    return () => {
      window.removeEventListener("mobile-live-close", handleClose);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, [router]);

  return (
    <DashboardShell>
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.992 }}
        animate={isClosing ? { opacity: 0, y: 16, scale: 0.992 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: isClosing ? 0.18 : 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-black/88 pt-[calc(env(safe-area-inset-top)+4.25rem)] shadow-[0_-28px_90px_rgba(0,0,0,.72),0_0_0_1px_rgba(255,255,255,.09),0_0_48px_rgba(216,255,62,.08)] backdrop-blur-xl will-change-transform sm:relative sm:inset-auto sm:z-auto sm:min-h-[calc(100vh-8rem)] sm:rounded-[2rem] sm:bg-black/62 sm:pt-8 sm:backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-volt/35 to-transparent" />
        <div className="hidden px-6 pb-6 sm:block">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-volt/12 text-volt ring-1 ring-volt/20">
              <Radio className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">直播中心</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">正在进行与24小时内开赛</h1>
            </div>
          </div>
        </div>

        <MobileLiveMatchesList
          matches={liveQueueMatches}
          scrollClassName="pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:pb-8"
        />
      </motion.section>
    </DashboardShell>
  );
}
