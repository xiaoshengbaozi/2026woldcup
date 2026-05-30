import type {
  Match,
  MatchDetail,
  MatchOdds,
  MatchLineup,
  MatchEvent,
  MatchStats,
  MatchNewsItem,
  HeadToHeadMatch,
  MatchStatus,
} from "@/types/match";

// 鈹€鈹€ Helper 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 鈹€鈹€ Odds 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function generateOdds(homeProb: number): MatchOdds {
  const draw = rand(18, 28);
  const away = 100 - homeProb - draw;

  const history = Array.from({ length: 48 }, (_, i) => ({
    timestamp: Date.now() - (48 - i) * 3600000,
    homeWin: Math.max(5, Math.min(90, homeProb + rand(-8, 8))),
    draw: Math.max(10, Math.min(40, draw + rand(-5, 5))),
    awayWin: Math.max(5, Math.min(90, away + rand(-8, 8))),
  }));

  return {
    homeWin: Math.round(homeProb * 10) / 10,
    draw: Math.round(draw * 10) / 10,
    awayWin: Math.round(Math.max(5, away) * 10) / 10,
    history,
  };
}

// 鈹€鈹€ Lineups 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

const PLAYER_POOLS: Record<string, Array<{ name: string; number: number; position: string; club: string; age: number }>> = {
  ESP: [
    { name: "Unai Sim贸n", number: 23, position: "GK", club: "Athletic Bilbao", age: 28 },
    { name: "Carvajal", number: 2, position: "RB", club: "Real Madrid", age: 33 },
    { name: "Laporte", number: 24, position: "CB", club: "Al Nassr", age: 31 },
    { name: "Le Normand", number: 3, position: "CB", club: "Real Sociedad", age: 27 },
    { name: "Cucurella", number: 22, position: "LB", club: "Chelsea", age: 26 },
    { name: "Rodri", number: 16, position: "CDM", club: "Manchester City", age: 28 },
    { name: "Pedri", number: 8, position: "CM", club: "Barcelona", age: 22 },
    { name: "Gavi", number: 6, position: "CM", club: "Barcelona", age: 20 },
    { name: "Lamine Yamal", number: 19, position: "RW", club: "Barcelona", age: 18 },
    { name: "Morata", number: 7, position: "ST", club: "AC Milan", age: 32 },
    { name: "Nico Williams", number: 17, position: "LW", club: "Athletic Bilbao", age: 22 },
  ],
  BRA: [
    { name: "Alisson", number: 1, position: "GK", club: "Liverpool", age: 32 },
    { name: "Danilo", number: 2, position: "RB", club: "Juventus", age: 33 },
    { name: "Marquinhos", number: 3, position: "CB", club: "PSG", age: 30 },
    { name: "Gabriel", number: 4, position: "CB", club: "Arsenal", age: 26 },
    { name: "Vin铆cius Jr.", number: 20, position: "LB", club: "Real Madrid", age: 24 },
    { name: "Casemiro", number: 5, position: "CDM", club: "Manchester United", age: 32 },
    { name: "Bruno Guimar茫es", number: 8, position: "CM", club: "Newcastle", age: 27 },
    { name: "Lucas Paquet谩", number: 7, position: "CAM", club: "West Ham", age: 26 },
    { name: "Raphinha", number: 11, position: "RW", club: "Barcelona", age: 27 },
    { name: "Vin铆cius Jr.", number: 20, position: "LW", club: "Real Madrid", age: 24 },
    { name: "Rodrygo", number: 9, position: "ST", club: "Real Madrid", age: 24 },
  ],
  FRA: [
    { name: "Maignan", number: 16, position: "GK", club: "AC Milan", age: 29 },
    { name: "Kound茅", number: 5, position: "RB", club: "Barcelona", age: 25 },
    { name: "Saliba", number: 17, position: "CB", club: "Arsenal", age: 23 },
    { name: "Upamecano", number: 2, position: "CB", club: "Bayern Munich", age: 25 },
    { name: "Theo Hern谩ndez", number: 22, position: "LB", club: "AC Milan", age: 26 },
    { name: "Tchouam茅ni", number: 8, position: "CDM", club: "Real Madrid", age: 24 },
    { name: "Camavinga", number: 6, position: "CM", club: "Real Madrid", age: 21 },
    { name: "Za茂re-Emery", number: 18, position: "CM", club: "PSG", age: 19 },
    { name: "Demb茅l茅", number: 7, position: "RW", club: "PSG", age: 27 },
    { name: "Mbapp茅", number: 10, position: "ST", club: "Real Madrid", age: 26 },
    { name: "Thuram", number: 15, position: "LW", club: "Inter Milan", age: 26 },
  ],
  ENG: [
    { name: "Pickford", number: 1, position: "GK", club: "Everton", age: 30 },
    { name: "Walker", number: 2, position: "RB", club: "AC Milan", age: 34 },
    { name: "Stones", number: 5, position: "CB", club: "Manchester City", age: 30 },
    { name: "Guehi", number: 6, position: "CB", club: "Crystal Palace", age: 24 },
    { name: "Trippier", number: 3, position: "LB", club: "Newcastle", age: 33 },
    { name: "Rice", number: 4, position: "CDM", club: "Arsenal", age: 25 },
    { name: "Bellingham", number: 10, position: "CAM", club: "Real Madrid", age: 21 },
    { name: "Foden", number: 7, position: "CM", club: "Manchester City", age: 24 },
    { name: "Saka", number: 9, position: "RW", club: "Arsenal", age: 22 },
    { name: "Kane", number: 8, position: "ST", club: "Bayern Munich", age: 31 },
    { name: "Palmer", number: 11, position: "LW", club: "Chelsea", age: 22 },
  ],
  ARG: [
    { name: "Dibu Mart铆nez", number: 23, position: "GK", club: "Aston Villa", age: 31 },
    { name: "Molina", number: 4, position: "RB", club: "Atl茅tico Madrid", age: 26 },
    { name: "Romero", number: 13, position: "CB", club: "Tottenham", age: 26 },
    { name: "Otamendi", number: 19, position: "CB", club: "Benfica", age: 36 },
    { name: "Tagliafico", number: 3, position: "LB", club: "Lyon", age: 31 },
    { name: "De Paul", number: 7, position: "CM", club: "Atl茅tico Madrid", age: 30 },
    { name: "Enzo Fern谩ndez", number: 24, position: "CM", club: "Chelsea", age: 23 },
    { name: "Mac Allister", number: 20, position: "CAM", club: "Liverpool", age: 25 },
    { name: "Messi", number: 10, position: "RW", club: "Inter Miami", age: 38 },
    { name: "脕lvarez", number: 9, position: "ST", club: "Atl茅tico Madrid", age: 24 },
    { name: "Di Mar铆a", number: 11, position: "LW", club: "Benfica", age: 36 },
  ],
  GER: [
    { name: "Ter Stegen", number: 1, position: "GK", club: "Barcelona", age: 32 },
    { name: "Kimmich", number: 6, position: "RB", club: "Bayern Munich", age: 29 },
    { name: "R眉diger", number: 2, position: "CB", club: "Real Madrid", age: 31 },
    { name: "Tah", number: 4, position: "CB", club: "Bayer Leverkusen", age: 28 },
    { name: "Mittelst盲dt", number: 3, position: "LB", club: "VfB Stuttgart", age: 27 },
    { name: "Andrich", number: 5, position: "CDM", club: "Bayer Leverkusen", age: 28 },
    { name: "Musiala", number: 10, position: "CAM", club: "Bayern Munich", age: 21 },
    { name: "Wirtz", number: 7, position: "CM", club: "Bayer Leverkusen", age: 21 },
    { name: "San茅", number: 19, position: "RW", club: "Bayern Munich", age: 28 },
    { name: "Havertz", number: 9, position: "ST", club: "Arsenal", age: 25 },
    { name: "Musiala", number: 10, position: "LW", club: "Bayern Munich", age: 21 },
  ],
  POR: [
    { name: "Diogo Costa", number: 1, position: "GK", club: "Porto", age: 25 },
    { name: "Dalot", number: 2, position: "RB", club: "Manchester United", age: 25 },
    { name: "Pepe", number: 3, position: "CB", club: "Porto", age: 41 },
    { name: "Ant贸nio Silva", number: 4, position: "CB", club: "Benfica", age: 21 },
    { name: "Nuno Mendes", number: 19, position: "LB", club: "PSG", age: 22 },
    { name: "Palhinha", number: 6, position: "CDM", club: "Bayern Munich", age: 29 },
    { name: "Bernardo Silva", number: 8, position: "CM", club: "Manchester City", age: 29 },
    { name: "Bruno Fernandes", number: 10, position: "CAM", club: "Manchester United", age: 29 },
    { name: "Rafael Le茫o", number: 11, position: "RW", club: "AC Milan", age: 24 },
    { name: "Cristiano Ronaldo", number: 7, position: "ST", club: "Al Nassr", age: 39 },
    { name: "Pedro Neto", number: 17, position: "LW", club: "Chelsea", age: 24 },
  ],
  NED: [
    { name: "Verbruggen", number: 1, position: "GK", club: "Brighton", age: 22 },
    { name: "Dumfries", number: 2, position: "RB", club: "Inter Milan", age: 28 },
    { name: "Van Dijk", number: 4, position: "CB", club: "Liverpool", age: 33 },
    { name: "De Ligt", number: 3, position: "CB", club: "Manchester United", age: 25 },
    { name: "Ake", number: 5, position: "LB", club: "Manchester City", age: 29 },
    { name: "De Jong", number: 21, position: "CDM", club: "Barcelona", age: 27 },
    { name: "Simons", number: 8, position: "CM", club: "RB Leipzig", age: 21 },
    { name: "Reijnders", number: 6, position: "CM", club: "AC Milan", age: 26 },
    { name: "Dumfries", number: 7, position: "RW", club: "Inter Milan", age: 28 },
    { name: "Gakpo", number: 10, position: "ST", club: "Liverpool", age: 25 },
    { name: "Xavi Simons", number: 11, position: "LW", club: "RB Leipzig", age: 21 },
  ],
  JPN: [
    { name: "Gonda", number: 1, position: "GK", club: "Shimizu S-Pulse", age: 35 },
    { name: "Yamane", number: 2, position: "RB", club: "Kawasaki Frontale", age: 31 },
    { name: "Itakura", number: 4, position: "CB", club: "Borussia M枚nchengladbach", age: 27 },
    { name: "Taniguchi", number: 22, position: "CB", club: "Kawasaki Frontale", age: 32 },
    { name: "Daiichi Kamada", number: 3, position: "LB", club: "Crystal Palace", age: 27 },
    { name: "Endo", number: 6, position: "CDM", club: "Liverpool", age: 31 },
    { name: "Kubo", number: 8, position: "CM", club: "Real Sociedad", age: 23 },
    { name: "Doan", number: 7, position: "CAM", club: "Freiburg", age: 25 },
    { name: "Ito", number: 11, position: "RW", club: "Stuttgart", age: 25 },
    { name: "Ueda", number: 9, position: "ST", club: "Celtic", age: 25 },
    { name: "Mitoma", number: 10, position: "LW", club: "Brighton", age: 27 },
  ],
  COL: [
    { name: "S谩nchez", number: 1, position: "GK", club: "Porto", age: 28 },
    { name: "Arias", number: 4, position: "RB", club: "Atl茅tico Nacional", age: 32 },
    { name: "S谩nchez", number: 2, position: "CB", club: "Tottenham", age: 26 },
    { name: "Mina", number: 13, position: "CB", club: "Flamengo", age: 32 },
    { name: "Estupi帽谩n", number: 17, position: "LB", club: "Brighton", age: 26 },
    { name: "Barrios", number: 5, position: "CDM", club: "Portland Timbers", age: 31 },
    { name: "Lerma", number: 15, position: "CM", club: "Crystal Palace", age: 29 },
    { name: "James Rodr铆guez", number: 10, position: "CAM", club: "Rayo Vallecano", age: 33 },
    { name: "Luis D铆az", number: 7, position: "RW", club: "Liverpool", age: 27 },
    { name: "Muriel", number: 9, position: "ST", club: "Atl茅tico Mineiro", age: 33 },
    { name: "Arias", number: 11, position: "LW", club: "Cruzeiro", age: 32 },
  ],
  USA: [
    { name: "Turner", number: 1, position: "GK", club: "Nottingham Forest", age: 29 },
    { name: "Dest", number: 2, position: "RB", club: "PSV", age: 23 },
    { name: "Richards", number: 12, position: "CB", club: "Crystal Palace", age: 24 },
    { name: "Ream", number: 13, position: "CB", club: "Chelsea", age: 37 },
    { name: "Robinson", number: 3, position: "LB", club: "Fulham", age: 27 },
    { name: "Adams", number: 4, position: "CDM", club: "AFC Bournemouth", age: 25 },
    { name: "McKennie", number: 6, position: "CM", club: "Juventus", age: 26 },
    { name: "Musah", number: 8, position: "CM", club: "AC Milan", age: 21 },
    { name: "Weah", number: 11, position: "RW", club: "Juventus", age: 24 },
    { name: "Pepi", number: 9, position: "ST", club: "PSV", age: 21 },
    { name: "Pulisic", number: 10, position: "LW", club: "AC Milan", age: 25 },
  ],
};

function buildLineup(
  teamCode: string,
  formation: string
): MatchLineup {
  const pool = PLAYER_POOLS[teamCode];
  if (!pool) {
    return { formation, players: generateGenericLineup(teamCode, formation) };
  }

  return {
    formation,
    players: pool.map((p, i) => ({
      id: `${teamCode}-${i}`,
      name: p.name,
      number: p.number,
      position: p.position as any,
      isStarter: i < 11,
      country: teamCode,
      club: p.club,
      age: p.age,
      rating: i < 11 ? Math.round(rand(6.0, 9.2) * 10) / 10 : undefined,
      isCaptain: i === 4,
      yellowCards: 0,
    })),
  };
}

function generateGenericLineup(teamCode: string, formation: string): any[] {
  const positions = ["GK", "CB", "CB", "LB", "RB", "CDM", "CM", "CM", "LW", "RW", "ST"];
  return positions.map((pos, i) => ({
    id: `${teamCode}-${i}`,
    name: `Player ${i + 1}`,
    number: i + 1,
    position: pos,
    isStarter: true,
    country: teamCode,
    club: "TBD",
    age: 25,
    rating: Math.round(rand(6.0, 8.5) * 10) / 10,
    isCaptain: i === 4,
  }));
}

// 鈹€鈹€ Events 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function generateEvents(homeTeam: string, awayTeam: string): MatchEvent[] {
  const eventPool: Omit<MatchEvent, "id">[] = [
    { minute: 12, type: "goal", player: "Morata", team: "home", description: "澶寸悆鐮撮棬" },
    { minute: 23, type: "yellow_card", player: "Casemiro", team: "away", description: "鎴樻湳鐘" },
    { minute: 34, type: "goal", player: "Vin铆cius Jr.", team: "away", description: "鍐呭垏灏勯棬" },
    { minute: 41, type: "var_review", team: "home", description: "VAR 鍒ょ綒鐐圭悆" },
    { minute: 42, type: "penalty_goal", player: "Morata", team: "home", description: "鐐圭悆鍛戒腑" },
    { minute: 45, type: "halftime", team: "home" },
    { minute: 56, type: "substitution", player: "Gavi", playerOut: "Pedri", team: "home" },
    { minute: 67, type: "goal", player: "Rodrygo", team: "away", description: "鍙嶅嚮鐮撮棬" },
    { minute: 72, type: "substitution", player: "Nico Williams", playerOut: "Lamine Yamal", team: "home" },
    { minute: 78, type: "yellow_card", player: "Marquinhos", team: "away", description: "鎷栧欢鏃堕棿" },
    { minute: 85, type: "goal", player: "Nico Williams", team: "home", description: "Long-range finish" },
    { minute: 90, type: "fulltime", team: "home" },
  ];

  return eventPool.map((e, i) => ({
    ...e,
    id: `evt-${i}`,
    addedTime: e.minute >= 90 ? Math.floor(Math.random() * 5) + 1 : undefined,
  }));
}

// 鈹€鈹€ Stats 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function generateStats(): MatchStats {
  return {
    possession: [rand(40, 60), 0].map((v, i) => i === 0 ? Math.round(v) : Math.round(100 - v)) as [number, number],
    shots: [Math.round(rand(8, 18)), Math.round(rand(6, 15))],
    shotsOnTarget: [Math.round(rand(3, 8)), Math.round(rand(2, 7))],
    xG: [Math.round(rand(1.0, 3.5) * 10) / 10, Math.round(rand(0.8, 2.8) * 10) / 10],
    passAccuracy: [Math.round(rand(78, 92)), Math.round(rand(75, 90))],
    corners: [Math.round(rand(3, 10)), Math.round(rand(2, 8))],
    fouls: [Math.round(rand(8, 18)), Math.round(rand(10, 20))],
    yellowCards: [Math.round(rand(1, 4)), Math.round(rand(1, 5))],
    redCards: [0, 0],
    offsides: [Math.round(rand(0, 4)), Math.round(rand(0, 3))],
  };
}

// 鈹€鈹€ News 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function generateNews(homeTeam: string, awayTeam: string): MatchNewsItem[] {
  const templates = [
    { title: `${homeTeam} vs ${awayTeam}: complete match preview`, source: "ESPN", category: "analysis" as const },
    { title: `World Cup focus: ${homeTeam} face ${awayTeam}`, source: "BBC Sport", category: "preview" as const },
    { title: `${homeTeam} expected lineup and key players`, source: "FIFA.com", category: "lineup" as const },
    { title: `${awayTeam} squad and fitness update`, source: "Sky Sports", category: "injury" as const },
    { title: `Market odds: ${homeTeam} vs ${awayTeam}`, source: "Polymarket", category: "analysis" as const },
    { title: `${homeTeam} coach speaks before kickoff`, source: "Marca", category: "preview" as const },
    { title: `Historical data: ${homeTeam} vs ${awayTeam}`, source: "Transfermarkt", category: "analysis" as const },
    { title: `${awayTeam} key player returns to squad`, source: "Goal", category: "injury" as const },
  ];

  return templates.map((t, i) => ({
    id: `news-${i}`,
    title: t.title,
    source: t.source,
    url: "#",
    publishedAt: Date.now() - i * 3600000 * Math.random() * 24,
    category: t.category,
  }));
}

// 鈹€鈹€ Head to Head 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function generateHeadToHead(homeTeam: string, awayTeam: string): HeadToHeadMatch[] {
  return [
    { date: "2024-03-26", competition: "International Friendly", homeTeam, awayTeam, score: "2 - 1" },
    { date: "2022-11-23", competition: "World Cup Group Stage", homeTeam, awayTeam, score: "1 - 0" },
    { date: "2018-07-01", competition: "World Cup Round of 16", homeTeam, awayTeam, score: "1 - 1 (4-3 pen)" },
    { date: "2013-06-06", competition: "Confederations Cup", homeTeam, awayTeam, score: "3 - 0" },
    { date: "2010-07-10", competition: "World Cup Semifinal", homeTeam, awayTeam, score: "1 - 0" },
  ];
}

// 鈹€鈹€ Status Derivation 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function deriveStatus(matchStart: Date, matchEnd: Date | null): MatchStatus {
  const now = Date.now();
  const start = matchStart.getTime();
  const end = matchEnd?.getTime() ?? start + 7200000;

  if (now < start) return "not_started";
  if (now > end) return "finished";
  if (now - start > 3600000 && now - start < 5400000) return "halftime";
  return "live";
}

function normalizeTeamName(value: string): string {
  return value
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/\u{1F3F4}[\u{E0061}-\u{E007A}\u{E007F}]*/gu, "")
    .replace(/\u{1F3F3}\u{FE0F}?/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getTeamCode(name: string): string {
  const specialTeamCode = getSpecialTeamCode(name);
  if (specialTeamCode) return specialTeamCode;

  const flagCode = getCodeFromFlag(name);
  return CN_TO_CODE[name] ?? flagCode ?? name.slice(0, 3).toUpperCase();
}

function getSpecialTeamCode(value: string): string | undefined {
  if (value.includes("苏格兰")) return "SCO";
  if (value.includes("英格兰")) return "ENG";
  return undefined;
}

function getCodeFromFlag(value: string): string | undefined {
  const chars = [...value];
  for (let index = 0; index < chars.length - 1; index++) {
    if (isRegionalIndicator(chars[index]) && isRegionalIndicator(chars[index + 1])) {
      const iso2 = `${regionalIndicatorToLetter(chars[index])}${regionalIndicatorToLetter(chars[index + 1])}`;
      return ISO2_TO_CODE[iso2];
    }
  }

  return undefined;
}

function isRegionalIndicator(char: string) {
  const codePoint = char.codePointAt(0) ?? 0;
  return codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
}

function regionalIndicatorToLetter(char: string) {
  const codePoint = char.codePointAt(0) ?? 0;
  return String.fromCharCode(codePoint - 0x1f1e6 + 65);
}

// 鈹€鈹€ Public API 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export function generateMatchDetail(
  match: Match,
): MatchDetail {
  const parts = match.summary.replace(/^鈿絓s*/, "").split(/\s+vs\s+/i);
  const homeName = normalizeTeamName(parts[0] ?? "寰呭畾");
  const awayName = normalizeTeamName(parts[1]?.replace(/\s*\([^)]+\)\s*$/, "") ?? "寰呭畾");

  const homeCode = getTeamCode(parts[0] ?? homeName);
  const awayCode = getTeamCode(parts[1]?.replace(/\s*\([^)]+\)\s*$/, "") ?? awayName);

  const status = deriveStatus(match.start, match.end);
  const isFinished = status === "finished";
  const isLive = status === "live" || status === "halftime";

  const homeScore = isFinished || isLive ? Math.round(rand(0, 4)) : 0;
  const awayScore = isFinished || isLive ? Math.round(rand(0, 3)) : 0;

  const homeProb = rand(30, 65);
  const formations = ["4-3-3", "4-2-3-1", "3-5-2", "4-4-2", "4-1-4-1"];

  return {
    match,
    slug: "",
    homeTeamCode: homeCode,
    awayTeamCode: awayCode,
    status,
    score: { home: homeScore, away: awayScore },
    odds: generateOdds(homeProb),
    homeLineup: buildLineup(homeCode, pick(formations)),
    awayLineup: buildLineup(awayCode, pick(formations)),
    events: isFinished || isLive ? generateEvents(homeName, awayName) : [],
    stats: isFinished || isLive ? generateStats() : {
      possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0],
      xG: [0, 0], passAccuracy: [0, 0], corners: [0, 0],
      fouls: [0, 0], yellowCards: [0, 0], redCards: [0, 0], offsides: [0, 0],
    },
    news: generateNews(homeName, awayName),
    headToHead: generateHeadToHead(homeName, awayName),
  };
}

// 鈹€鈹€ CN 鈫?FIFA Code mapping 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

const CN_TO_CODE: Record<string, string> = {};

const ISO2_TO_CODE: Record<string, string> = {
  AR: "ARG",
  AU: "AUS",
  AT: "AUT",
  BE: "BEL",
  BA: "BIH",
  BR: "BRA",
  CA: "CAN",
  CI: "CIV",
  CD: "COD",
  CO: "COL",
  CV: "CPV",
  CW: "CUW",
  CZ: "CZE",
  DK: "DEN",
  DZ: "DZA",
  EC: "ECU",
  EG: "EGY",
  ES: "ESP",
  FR: "FRA",
  DE: "GER",
  GH: "GHA",
  HT: "HAI",
  HR: "CRO",
  IR: "IRN",
  IQ: "IRQ",
  JO: "JOR",
  JP: "JPN",
  KR: "KOR",
  MA: "MAR",
  MX: "MEX",
  NL: "NED",
  NO: "NOR",
  NZ: "NZL",
  PA: "PAN",
  PY: "PAR",
  PL: "POL",
  PT: "POR",
  QA: "QAT",
  ZA: "RSA",
  SA: "SAU",
  SN: "SEN",
  RS: "SRB",
  CH: "SUI",
  SE: "SWE",
  TN: "TUN",
  TR: "TUR",
  UY: "URU",
  US: "USA",
  UZ: "UZB",
};

