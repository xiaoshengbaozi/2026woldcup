"use client";

import { useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/request-cache";
import type { PlayerScoutNote } from "@/lib/player-scout-notes";

const SCOUT_NOTES_URL = "/data/player-scout-notes.json";

let cachedNotes: PlayerScoutNote[] | null = null;
let pendingLoad: Promise<PlayerScoutNote[]> | null = null;

function loadPlayerScoutNotes(): Promise<PlayerScoutNote[]> {
  if (cachedNotes) return Promise.resolve(cachedNotes);
  if (!pendingLoad) {
    pendingLoad = fetchWithTimeout(SCOUT_NOTES_URL, {}, 10_000)
      .then((response) => {
        if (!response.ok) throw new Error(`scout notes fetch returned ${response.status}`);
        return response.json();
      })
      .then((payload: { players?: PlayerScoutNote[] }) => {
        cachedNotes = payload.players ?? [];
        return cachedNotes;
      })
      .catch((error) => {
        console.warn("[PlayerScoutNotes] unavailable:", error);
        pendingLoad = null;
        return [];
      });
  }
  return pendingLoad;
}

/**
 * Lazily fetches the scout-notes dataset (1.4MB) instead of bundling it.
 * Returns null until loaded; the data is cached module-wide after the
 * first successful fetch.
 */
export function usePlayerScoutNotes(): PlayerScoutNote[] | null {
  const [notes, setNotes] = useState<PlayerScoutNote[] | null>(cachedNotes);

  useEffect(() => {
    if (cachedNotes) return;
    let active = true;
    void loadPlayerScoutNotes().then((loaded) => {
      if (active && loaded.length) setNotes(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  return notes;
}
