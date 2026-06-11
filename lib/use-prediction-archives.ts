"use client";

import { useCallback, useEffect, useState } from "react";
import { userApi, type PublicUser } from "@/lib/user-system";

export type PredictionArchive = PublicUser["predictionArchives"][number];

const CACHE_TTL_MS = 60 * 1000;

let archives: PredictionArchive[] = [];
let loadedAt = 0;
let request: Promise<PredictionArchive[]> | null = null;
const subscribers = new Set<() => void>();

export function setPredictionArchives(nextArchives: PredictionArchive[]) {
  archives = nextArchives;
  loadedAt = Date.now();
  notifySubscribers();
}

export function loadPredictionArchives(force = false) {
  const now = Date.now();
  if (!force && loadedAt && now - loadedAt < CACHE_TTL_MS) {
    return Promise.resolve(archives);
  }

  if (!request) {
    request = userApi<{ archives: PredictionArchive[] }>("/api/me/prediction-archives", { cache: "no-store" })
      .then((payload) => {
        setPredictionArchives(payload.archives ?? []);
        return archives;
      })
      .catch((error) => {
        archives = [];
        loadedAt = Date.now();
        notifySubscribers();
        throw error;
      })
      .finally(() => {
        request = null;
      });
  }

  return request;
}

export function usePredictionArchives(enabled = true) {
  const [value, setValue] = useState<PredictionArchive[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const sync = () => setValue(archives);
    sync();
    subscribers.add(sync);
    void loadPredictionArchives().catch(() => undefined);

    return () => {
      subscribers.delete(sync);
    };
  }, [enabled]);

  const refresh = useCallback(() => loadPredictionArchives(true), []);
  return { archives: value, refresh };
}

function notifySubscribers() {
  for (const subscriber of subscribers) subscriber();
}
