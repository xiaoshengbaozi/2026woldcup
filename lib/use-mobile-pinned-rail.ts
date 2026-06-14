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
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let heightFrame = 0;
    let pinnedSnapshot = false;

    const commitHeight = (nextHeight: number) => {
      if (heightFrame) window.cancelAnimationFrame(heightFrame);
      heightFrame = window.requestAnimationFrame(() => {
        heightFrame = 0;
        setHeight((current) => (current === nextHeight ? current : nextHeight));
      });
    };

    const readInitialHeight = () => {
      if (!query.matches) {
        setHeight(0);
        return;
      }

      const rail = railRef.current;
      if (!rail) return;
      commitHeight(rail.getBoundingClientRect().height);
    };

    const updatePinned = (shouldPin: boolean) => {
      if (shouldPin !== pinnedSnapshot) {
        pinnedSnapshot = shouldPin;
        setPinned(shouldPin);
      }
    };

    const disconnect = () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      intersectionObserver?.disconnect();
      intersectionObserver = null;
      if (heightFrame) {
        window.cancelAnimationFrame(heightFrame);
        heightFrame = 0;
      }
    };

    const connect = () => {
      disconnect();

      if (!query.matches) {
        pinnedSnapshot = false;
        setPinned(false);
        setHeight(0);
        return;
      }

      const sentinel = sentinelRef.current;
      const rail = railRef.current;
      if (!sentinel || !rail) return;

      readInitialHeight();

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        const blockSize = entry.borderBoxSize?.[0]?.blockSize;
        commitHeight(blockSize ?? entry.contentRect.height);
      });
      resizeObserver.observe(rail);

      intersectionObserver = new IntersectionObserver(
        ([entry]) => updatePinned(!entry.isIntersecting),
        { rootMargin: `-${offsetPx}px 0px 0px 0px`, threshold: 0 }
      );
      intersectionObserver.observe(sentinel);
    };

    connect();
    window.addEventListener("resize", readInitialHeight);
    query.addEventListener?.("change", connect);

    return () => {
      disconnect();
      window.removeEventListener("resize", readInitialHeight);
      query.removeEventListener?.("change", connect);
    };
  }, [mediaQuery, offsetPx, railRef, sentinelRef]);

  return { pinned, height };
}
