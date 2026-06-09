"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

type FeedbackKind = "team" | "player" | "match";
type FeedbackState = "added" | "removed";

type FeedbackDetail = {
  kind: FeedbackKind;
  state: FeedbackState;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

type FeedbackItem = FeedbackDetail & {
  id: number;
};

const USER_ACTION_FEEDBACK_EVENT = "user-action-feedback";

const FEEDBACK_COPY: Record<FeedbackKind, { added: string; removed: string }> = {
  team: { added: "已关注", removed: "已取消关注" },
  player: { added: "已关注", removed: "已取消关注" },
  match: { added: "已收藏", removed: "已取消收藏" },
};

let feedbackId = 0;

export function emitUserActionFeedback(kind: FeedbackKind, state: FeedbackState, target: HTMLElement | null) {
  if (!target || typeof window === "undefined") return;

  const rect = target.getBoundingClientRect();
  window.dispatchEvent(
    new CustomEvent<FeedbackDetail>(USER_ACTION_FEEDBACK_EVENT, {
      detail: {
        kind,
        state,
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      },
    })
  );
}

export function UserActionFeedbackLayer() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleFeedback(event: Event) {
      const customEvent = event as CustomEvent<FeedbackDetail>;
      const item = { ...customEvent.detail, id: feedbackId++ };
      setItems((current) => [...current.slice(-4), item]);
      window.setTimeout(() => {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      }, 1150);
    }

    window.addEventListener(USER_ACTION_FEEDBACK_EVENT, handleFeedback);
    return () => window.removeEventListener(USER_ACTION_FEEDBACK_EVENT, handleFeedback);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[520]">
      <AnimatePresence>
        {items.map((item) => (
          <FeedbackToast key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

function FeedbackToast({ item }: { item: FeedbackItem }) {
  return (
    <>
      <div className="fixed inset-0 grid place-items-center">
        <motion.span
          aria-hidden="true"
          className="h-12 w-12 rounded-full border border-volt/70 shadow-[0_0_30px_rgba(216,255,62,.22)]"
          initial={{ opacity: 0.72, scale: 0.9 }}
          animate={{ opacity: 0, scale: 1.75 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.62, ease: "easeOut" }}
        />
      </div>
      <div className="fixed inset-0 grid place-items-center">
        <motion.span
          role="status"
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-volt/35 bg-black/72 px-4 py-2 text-center text-[11px] font-black leading-none text-volt shadow-[0_18px_44px_rgba(0,0,0,.45),0_0_26px_rgba(216,255,62,.16)] backdrop-blur-2xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Sparkles className="h-3 w-3" />
          {FEEDBACK_COPY[item.kind][item.state]}
        </motion.span>
      </div>
    </>
  );
}
