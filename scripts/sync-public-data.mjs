// Syncs large data files for runtime consumption:
// 1. Copies player-scout-notes.json into public/ so clients fetch it on demand
//    instead of bundling 1.4MB of JSON into page chunks.
// 2. Copies the h2h dataset into public/ for the same reason (~900KB).
// 3. Generates data/fifa-official-squads.slim.json with only the fields the
//    client catalog actually uses (drops firstNames/lastNames/shirtName/etc).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DATA_DIR = path.join(ROOT, "public", "data");

fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

// 1. Scout notes -> public/data (fetched lazily by the client)
const scoutSrc = path.join(DATA_DIR, "player-scout-notes.json");
const scoutDest = path.join(PUBLIC_DATA_DIR, "player-scout-notes.json");
fs.copyFileSync(scoutSrc, scoutDest);
console.log(`[sync-public-data] copied player-scout-notes.json -> public/data (${(fs.statSync(scoutDest).size / 1024).toFixed(0)}KB)`);

// 2. Head-to-head dataset -> public/data (fetched lazily by the client)
const h2hSrc = path.join(DATA_DIR, "h2h", "michill-worldcup-2026-h2h.json");
const h2hDest = path.join(PUBLIC_DATA_DIR, "h2h.json");
fs.copyFileSync(h2hSrc, h2hDest);
console.log(`[sync-public-data] copied h2h dataset -> public/data/h2h.json (${(fs.statSync(h2hDest).size / 1024).toFixed(0)}KB)`);

// 3. Slim squads (statically imported by client code)
const squadsSrc = path.join(DATA_DIR, "fifa-official-squads.json");
const squadsDest = path.join(DATA_DIR, "fifa-official-squads.slim.json");
const full = JSON.parse(fs.readFileSync(squadsSrc, "utf8"));
const PLAYER_FIELDS = ["number", "position", "name", "officialName", "aliases", "apiFootballId"];

const slim = {
  squads: Object.fromEntries(
    Object.entries(full.squads ?? {}).map(([teamCode, squad]) => [
      teamCode,
      {
        teamName: squad.teamName,
        players: (squad.players ?? []).map((player) => {
          const next = {};
          for (const field of PLAYER_FIELDS) {
            if (player[field] != null) next[field] = player[field];
          }
          return next;
        }),
      },
    ])
  ),
};

fs.writeFileSync(squadsDest, JSON.stringify(slim));
console.log(`[sync-public-data] wrote fifa-official-squads.slim.json (${(fs.statSync(squadsDest).size / 1024).toFixed(0)}KB, from ${(fs.statSync(squadsSrc).size / 1024).toFixed(0)}KB)`);
