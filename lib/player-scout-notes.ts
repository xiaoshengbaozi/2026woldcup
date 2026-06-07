import scoutNotesData from "@/data/player-scout-notes.json";

export type PlayerScoutNote = {
  apiPlayerId: number;
  nameEn: string;
  nameCn: string;
  gameVersion: string;
  sourceUrl: string;
  gsRating: number;
  bestRole: string;
  bestRoleCn: string;
  potentialAbility: string;
  currentAbility: string;
  footCn: string;
  club: string;
  communityVotes: number;
  injuryProneness: number;
  tags: string[];
  summary: string;
};

const PLAYER_SCOUT_NOTES = scoutNotesData.players as PlayerScoutNote[];

export function findPlayerScoutNote(playerId: string | number) {
  const normalizedId = String(playerId);
  return PLAYER_SCOUT_NOTES.find((note) => String(note.apiPlayerId) === normalizedId) ?? null;
}

export function findPlayerScoutNoteByIdentity(identity: {
  id?: string | number | null;
  name?: string | null;
  nameEn?: string | null;
  nameCn?: string | null;
}) {
  if (identity.id != null && /^\d+$/.test(String(identity.id))) {
    const byId = findPlayerScoutNote(identity.id);
    if (byId) return byId;
  }

  const keys = [identity.name, identity.nameEn, identity.nameCn].map(normalizeScoutName).filter(Boolean);
  if (!keys.length) return null;

  return PLAYER_SCOUT_NOTES.find((note) => {
    const noteKeys = [note.nameEn, note.nameCn].map(normalizeScoutName).filter(Boolean);
    return keys.some((key) =>
      noteKeys.some((noteKey) => key === noteKey || key.includes(noteKey) || noteKey.includes(key))
    );
  }) ?? null;
}

export function getPlayerScoutNotes() {
  return PLAYER_SCOUT_NOTES;
}

function normalizeScoutName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "")
    .toLowerCase();
}
