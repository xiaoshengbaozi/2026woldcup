"""
Fetch FIFA.com player breakthrough performances for 2026 World Cup players.
This script searches FIFA.com for player-specific content about:
- International debut
- Breakthrough moments
- Iconic moments
- Highlights in FIFA tournaments

Usage:
    python scripts/fetch-fifa-player-breakthroughs.py [--limit N] [--team CODE]
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Optional
import requests
from bs4 import BeautifulSoup

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT / "outputs" / "fifa-world-cup-2026-official-1248-players.json"
OUTPUT_PATH = ROOT / "outputs" / "fifa-player-breakthroughs.json"
CACHE_PATH = ROOT / "outputs" / ".fifa-search-cache.json"

# Rate limiting: seconds between requests
REQUEST_DELAY = 2.0
# Maximum retries per request
MAX_RETRIES = 3
# Request timeout in seconds
REQUEST_TIMEOUT = 30

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def load_cache() -> dict:
    """Load search cache to avoid duplicate requests."""
    if CACHE_PATH.exists():
        try:
            return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def save_cache(cache: dict) -> None:
    """Save search cache."""
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_players() -> list[dict]:
    """Load players from the JSON file."""
    data = json.loads(INPUT_PATH.read_text(encoding="utf-8"))
    players = []

    for team in data.get("teams", []):
        team_code = team.get("code", "")
        team_name = team.get("name", "")

        for player in team.get("players", []):
            players.append({
                "teamCode": team_code,
                "teamName": team_name,
                "number": player.get("number"),
                "position": player.get("position"),
                "name": player.get("name", ""),
                "officialName": player.get("officialName", ""),
                "firstNames": player.get("firstNames", ""),
                "lastNames": player.get("lastNames", ""),
                "aliases": player.get("aliases", []),
            })

    return players


def search_fifa(query: str, cache: dict) -> list[dict]:
    """Search FIFA.com for a query."""
    cache_key = query.lower().strip()

    if cache_key in cache:
        print(f"  [Cache hit] {query}")
        return cache[cache_key]

    results = []

    try:
        # Use FIFA.com search
        search_url = f"https://www.fifa.com/search?q={requests.utils.quote(query)}"
        print(f"  Searching: {search_url}")

        response = requests.get(search_url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Extract search results
        # Look for article links and titles
        for link in soup.find_all("a", href=True):
            href = link.get("href", "")
            text = link.get_text(strip=True)

            # Filter for relevant FIFA.com content
            if any(pattern in href for pattern in ["/article/", "/news/", "/match/", "/player/"]):
                if text and len(text) > 10:
                    results.append({
                        "url": href if href.startswith("http") else f"https://www.fifa.com{href}",
                        "title": text[:200],
                        "snippet": "",
                    })

        # Also look for meta descriptions
        for meta in soup.find_all("meta", attrs={"name": "description"}):
            content = meta.get("content", "")
            if content:
                results.append({
                    "url": search_url,
                    "title": "Search Description",
                    "snippet": content[:500],
                })

        # Limit results
        results = results[:10]

        # Cache the results
        cache[cache_key] = results
        save_cache(cache)

    except requests.exceptions.RequestException as e:
        print(f"  Error: {e}")
        results = []

    return results


def search_player_breakthroughs(player: dict, cache: dict) -> dict:
    """Search for a player's breakthrough performances on FIFA.com."""
    player_name = player["name"]
    aliases = player["aliases"]

    # Use the best name for searching
    search_name = player_name
    if not search_name and aliases:
        search_name = aliases[0]

    if not search_name:
        return {"player": player_name, "searches": [], "results": []}

    print(f"\nSearching for: {search_name} ({player['teamName']})")

    all_results = []
    searches = []

    # Search patterns from the user's requirements
    search_patterns = [
        f'"{search_name}" international debut',
        f'"{search_name}" qualifiers match report',
        f'"{search_name}" World Cup breakthrough',
        f'"{search_name}" FIFA World Cup',
    ]

    for pattern in search_patterns:
        results = search_fifa(pattern, cache)
        if results:
            searches.append({
                "query": pattern,
                "resultCount": len(results),
            })
            all_results.extend(results)
        time.sleep(REQUEST_DELAY)

    # Deduplicate results by URL
    seen_urls = set()
    unique_results = []
    for result in all_results:
        url = result.get("url", "")
        if url not in seen_urls:
            seen_urls.add(url)
            unique_results.append(result)

    return {
        "player": player_name,
        "team": player["teamName"],
        "teamCode": player["teamCode"],
        "position": player["position"],
        "searches": searches,
        "results": unique_results,
    }


def prioritize_players(players: list[dict]) -> list[dict]:
    """Prioritize players for searching (star players first)."""
    # Priority order: FW, MF, DF, GK
    position_priority = {"FW": 0, "MF": 1, "DF": 2, "GK": 3}

    # Sort by position priority
    return sorted(players, key=lambda p: position_priority.get(p.get("position", ""), 4))


def main():
    parser = argparse.ArgumentParser(description="Fetch FIFA.com player breakthrough performances")
    parser.add_argument("--limit", type=int, help="Limit number of players to search")
    parser.add_argument("--team", type=str, help="Filter by team code (e.g., ARG, BRA)")
    parser.add_argument("--position", type=str, help="Filter by position (FW, MF, DF, GK)")
    parser.add_argument("--resume", action="store_true", help="Resume from cache")
    args = parser.parse_args()

    # Load players
    print("Loading players...")
    players = load_players()
    print(f"Loaded {len(players)} players")

    # Apply filters
    if args.team:
        players = [p for p in players if p["teamCode"] == args.team.upper()]
        print(f"Filtered to {len(players)} players from team {args.team}")

    if args.position:
        players = [p for p in players if p["position"] == args.position.upper()]
        print(f"Filtered to {len(players)} players with position {args.position}")

    # Prioritize players
    players = prioritize_players(players)

    # Apply limit
    if args.limit:
        players = players[:args.limit]
        print(f"Limited to {len(players)} players")

    # Load cache
    cache = load_cache() if args.resume else {}
    print(f"Cache contains {len(cache)} entries")

    # Search for each player
    all_results = []
    for i, player in enumerate(players, 1):
        print(f"\n[{i}/{len(players)}] Processing {player['name']}...")
        result = search_player_breakthroughs(player, cache)
        all_results.append(result)

        # Save progress incrementally
        if i % 10 == 0:
            save_results(all_results, args)

    # Save final results
    save_results(all_results, args)
    print(f"\nCompleted! Searched {len(players)} players")


def save_results(results: list[dict], args) -> None:
    """Save results to output file."""
    output = {
        "source": "fifa.com",
        "searchType": "player_breakthroughs",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "filters": {
            "team": args.team,
            "position": args.position,
            "limit": args.limit,
        },
        "playerCount": len(results),
        "players": results,
    }

    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved results to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
