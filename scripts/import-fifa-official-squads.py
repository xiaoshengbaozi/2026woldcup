import json
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "outputs" / "fifa-squadlists-english.pdf"
CACHE_PATH = ROOT / "data" / "api-football-cache.json"
OUTPUT_PATH = ROOT / "data" / "fifa-official-squads.json"
SOURCE_URL = "https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf"


def normalize(value: str) -> str:
    value = value.replace("\x00", "")
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^A-Za-z0-9\s.'-]", " ", value)
    value = re.sub(r"\s+", " ", value).strip().lower()
    return value


def compact(value: str) -> str:
    return normalize(value).replace(" ", "").replace(".", "").replace("-", "")


def title_name(value: str) -> str:
    fixes = {
        "M Artinez": "Martinez",
        "M Ac": "Mac",
        "M Endez": "Mendez",
        "M Unoz": "Munoz",
    }
    value = re.sub(r"\s+", " ", value.replace("\x00", "")).strip()
    value = value.title()
    value = re.sub(r"\bM Ac\b", "Mac", value)
    value = re.sub(r"\b([A-Z]) ([A-Z][a-z]{2,})\b", lambda match: f"{match.group(1)}{match.group(2).lower()}".title(), value)
    for bad, good in fixes.items():
        value = value.replace(bad, good)
    return value


def last_name_for_alias(last_names: str) -> str:
    cleaned = title_name(last_names)
    parts = cleaned.split()
    if not parts:
        return ""
    if len(parts) >= 2 and parts[0].lower() in {"de", "del", "da", "dos", "van", "von", "mac"}:
        return " ".join(parts[:2])
    return parts[0]


def player_name_to_display(player_name: str) -> str:
    pieces = title_name(player_name).split()
    if len(pieces) < 2:
        return title_name(player_name)
    surname = pieces[0]
    given = " ".join(pieces[1:])
    return f"{given} {surname}".strip()


def full_name_from_columns(first_names: str, last_names: str, fallback_player_name: str) -> str:
    first = title_name(first_names)
    last = title_name(last_names)
    if first and last:
        return f"{first} {last}".strip()
    return player_name_to_display(fallback_player_name)


def aliases_for(player_name: str, first_names: str, last_names: str, shirt_name: str) -> list[str]:
    aliases = {
        title_name(player_name),
        player_name_to_display(player_name),
        f"{title_name(first_names)} {title_name(last_names)}".strip(),
        title_name(last_names),
        title_name(shirt_name),
    }
    last_alias = last_name_for_alias(last_names) or title_name(player_name).split()[0]
    first_tokens = [part for part in re.split(r"[\s-]+", title_name(first_names)) if part]
    for token in first_tokens:
        aliases.add(f"{token} {last_alias}")
        aliases.add(f"{token[0]}. {last_alias}")
        aliases.add(f"{token[0]} {last_alias}")
    return sorted({alias for alias in aliases if alias})


def parse_pdf() -> dict:
    reader = PdfReader(str(PDF_PATH))
    squads = {}

    for page in reader.pages:
        text = page.extract_text(extraction_mode="layout") or ""
        lines = text.splitlines()
        team_line = next((line.strip() for line in lines if re.match(r"^[A-Za-z].+\([A-Z]{3}\)$", line.strip())), "")
        if not team_line:
            continue
        team_match = re.match(r"^(?P<name>.+)\s+\((?P<code>[A-Z]{3})\)$", team_line)
        if not team_match:
            continue

        code = team_match.group("code")
        team_name = team_match.group("name")
        players = []
        for line in lines:
            if re.match(r"\s*ROLE\s+", line):
                break
            row_match = re.match(r"^\s*(\d{1,2})\s*(GK|DF|MF|FW)\s+", line)
            if not row_match:
                continue
            number = int(row_match.group(1))
            position = row_match.group(2)
            fields = re.split(r"\s{2,}", line[row_match.end():].strip(), maxsplit=5)
            if len(fields) < 4:
                continue
            player_name = fields[0].strip()
            first_names = fields[1].strip()
            last_names = fields[2].strip()
            shirt_name = fields[3].strip()
            if not player_name:
                continue
            players.append(
                {
                    "number": number,
                    "position": position,
                    "name": full_name_from_columns(first_names, last_names, player_name),
                    "officialName": title_name(player_name),
                    "firstNames": title_name(first_names),
                    "lastNames": title_name(last_names),
                    "shirtName": title_name(shirt_name),
                    "aliases": aliases_for(player_name, first_names, last_names, shirt_name),
                }
            )

        squads[code] = {
            "teamName": team_name,
            "sourceUrl": SOURCE_URL,
            "players": sorted(players, key=lambda item: item["number"]),
        }

    return squads


def load_api_squads() -> dict:
    if not CACHE_PATH.exists():
        return {}
    cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    teams = {}
    for value in cache.values():
        response = value.get("payload", {}).get("upstream", {}).get("response", [])
        if not response:
            continue
        squad = response[0]
        team = squad.get("team", {})
        name = team.get("name", "")
        players = squad.get("players", [])
        teams[normalize(name)] = players
    return teams


TEAM_CODE_TO_API_NAME = {
    "ALG": "Algeria",
    "BIH": "Bosnia & Herzegovina",
    "CIV": "Ivory Coast",
    "COD": "Congo DR",
    "CPV": "Cape Verde Islands",
    "CUW": "Curaçao",
    "CZE": "Czech Republic",
    "GER": "Germany",
    "IRN": "Iran",
    "KOR": "South Korea",
    "KSA": "Saudi Arabia",
    "RSA": "South Africa",
    "SCO": "Scotland",
    "TUR": "Türkiye",
    "USA": "USA",
}

MANUAL_API_ID_OVERRIDES = {
    ("ALG", "Amine Ferid Ghouiri"): 85041,
    ("BEL", "Amadou Ba Z Mv Om Onana"): 162714,
    ("CPV", "Laros Michael D'Encarnação Duarte"): 37436,
    ("CPV", "Dailon Rocha Livramento"): 343287,
    ("CAN", "Stephen Antunes Eustáquio"): 35570,
    ("COD", "Mayele Fiston Kalala"): 179699,
    ("CRO", "Igor M Atanović"): 202696,
    ("CUW", "Misjonne Juniffer Naigelino Hansen"): 161884,
    ("EGY", "Hamza Mohamed Abdelkarim E Selim"): 550547,
    ("ENG", "Valentino Francisco Livramento"): 158694,
    ("ENG", "Chukwunonso Azuka Tristan Madueke"): 136723,
    ("FRA", "Kouadio Emmanuel Boris Kone"): 22147,
    ("FRA", "Marcus Lilian Thuram-Ulien"): 21509,
    ("HAI", "Bellegarde Bellegarde"): 20665,
    ("HAI", "Wilguens Raphael Polynice Paugain Paugin"): 275367,
    ("IRN", "Ali Reza Safarbeiranvand"): 2682,
    ("IRN", "Seyedpayam Niazmand"): 2681,
    ("IRN", "Mohammadhossein Kanani Zadegan"): 2687,
    ("IRN", "Seyed Saman Ghoddoos"): 2699,
    ("IRN", "Amirhossein Hosseinzadehtazehgheshlagh"): 29937,
    ("IRN", "Seyedhossein Hosseini"): 29755,
    ("IRN", "Ramin Rezaeiansemeskandi"): 2691,
    ("IRQ", "Ahmed Yahya Mhmood Al-Hajjaj"): 542849,
    ("IRQ", "Ali Jasim Elaibi Al-Tameemi"): 542644,
    ("IRQ", "Marko Jabbar Hussein Hussein"): 265448,
    ("PAN", "Cristian Jesus M Artínez"): 554208,
    ("QAT", "Yusuf Abdurisag Yusuf"): 542541,
    ("SEN", "Sadio M Ané"): 304,
    ("SEN", "Diouf Diouf"): 409303,
    ("SWE", "Victor Jörgen Nilsson Lindelöf"): 889,
    ("TUN", "Ali Elabdi"): 49583,
    ("USA", "Weston James Earl Mc Kennie"): 415,
}


def attach_api_ids(squads: dict, api_squads: dict) -> None:
    for code, squad in squads.items():
        api_name = TEAM_CODE_TO_API_NAME.get(code, squad.get("teamName", ""))
        api_players = api_squads.get(normalize(api_name)) if api_name else None
        if api_players is None:
            api_players = []
        api_by_key = {}
        for api_player in api_players:
            name = api_player.get("name", "")
            keys = {normalize(name), compact(name)}
            for key in keys:
                if key:
                    api_by_key.setdefault(key, []).append(api_player)

        used_api_ids = set()
        for player in squad["players"]:
            override_id = MANUAL_API_ID_OVERRIDES.get((code, player["name"]))
            if isinstance(override_id, int) and override_id not in used_api_ids:
                player["apiFootballId"] = override_id
                used_api_ids.add(override_id)
                continue

            matched = None
            for alias in player["aliases"]:
                candidates = [
                    *(api_by_key.get(normalize(alias)) or []),
                    *(api_by_key.get(compact(alias)) or []),
                ]
                matched = next(
                    (
                        candidate
                        for candidate in candidates
                        if isinstance(candidate.get("id"), int) and candidate["id"] not in used_api_ids
                    ),
                    None,
                )
                if matched:
                    break
            if matched and isinstance(matched.get("id"), int):
                player["apiFootballId"] = matched["id"]
                used_api_ids.add(matched["id"])


def preserve_existing_api_ids(squads: dict) -> None:
    if not OUTPUT_PATH.exists():
        return

    try:
        existing_payload = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return

    existing_squads = existing_payload.get("squads", {})
    for code, squad in squads.items():
        existing_players = existing_squads.get(code, {}).get("players", [])
        existing_by_name = {
            player.get("name"): player.get("apiFootballId")
            for player in existing_players
            if isinstance(player.get("apiFootballId"), int)
        }
        used_api_ids = {
            player.get("apiFootballId")
            for player in squad.get("players", [])
            if isinstance(player.get("apiFootballId"), int)
        }

        for player in squad.get("players", []):
            if isinstance(player.get("apiFootballId"), int):
                continue
            existing_id = existing_by_name.get(player.get("name"))
            if isinstance(existing_id, int) and existing_id not in used_api_ids:
                player["apiFootballId"] = existing_id
                used_api_ids.add(existing_id)


def main() -> None:
    if not PDF_PATH.exists():
        raise SystemExit(f"Missing PDF: {PDF_PATH}")

    squads = parse_pdf()
    attach_api_ids(squads, load_api_squads())
    preserve_existing_api_ids(squads)
    payload = {
        "source": "fifa_official",
        "sourceUrl": SOURCE_URL,
        "publishedAt": "2026-06-03",
        "squadSizePerTeam": 26,
        "teamCount": len(squads),
        "playerCount": sum(len(team["players"]) for team in squads.values()),
        "squads": squads,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    matched = sum(1 for team in squads.values() for player in team["players"] if player.get("apiFootballId"))
    print(json.dumps({"teams": len(squads), "players": payload["playerCount"], "matchedApiFootballIds": matched}, indent=2))


if __name__ == "__main__":
    main()
