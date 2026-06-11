"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { mobileFloatingSurfaceStyle } from "@/components/mobile-surface-styles";

type MobileSecondaryPageActionsProps = {
  backHref: string;
  backLabel: string;
  title?: string;
  rightAction?: ReactNode;
  reserveSpace?: boolean;
};

const topButtonClass =
  "mobile-floating-surface pointer-events-auto absolute top-[calc(env(safe-area-inset-top)+1rem)] grid h-[34px] min-w-[34px] place-items-center rounded-full bg-white/[0.08] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 ring-white/12 backdrop-blur-2xl transition hover:text-white hover:ring-volt/35";
const DEFAULT_PINNED_RAIL_HEIGHT = 52;

export function MobileSecondaryPageActions({ backHref, backLabel, title, rightAction, reserveSpace = false }: MobileSecondaryPageActionsProps) {
  const [topRailHeight, setTopRailHeight] = useState(0);
  const topMaskHeight = `calc(env(safe-area-inset-top) + 4.125rem${topRailHeight > 0 ? ` + ${topRailHeight}px` : ""})`;

  useEffect(() => {
    const handleTopRailChange = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const nextHeight = detail?.pinned ? Number(detail.height || DEFAULT_PINNED_RAIL_HEIGHT) : 0;
      setTopRailHeight(Number.isFinite(nextHeight) && nextHeight > 0 ? nextHeight : 0);
    };

    window.addEventListener("mobile-top-rail-change", handleTopRailChange);
    return () => window.removeEventListener("mobile-top-rail-change", handleTopRailChange);
  }, []);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = backHref;
  };

  return (
    <>
      <div
        className="mobile-top-blur-mask pointer-events-none fixed inset-x-0 top-0 z-[80] h-[calc(env(safe-area-inset-top)+4.125rem)] bg-black/72 backdrop-blur-2xl [mask-image:linear-gradient(to_bottom,black_0%,black_68%,rgba(0,0,0,0)_100%)] lg:hidden"
        style={{ height: topMaskHeight }}
      />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[calc(env(safe-area-inset-top)+4.125rem)] lg:hidden">
        <button
          type="button"
          onClick={goBack}
          aria-label={backLabel}
          className={`${topButtonClass} left-4 w-[34px]`}
          style={mobileFloatingSurfaceStyle}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {title ? (
          <div className="absolute left-16 right-16 top-[calc(env(safe-area-inset-top)+1rem)] flex h-[34px] items-center justify-center">
            <h1 className="truncate text-sm font-semibold text-white/88">{title}</h1>
          </div>
        ) : null}
        {rightAction ? <div className="pointer-events-auto absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)]">{rightAction}</div> : null}
      </div>
      {reserveSpace ? <div aria-hidden="true" className="h-[calc(env(safe-area-inset-top)+4.125rem)] lg:hidden" /> : null}
    </>
  );
}
