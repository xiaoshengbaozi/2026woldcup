import type { SnapshotMessage } from "./types";

export interface SnapshotCache {
  update: (snapshot: SnapshotMessage) => void;
  getLatest: () => SnapshotMessage | null;
}

export function createSnapshotCache(): SnapshotCache {
  let latest: SnapshotMessage | null = null;

  return {
    update(snapshot) {
      latest = snapshot;
    },

    getLatest() {
      return latest;
    },
  };
}
