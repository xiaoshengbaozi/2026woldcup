"""
Fetch FIFA.com player breakthrough performances for 2026 World Cup players.
This script:
1. Searches FIFA.com for player-specific content
2. Fetches article content from relevant URLs
3. Extracts breakthrough information (debut, breakthrough, iconic moments, highlights)

Usage:
    python scripts/fetch-fifa-player-breakthroughs-final.py [--limit N] [--team CODE]
"""

import argparse
import asyncio
import json
import re
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
OUTPUT_PATH = ROOT / "outputs" / "fifa-player-breakthroughs-final.json"
CACHE_PATH = ROOT / "outputs" / ".fifa-cache-final.json"

# Rate limiting: seconds between requests
REQUEST_DELAY = 2.0
# Request timeout in milliseconds
REQUEST_TIMEOUT = 60000

# Navigation links to filter out
NAV_LINKS = [
    "skip to main content",
    "fifa rewards",
    "fifa collect",
    "match centre",
    "tickets & hospitality",
    "sign in",
    "register",
    "language",
]

# Keywords for breakthrough moments
BREAKTHROUGH_KEYWORDS = [
    "debut",
    "breakthrough",
    "first cap",
    "first goal",
    "iconic",
    "legendary",
    "memorable",
    "historic",
    "youngest",
    "record",
    "milestone",
    "highlight",
    "star",
    "rising",
    "emerging",
    "talent",
    "sensation",
    "wonderkid",
]


def load_cache() -> dict:
    """Load cache from file."""
    if CACHE_PATH.exists():
        try:
            return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def save_cache(cache: dict) -> None:
    """Save cache to file."""
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


def is_relevant_result(result: dict) -> bool:
    """Check if a search result is relevant (not a navigation link)."""
    title = result.get("title", "").lower()
    url = result.get("url", "").lower()

    # Filter out navigation links
    for nav in NAV_LINKS:
        if nav in title:
            return False

    # Filter out search page links
    if "/search?" in url:
        return False

    # Filter out very short titles
    if len(title) < 10:
        return False

    # Prefer article links
    if "/articles/" in url or "/news/" in url:
        return True

    # Prefer match report links
    if "/match/" in url:
        return True

    # Prefer player profile links
    if "/player/" in url:
        return True

    return True


def extract_breakthrough_info(text: str, player_name: str) -> dict:
    """Extract breakthrough information from article text."""
    info = {
        "hasBreakthrough": False,
        "keywords": [],
        "sentences": [],
    }

    text_lower = text.lower()
    player_name_lower = player_name.lower()

    # Check for breakthrough keywords
    for keyword in BREAKTHROUGH_KEYWORDS:
        if keyword in text_lower:
            info["keywords"].append(keyword)
            info["hasBreakthrough"] = True

    # Extract sentences containing player name and keywords
    sentences = re.split(r'[.!?]+', text)
    for sentence in sentences:
        sentence_lower = sentence.lower()
        if player_name_lower in sentence_lower:
            for keyword in BREAKTHROUGH_KEYWORDS:
                if keyword in sentence_lower:
                    info["sentences"].append(sentence.strip())
                    break

    return info


async def search_and_fetch(page, query: str, player_name: str, cache: dict) -> list[dict]:
    """Search FIFA.com and fetch article content."""
    cache_key = f"{query}|{player_name}"

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

            // Get all links on the page
            document.querySelectorAll('a[href]').forEach(a => {
                const href = a.href;
                const text = a.textContent?.trim();

                // Only include fifa.com links
                if (href && href.includes('fifa.com') && text && text.length > 10) {
                    results.push({
                        url: href,
                        title: text.substring(0, 200),
                        snippet: text.substring(0, 500)
                    });
                }
            });

            return results;
        }""")

        # Filter for relevant results
        relevant_results = []
        for result in search_results:
            if is_relevant_result(result):
                relevant_results.append(result)

        # Fetch article content for top results
        for result in relevant_results[:3]:  # Limit to top 3 results
            url = result.get("url", "")
            if "/articles/" in url or "/news/" in url:
                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=REQUEST_TIMEOUT)
                    await page.wait_for_timeout(2000)

                    # Extract article content
                    content = await page.evaluate("""() => {
                        const selectors = [
                            'article',
                            '.article-content',
                            '.content',
                            'main',
                        ];

                        for (const selector of selectors) {
                            const element = document.querySelector(selector);
                            if (element) {
                                return element.textContent?.trim().substring(0, 3000) || '';
                            }
                        }

                        return document.body?.textContent?.trim().substring(0, 3000) || '';
                    }""")

                    if content:
                        breakthrough_info = extract_breakthrough_info(content, player_name)
                        results.append({
                            "url": url,
                            "title": result.get("title", ""),
                            "contentLength": len(content),
                            "hasBreakthrough": breakthrough_info["hasBreakthrough"],
                            "keywords": breakthrough_info["keywords"],
                            "sentences": breakthrough_info["sentences"][:3],
                        })

                    await asyncio.sleep(REQUEST_DELAY)

                except Exception as e:
                    print(f"    Error fetching article: {e}")

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
        return {"player": player_name, "searches": [], "breakthroughs": []}

    print(f"\nSearching for: {search_name} ({player['teamName']})")

    all_breakthroughs = []
    searches = []

    # Search patterns from the user's requirements
    search_patterns = [
        f'"{search_name}" international debut',
        f'"{search_name}" qualifiers match report',
        f'"{search_name}" World Cup breakthrough',
        f'"{search_name}" FIFA World Cup',
    ]

    for pattern in search_patterns:
        results = await search_and_fetch(page, pattern, search_name, cache)
        if results:
            searches.append({
                "query": pattern,
                "resultCount": len(results),
            })
            for result in results:
                if result.get("hasBreakthrough"):
                    all_breakthroughs.append(result)
        await asyncio.sleep(REQUEST_DELAY)

    # Deduplicate breakthroughs by URL
    seen_urls = set()
    unique_breakthroughs = []
    for breakthrough in all_breakthroughs:
        url = breakthrough.get("url", "")
        if url not in seen_urls:
            seen_urls.add(url)
            unique_breakthroughs.append(breakthrough)

    return {
        "player": player_name,
        "team": player["teamName"],
        "teamCode": player["teamCode"],
        "position": player["position"],
        "searches": searches,
        "breakthroughs": unique_breakthroughs,
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
        "searchType": "player_breakthroughs_final",
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
