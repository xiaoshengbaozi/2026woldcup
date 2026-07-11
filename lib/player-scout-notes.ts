// Pure types + finders. The dataset itself is NOT imported here so client
// bundles stay small:
// - Client components: use `usePlayerScoutNotes()` (lazy fetch) and the
//   `*In` finders below.
// - Server/build-time code: import from `@/lib/player-scout-notes-data`.

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
  contractDetails?: PlayerScoutContractDetails;
};

export type PlayerScoutContractDetails = {
  club: string;
  currency: "CNY";
  weeklyWageCny: number;
  marketValueCny: number;
  transferValueRangeCny: [number, number];
  contractUntil: string;
  statusCn: string;
  exchangeRateNote: string;
  sourceCn: string;
};

export type PlayerScoutIdentity = {
  id?: string | number | null;
  name?: string | null;
  nameEn?: string | null;
  nameCn?: string | null;
};

export function findPlayerScoutNoteIn(notes: PlayerScoutNote[], playerId: string | number) {
  const normalizedId = String(playerId);
  return notes.find((note) => String(note.apiPlayerId) === normalizedId) ?? null;
}

export function findPlayerScoutNoteByIdentityIn(notes: PlayerScoutNote[], identity: PlayerScoutIdentity) {
  if (identity.id != null && /^\d+$/.test(String(identity.id))) {
    const byId = findPlayerScoutNoteIn(notes, identity.id);
    if (byId) return byId;
  }

  const keys = [identity.name, identity.nameEn, identity.nameCn].map(normalizeScoutName).filter(Boolean);
  if (!keys.length) return null;

  return notes.find((note) => {
    const noteKeys = [note.nameEn, note.nameCn].map(normalizeScoutName).filter(Boolean);
    return keys.some((key) =>
      noteKeys.some((noteKey) => key === noteKey || key.includes(noteKey) || noteKey.includes(key))
    );
  }) ?? null;
}

function normalizeScoutName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "")
    .toLowerCase();
}
