// Build-time / server-only access to the full scout-notes dataset.
// Do NOT import from client components — it inlines 1.4MB of JSON into the
// chunk. Client code should use `usePlayerScoutNotes()` instead.
import scoutNotesData from "@/data/player-scout-notes.json";
import {
  findPlayerScoutNoteByIdentityIn,
  findPlayerScoutNoteIn,
  type PlayerScoutIdentity,
  type PlayerScoutNote,
} from "@/lib/player-scout-notes";

const PLAYER_SCOUT_NOTES = scoutNotesData.players as PlayerScoutNote[];

export function getPlayerScoutNotes() {
  return PLAYER_SCOUT_NOTES;
}

export function findPlayerScoutNote(playerId: string | number) {
  return findPlayerScoutNoteIn(PLAYER_SCOUT_NOTES, playerId);
}

export function findPlayerScoutNoteByIdentity(identity: PlayerScoutIdentity) {
  return findPlayerScoutNoteByIdentityIn(PLAYER_SCOUT_NOTES, identity);
}
