import { mkdir, readFile, writeFile } from "node:fs/promises";

const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:3001";
const outputPath = new URL("../data/player-translations.todo.json", import.meta.url);

function uniqueTeams(fixtures) {
  const teams = new Map();
  for (const fixture of fixtures) {
    for (const key of ["homeTeam", "awayTeam"]) {
      const team = fixture[key];
      if (team?.id) teams.set(team.id, team);
    }
  }
  return [...teams.values()].sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

async function getJson(path) {
  const response = await fetch(`${backendUrl}${path}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `${path} returned ${response.status}`);
  }
  return payload;
}

async function getExistingRowsByTeam() {
  try {
    const payload = JSON.parse(await readFile(outputPath, "utf8"));
    const rowsByTeam = new Map();
    for (const row of payload.rows ?? []) {
      if (!rowsByTeam.has(row.teamId)) rowsByTeam.set(row.teamId, []);
      rowsByTeam.get(row.teamId).push(row);
    }
    return rowsByTeam;
  } catch {
    return new Map();
  }
}

function toRows(squad) {
  return (squad.players ?? []).map((player) => ({
    apiPlayerId: player.id,
    teamId: squad.team.id,
    teamCode: squad.team.code,
    countryCn: squad.team.name,
    nameEn: player.nameEn,
    nameCn: player.nameCn === player.nameEn ? "" : player.nameCn,
    position: player.position,
    positionCn: player.positionCn,
    number: player.number,
    photo: player.photo,
    source: player.nameCn === player.nameEn ? "" : "manual",
    updatedAt: player.nameCn === player.nameEn ? "" : new Date().toISOString().slice(0, 10),
  }));
}

async function main() {
  const fixturePayload = await getJson("/api/worldcup/fixtures");
  const teams = uniqueTeams(fixturePayload.fixtures ?? []);
  const existingRowsByTeam = await getExistingRowsByTeam();
  const rows = [];
  const reusedTeams = [];

  for (let index = 0; index < teams.length; index += 8) {
    const chunk = teams.slice(index, index + 8);
    const params = new URLSearchParams();
    for (const team of chunk) {
      params.append("team", String(team.id));
    }

    try {
      const squadPayload = await getJson(`/api/worldcup/squads?${params}`);
      for (const squad of squadPayload.squads ?? []) rows.push(...toRows(squad));
    } catch (batchError) {
      console.warn(`Batch failed (${chunk.map((team) => team.code).join(", ")}): ${batchError.message}`);

      for (const team of chunk) {
        try {
          const squadPayload = await getJson(`/api/worldcup/squads?team=${team.id}`);
          for (const squad of squadPayload.squads ?? []) rows.push(...toRows(squad));
        } catch (teamError) {
          const existingRows = existingRowsByTeam.get(team.id);
          if (!existingRows?.length) throw teamError;

          rows.push(...existingRows);
          reusedTeams.push(team.code);
          console.warn(`Reused previous snapshot for ${team.code}: ${teamError.message}`);
        }
      }
    }
  }

  rows.sort((a, b) => (
    String(a.teamCode).localeCompare(String(b.teamCode)) ||
    String(a.position).localeCompare(String(b.position)) ||
    String(a.nameEn).localeCompare(String(b.nameEn))
  ));

  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), count: rows.length, reusedTeams, rows }, null, 2)}\n`,
    "utf8"
  );
  console.log(`Wrote ${rows.length} players to ${outputPath.pathname}`);
  if (reusedTeams.length) console.log(`Reused previous snapshot for: ${reusedTeams.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
