"use client";

import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { TickerItem } from "./ticker-item";

const BASE_SPEED = 50; // px per second
const ITEM_WIDTH = 180;

export function TickerStream() {
  const countries = useStore((s) => s.countries);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const intersectsRef = useRef(true);
  const shouldAnimate = isVisible && !isPaused;

  const sorted = useMemo(
    () => Array.from(countries.values()).sort((a, b) => b.impliedProbability - a.impliedProbability),
    [countries]
  );

  const animate = useCallback(
    (time: number) => {
      if (!streamRef.current || !shouldAnimate) {
        rafRef.current = 0;
        lastTimeRef.current = 0;
        return;
      }

      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      offsetRef.current -= BASE_SPEED * dt;

      // Seamless loop: when offset reaches -totalWidth, reset
      const totalWidth = sorted.length * ITEM_WIDTH;
      if (Math.abs(offsetRef.current) >= totalWidth) {
        offsetRef.current += totalWidth;
      }

      streamRef.current.style.transform = `translateX(${offsetRef.current}px)`;
      rafRef.current = requestAnimationFrame(animate);
    },
    [shouldAnimate, sorted.length]
  );

  useEffect(() => {
    if (!shouldAnimate) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastTimeRef.current = 0;
      return;
    }

    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate, shouldAnimate]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const syncVisibility = () => {
      setIsVisible(intersectsRef.current && !document.hidden);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersectsRef.current = entry.isIntersecting;
        syncVisibility();
      },
      { threshold: 0.01 }
    );

    observer.observe(el);
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden h-full flex-1"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={streamRef}
        className="flex h-full will-change-transform"
        style={{ width: sorted.length * ITEM_WIDTH * 2 }}
      >
        {/* First set */}
        {sorted.map((c) => (
          <TickerItem key={c.countryCode} country={c} />
        ))}
        {/* Duplicate for seamless loop */}
        {sorted.map((c) => (
          <TickerItem key={`dup-${c.countryCode}`} country={c} />
        ))}
      </div>
    </div>
  );
}
