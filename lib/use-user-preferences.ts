"use client";

import { useEffect, useState } from "react";
import { fallbackUserPreferenceCatalog, type UserPreferenceCatalog } from "@/lib/user-preferences";
import { userApi } from "@/lib/user-system";

const CACHE_TTL_MS = 10 * 60 * 1000;

let catalog = fallbackUserPreferenceCatalog;
let loadedAt = 0;
let request: Promise<UserPreferenceCatalog> | null = null;
const subscribers = new Set<() => void>();

export function loadUserPreferenceCatalog(force = false) {
  const now = Date.now();
  if (!force && loadedAt && now - loadedAt < CACHE_TTL_MS) {
    return Promise.resolve(catalog);
  }

  if (!request) {
    request = userApi<UserPreferenceCatalog>("/api/user-preferences", { cache: "no-store" })
      .then((payload) => {
        catalog = payload;
        loadedAt = Date.now();
        notifySubscribers();
        return payload;
      })
      .finally(() => {
        request = null;
      });
  }

  return request;
}

export function useUserPreferenceCatalog(enabled = true) {
  const [value, setValue] = useState(catalog);

  useEffect(() => {
    if (!enabled) return;

    const sync = () => setValue(catalog);
    subscribers.add(sync);
    void loadUserPreferenceCatalog().catch(() => undefined);

    return () => {
      subscribers.delete(sync);
    };
  }, [enabled]);

  return value;
}

function notifySubscribers() {
  for (const subscriber of subscribers) subscriber();
}
