# FIFA Player Breakthrough Scraper

This directory contains scripts to search FIFA.com for player breakthrough performances for the 2026 World Cup.

## Scripts

### 1. `fetch-fifa-player-breakthroughs-final.py`

The main script that searches FIFA.com for player-specific content about:
- International debut
- Breakthrough moments
- Iconic moments
- Highlights in FIFA tournaments

**Usage:**
```bash
# Search all players (limit to 10 for testing)
python scripts/fetch-fifa-player-breakthroughs-final.py --limit 10

# Search specific team
python scripts/fetch-fifa-player-breakthroughs-final.py --team ARG

# Resume from cache
python scripts/fetch-fifa-player-breakthroughs-final.py --resume --limit 50
```

**Options:**
- `--limit N`: Limit number of players to search
- `--team CODE`: Filter by team code (e.g., ARG, BRA, FRA)
- `--position POS`: Filter by position (FW, MF, DF, GK)
- `--resume`: Resume from cache (avoid re-fetching)

**Output:**
- `outputs/fifa-player-breakthroughs-final.json`: Main results file
- `outputs/.fifa-cache-final.json`: Cache file for avoiding duplicate requests

### 2. `search-fifa-one-to-watch.py`

Searches for FIFA's "One to watch" 2026 articles.

### 3. `search-fifa-direct.py`

Direct search on FIFA.com for player content.

## Search Patterns

The scripts use the following search patterns from the user's requirements:

1. `site:fifa.com "[player name]" AND "international debut"`
2. `site:fifa.com "[player name]" AND "qualifiers" AND "match report"`
3. `site:fifa.com "[player name]" AND "World Cup breakthrough"`
4. `site:fifa.com "[player name]" AND "FIFA World Cup"`

## Breakthrough Keywords

The scripts look for the following keywords in article content:
- debut, breakthrough, first cap, first goal
- iconic, legendary, memorable, historic
- youngest, record, milestone
- highlight, star, rising, emerging, talent
- sensation, wonderkid

## Rate Limiting

The scripts include rate limiting to avoid overwhelming FIFA.com:
- 2-3 seconds between requests
- 60-second timeout for page loads
- Cache to avoid duplicate requests

## Output Format

The output JSON file contains:
```json
{
  "source": "fifa.com",
  "searchType": "player_breakthroughs_final",
  "generatedAt": "2026-06-04T15:07:15Z",
  "filters": {
    "team": "ARG",
    "position": null,
    "limit": 2
  },
  "playerCount": 2,
  "players": [
    {
      "player": "Lionel Andrés Messi",
      "team": "Argentina",
      "teamCode": "ARG",
      "position": "FW",
      "searches": [
        {
          "query": "\"Lionel Andrés Messi\" World Cup breakthrough",
          "resultCount": 2
        }
      ],
      "breakthroughs": [
        {
          "url": "https://www.fifa.com/en/articles/lionel-messi-quiz-inter-miami-argentina",
          "title": "Take the Lionel Messi quiz",
          "contentLength": 3000,
          "hasBreakthrough": true,
          "keywords": ["iconic", "star"],
          "sentences": []
        }
      ]
    }
  ]
}
```

## Notes

1. **Scale**: With 1248 players, a full search will take several hours. Use `--limit` for testing.
2. **Cache**: Use `--resume` to continue from where you left off.
3. **Rate Limiting**: The scripts include delays to be respectful to FIFA.com's servers.
4. **Results Quality**: FIFA.com search results may include some irrelevant content. The scripts filter out navigation links and focus on article content.

## Example Commands

```bash
# Test with a few players from Argentina
python scripts/fetch-fifa-player-breakthroughs-final.py --team ARG --limit 5

# Search all forwards
python scripts/fetch-fifa-player-breakthroughs-final.py --position FW --limit 20

# Full search (will take several hours)
python scripts/fetch-fifa-player-breakthroughs-final.py
```
