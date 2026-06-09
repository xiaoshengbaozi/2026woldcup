"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const updateVisibility = () => {
      const isSmallScreen = window.matchMedia("(max-width: 639px)").matches;
      setIsVisible(!isSmallScreen && window.scrollY > 420);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.button
          type="button"
          aria-label="回到顶部"
          title="回到顶部"
          onClick={scrollToTop}
          className="fixed bottom-24 right-8 z-[60] hidden h-14 w-14 items-center justify-center rounded-full bg-white/[0.08] text-volt shadow-[0_18px_52px_rgba(0,0,0,.45),0_0_28px_rgba(216,255,62,.18),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 ring-white/15 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-volt/15 hover:text-white hover:shadow-[0_24px_64px_rgba(0,0,0,.5),0_0_40px_rgba(216,255,62,.25),inset_0_1px_0_rgba(255,255,255,.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/70 sm:flex"
          initial={false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.86 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          whileTap={{ scale: 0.94 }}
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-volt/10 blur-md" />
          <ArrowUp className="relative h-6 w-6" strokeWidth={2.4} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
