"use client";

import { useEffect, useState } from "react";

type TimerBucket = {
  intervalMs: number;
  timer: number | null;
  subscribers: Set<(now: number) => void>;
};

const buckets = new Map<number, TimerBucket>();

export function useNow(intervalMs = 30_000) {
  const normalizedInterval = Math.max(1_000, intervalMs);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const bucket = getBucket(normalizedInterval);
    bucket.subscribers.add(setNow);
    setNow(Date.now());
    startBucket(bucket);

    return () => {
      bucket.subscribers.delete(setNow);
      if (bucket.subscribers.size === 0) stopBucket(bucket);
    };
  }, [normalizedInterval]);

  return now;
}

function getBucket(intervalMs: number) {
  const current = buckets.get(intervalMs);
  if (current) return current;

  const next: TimerBucket = {
    intervalMs,
    timer: null,
    subscribers: new Set(),
  };
  buckets.set(intervalMs, next);
  return next;
}

function startBucket(bucket: TimerBucket) {
  if (bucket.timer !== null || typeof window === "undefined") return;

  const tick = () => {
    if (document.hidden || !navigator.onLine) return;
    const now = Date.now();
    bucket.subscribers.forEach((subscriber) => subscriber(now));
  };

  bucket.timer = window.setInterval(tick, bucket.intervalMs);
}

function stopBucket(bucket: TimerBucket) {
  if (bucket.timer !== null) {
    window.clearInterval(bucket.timer);
    bucket.timer = null;
  }
  buckets.delete(bucket.intervalMs);
}
