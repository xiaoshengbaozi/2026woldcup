"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { GlobalSearchDrawerCard } from "./global-search";

type MobileSearchDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileSearchDrawer({ open, onClose }: MobileSearchDrawerProps) {
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

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label="全局搜索"
          initial={{ x: "100%" }}
          animate={{ x: "0%" }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 360, damping: 38 }}
          className="fixed inset-y-0 right-0 z-[120] flex h-[100dvh] w-screen flex-col overflow-hidden bg-ink-950/92 px-4 pb-5 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-3xl lg:hidden"
          style={{ touchAction: "auto" }}
        >
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
    </AnimatePresence>
  );
}
