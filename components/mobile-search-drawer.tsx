"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GlobalSearchDrawerCard } from "./global-search";

export type MobileSearchDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileSearchDrawer({ open, onClose }: MobileSearchDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previous = {
      htmlOverflow: document.documentElement.style.overflow,
      htmlOverscroll: document.documentElement.style.overscrollBehavior,
      bodyOverflow: document.body.style.overflow,
      bodyOverscroll: document.body.style.overscrollBehavior,
      bodyTouchAction: document.body.style.touchAction,
    };

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.touchAction = "none";

    return () => {
      document.documentElement.style.overflow = previous.htmlOverflow;
      document.documentElement.style.overscrollBehavior = previous.htmlOverscroll;
      document.body.style.overflow = previous.bodyOverflow;
      document.body.style.overscrollBehavior = previous.bodyOverscroll;
      document.body.style.touchAction = previous.bodyTouchAction;
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label="全局搜索"
          initial={{ x: "100%" }}
          animate={{ x: "0%" }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mobile-search-drawer fixed inset-y-0 right-0 z-[11000] flex h-[100dvh] w-screen transform-gpu flex-col overflow-hidden px-4 pb-5 pt-[calc(env(safe-area-inset-top)+1rem)] shadow-[-26px_0_90px_rgba(0,0,0,.62)] backdrop-blur-xl will-change-transform lg:hidden"
          style={{
            backfaceVisibility: "hidden",
            contain: "layout paint size",
            touchAction: "auto",
          }}
        >
          <div className="pointer-events-none absolute -right-20 top-16 h-44 w-44 rounded-full bg-volt/12 blur-[70px]" />
          <div className="pointer-events-none absolute bottom-16 left-0 h-40 w-24 rounded-full bg-flare/10 blur-[56px]" />
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/66">Search</p>
            <button
              type="button"
              aria-label="关闭搜索"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-white/70 ring-1 ring-white/[0.08] transition hover:bg-white/[0.1] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <GlobalSearchDrawerCard onNavigate={onClose} />
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
