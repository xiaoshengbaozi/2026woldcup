"""
Summarize FIFA player breakthrough results.
This script analyzes the output from the breakthrough scraper and provides a summary.

Usage:
    python scripts/summarize-fifa-breakthroughs.py [--input FILE]
"""

import argparse
import json
import sys
from pathlib import Path
from collections import Counter

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "outputs" / "fifa-player-breakthroughs-final.json"


def load_results(input_path: Path) -> dict:
    """Load results from JSON file."""
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    try:
        return json.loads(input_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {input_path}: {e}")
        sys.exit(1)


def summarize_results(data: dict) -> None:
    """Print a summary of the results."""
    print("=" * 60)
    print("FIFA Player Breakthrough Summary")
    print("=" * 60)
    print(f"Generated: {data.get('generatedAt', 'N/A')}")
    print(f"Total Players: {data.get('playerCount', 0)}")
    print()

    players = data.get("players", [])

    # Count players with breakthroughs
    players_with_breakthroughs = [p for p in players if p.get("breakthroughs")]
    print(f"Players with breakthroughs: {len(players_with_breakthroughs)}")
    print(f"Players without breakthroughs: {len(players) - len(players_with_breakthroughs)}")
    print()

    # Count breakthroughs by keyword
    keyword_counter = Counter()
    for player in players:
        for breakthrough in player.get("breakthroughs", []):
            for keyword in breakthrough.get("keywords", []):
                keyword_counter[keyword] += 1

    if keyword_counter:
        print("Breakthrough keywords found:")
        for keyword, count in keyword_counter.most_common(10):
            print(f"  {keyword}: {count}")
        print()

    # Count by team
    team_counter = Counter()
    for player in players:
        if player.get("breakthroughs"):
            team_counter[player.get("team", "Unknown")] += 1

    if team_counter:
        print("Teams with breakthroughs:")
        for team, count in team_counter.most_common(10):
            print(f"  {team}: {count} players")
        print()

    # Count by position
    position_counter = Counter()
    for player in players:
        if player.get("breakthroughs"):
            position_counter[player.get("position", "Unknown")] += 1

    if position_counter:
        print("Positions with breakthroughs:")
        for position, count in position_counter.most_common():
            print(f"  {position}: {count} players")
        print()

    # Show top players with most breakthroughs
    print("Top players with most breakthroughs:")
    players_by_breakthrough_count = sorted(
        players_with_breakthroughs,
        key=lambda p: len(p.get("breakthroughs", [])),
        reverse=True
    )

    for player in players_by_breakthrough_count[:10]:
        breakthrough_count = len(player.get("breakthroughs", []))
        print(f"  {player['player']} ({player['team']}): {breakthrough_count} breakthroughs")

    print()

    # Show sample breakthroughs
    print("Sample breakthroughs:")
    for player in players_by_breakthrough_count[:3]:
        print(f"\n  {player['player']} ({player['team']}):")
        for breakthrough in player.get("breakthroughs", [])[:2]:
            print(f"    - {breakthrough.get('title', 'N/A')}")
            print(f"      URL: {breakthrough.get('url', 'N/A')}")
            if breakthrough.get("keywords"):
                print(f"      Keywords: {', '.join(breakthrough['keywords'])}")


def main():
    parser = argparse.ArgumentParser(description="Summarize FIFA player breakthrough results")
    parser.add_argument("--input", type=str, help="Input JSON file path")
    args = parser.parse_args()

    input_path = Path(args.input) if args.input else DEFAULT_INPUT
    data = load_results(input_path)
    summarize_results(data)


if __name__ == "__main__":
    main()
