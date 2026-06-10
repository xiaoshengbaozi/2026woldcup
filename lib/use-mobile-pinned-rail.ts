"use client";

import { type RefObject, useEffect, useState } from "react";

export function useMobilePinnedRail(
  sentinelRef: RefObject<HTMLElement>,
  railRef: RefObject<HTMLElement>,
  offsetPx: number,
  mediaQuery = "(max-width: 639px)"
) {
  const [pinned, setPinned] = useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const query = window.matchMedia(mediaQuery);
    let intersectionObserver: IntersectionObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const syncHeight = () => {
      if (!query.matches) {
        setHeight(0);
        return;
      }

      const rail = railRef.current;
      if (!rail) return;
      const nextHeight = rail.offsetHeight;
      setHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    const disconnect = () => {
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      intersectionObserver = null;
      resizeObserver = null;
    };

    const connect = () => {
      disconnect();

      if (!query.matches) {
        setPinned(false);
        setHeight(0);
        return;
      }

      const sentinel = sentinelRef.current;
      const rail = railRef.current;
      if (!sentinel || !rail) return;

      syncHeight();
      intersectionObserver = new IntersectionObserver(
        ([entry]) => setPinned(!entry?.isIntersecting),
        { rootMargin: `-${offsetPx}px 0px 0px 0px`, threshold: 0 }
      );
      intersectionObserver.observe(sentinel);

      resizeObserver = new ResizeObserver(syncHeight);
      resizeObserver.observe(rail);
    };

    connect();
    window.addEventListener("resize", syncHeight);
    query.addEventListener?.("change", connect);

    return () => {
      disconnect();
      window.removeEventListener("resize", syncHeight);
      query.removeEventListener?.("change", connect);
    };
  }, [mediaQuery, offsetPx, railRef, sentinelRef]);

  return { pinned, height };
}
