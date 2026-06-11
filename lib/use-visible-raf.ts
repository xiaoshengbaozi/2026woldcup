"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

type VisibleRafOptions = {
  enabled?: boolean;
  elementRef?: RefObject<Element>;
  rootMargin?: string;
  threshold?: number;
  onStop?: () => void;
};

export function useVisibleRaf(callback: (time: number) => void, options: VisibleRafOptions = {}) {
  const {
    enabled = true,
    elementRef,
    rootMargin = "0px",
    threshold = 0.01,
    onStop,
  } = options;
  const callbackRef = useRef(callback);
  const onStopRef = useRef(onStop);
  const rafRef = useRef<number | null>(null);
  const [pageVisible, setPageVisible] = useState(true);
  const [elementVisible, setElementVisible] = useState(true);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  useEffect(() => {
    const syncPageVisibility = () => setPageVisible(!document.hidden);
    syncPageVisibility();
    document.addEventListener("visibilitychange", syncPageVisibility);
    return () => document.removeEventListener("visibilitychange", syncPageVisibility);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const element = elementRef?.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setElementVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setElementVisible(Boolean(entry?.isIntersecting)),
      { rootMargin, threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, enabled, rootMargin, threshold]);

  useEffect(() => {
    const shouldRun = enabled && pageVisible && elementVisible;

    if (!shouldRun) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      onStopRef.current?.();
      return;
    }

    const tick = (time: number) => {
      callbackRef.current(time);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [elementVisible, enabled, pageVisible]);
}
