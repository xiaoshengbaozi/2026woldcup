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
    let animationFrame = 0;
    let pinnedSnapshot = false;

    const pinBuffer = 12;
    const unpinBuffer = 28;

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

    const syncPinned = () => {
      if (!query.matches) {
        pinnedSnapshot = false;
        setPinned(false);
        return;
      }

      const sentinel = sentinelRef.current;
      if (!sentinel) return;

      const sentinelTop = sentinel.getBoundingClientRect().top;
      const shouldPin = pinnedSnapshot
        ? sentinelTop < offsetPx + unpinBuffer
        : sentinelTop < offsetPx - pinBuffer;

      if (shouldPin !== pinnedSnapshot) {
        pinnedSnapshot = shouldPin;
        setPinned(shouldPin);
      }
    };

    const scheduleSyncPinned = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        syncPinned();
      });
    };

    const disconnect = () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
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

      syncHeight();
      syncPinned();

      resizeObserver = new ResizeObserver(syncHeight);
      resizeObserver.observe(rail);
    };

    connect();
    window.addEventListener("scroll", scheduleSyncPinned, { passive: true });
    window.addEventListener("resize", syncHeight);
    query.addEventListener?.("change", connect);

    return () => {
      disconnect();
      window.removeEventListener("scroll", scheduleSyncPinned);
      window.removeEventListener("resize", syncHeight);
      query.removeEventListener?.("change", connect);
    };
  }, [mediaQuery, offsetPx, railRef, sentinelRef]);

  return { pinned, height };
}
