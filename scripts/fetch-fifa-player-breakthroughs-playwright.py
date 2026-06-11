"""
Fetch FIFA.com player breakthrough performances for 2026 World Cup players.
This script uses Playwright to search FIFA.com for player-specific content about:
- International debut
- Breakthrough moments
- Iconic moments
- Highlights in FIFA tournaments

Usage:
    python scripts/fetch-fifa-player-breakthroughs-playwright.py [--limit N] [--team CODE]
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from urllib.parse import quote as url_quote
from playwright.async_api import async_playwright

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT / "outputs" / "fifa-world-cup-2026-official-1248-players.json"
OUTPUT_PATH = ROOT / "outputs" / "fifa-player-breakthroughs.json"
CACHE_PATH = ROOT / "outputs" / ".fifa-search-cache.json"

# Rate limiting: seconds between requests
REQUEST_DELAY = 3.0
# Request timeout in milliseconds
REQUEST_TIMEOUT = 60000


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


async def search_fifa(page, query: str, cache: dict) -> list[dict]:
    """Search FIFA.com for a query using Playwright."""
    cache_key = query.lower().strip()

    if cache_key in cache:
        print(f"  [Cache hit] {query}")
        return cache[cache_key]

    results = []

    try:
        # Use FIFA.com search
        search_url = f"https://www.fifa.com/search?q={url_quote(query)}"
        print(f"  Searching: {search_url}")

        await page.goto(search_url, wait_until="domcontentloaded", timeout=REQUEST_TIMEOUT)
        await page.wait_for_timeout(3000)  # Wait for dynamic content

        # Extract search results
        search_results = await page.evaluate("""() => {
            const results = [];

            // Try different selectors for search results
            const selectors = [
                'article',
                '.search-result',
                '.result-item',
                '[class*="result"]',
                'a[href*="/article/"]',
                'a[href*="/news/"]',
                'a[href*="/match/"]',
                'a[href*="/player/"]',
            ];

            for (const selector of selectors) {
                const items = document.querySelectorAll(selector);
                if (items.length > 0) {
                    items.forEach(item => {
                        const link = item.tagName === 'A' ? item : item.querySelector('a');
                        const title = item.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"]');
                        const text = item.textContent?.trim().substring(0, 200);

                        if (link && link.href) {
                            results.push({
                                url: link.href,
                                title: title ? title.textContent.trim() : '',
                                text: text || '',
                                selector: selector
                            });
                        }
                    });
                    break;
                }
            }

            // If no results with specific selectors, get all links
            if (results.length === 0) {
                document.querySelectorAll('a[href]').forEach(a => {
                    if (a.href && a.textContent.trim() && a.textContent.trim().length > 10) {
                        results.push({
                            url: a.href,
                            title: a.textContent.trim().substring(0, 100),
                            text: a.textContent.trim().substring(0, 200),
                            selector: 'all-links'
                        });
                    }
                });
            }

            return results.slice(0, 10);
        }""")

        for result in search_results:
            url = result.get("url", "")
            if "fifa.com" in url:
                results.append({
                    "url": url,
                    "title": result.get("title", ""),
                    "snippet": result.get("text", ""),
                })

        # Cache the results
        cache[cache_key] = results
        save_cache(cache)

    except Exception as e:
        print(f"  Error: {e}")
        results = []

    return results


async def search_player_breakthroughs(page, player: dict, cache: dict) -> dict:
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
        results = await search_fifa(page, pattern, cache)
        if results:
            searches.append({
                "query": pattern,
                "resultCount": len(results),
            })
            all_results.extend(results)
        await asyncio.sleep(REQUEST_DELAY)

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


async def main():
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

    # Launch browser
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        # Search for each player
        all_results = []
        for i, player in enumerate(players, 1):
            print(f"\n[{i}/{len(players)}] Processing {player['name']}...")
            result = await search_player_breakthroughs(page, player, cache)
            all_results.append(result)

            # Save progress incrementally
            if i % 10 == 0:
                save_results(all_results, args)

        await browser.close()

    # Save final results
    save_results(all_results, args)
    print(f"\nCompleted! Searched {len(players)} players")


if __name__ == "__main__":
    asyncio.run(main())
