"""
Search FIFA.com for "One to watch" 2026 World Cup players.
This script uses Playwright to automate browser searches.
"""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "outputs" / "fifa-one-to-watch-2026.json"


async def search_fifa_one_to_watch():
    """Search FIFA.com for 'One to watch' 2026 articles."""
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        # Search Google for FIFA "One to watch" 2026
        search_queries = [
            'site:fifa.com "One to watch" 2026 FIFA World Cup',
            'site:fifa.com "ones to watch" 2026 World Cup players',
            'site:fifa.com "breakthrough" 2026 World Cup players',
        ]

        for query in search_queries:
            try:
                print(f"\nSearching: {query}")
                await page.goto(f"https://www.google.com/search?q={query}", wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(2000)

                # Extract search results
                search_results = await page.evaluate("""() => {
                    const results = [];
                    const items = document.querySelectorAll('div.g');
                    items.forEach(item => {
                        const link = item.querySelector('a');
                        const title = item.querySelector('h3');
                        const snippet = item.querySelector('.VwiC3b');
                        if (link && title) {
                            results.push({
                                url: link.href,
                                title: title.textContent,
                                snippet: snippet ? snippet.textContent : ''
                            });
                        }
                    });
                    return results;
                }""")

                for result in search_results[:5]:  # Top 5 results per query
                    if 'fifa.com' in result.get('url', ''):
                        results.append(result)
                        print(f"  Found: {result['title']}")
                        print(f"  URL: {result['url']}")

            except Exception as e:
                print(f"  Error: {e}")

        await browser.close()

    # Save results
    output = {
        "searchType": "one_to_watch_2026",
        "queries": search_queries,
        "results": results,
        "totalFound": len(results)
    }

    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nSaved {len(results)} results to {OUTPUT_PATH}")
    return output


if __name__ == "__main__":
    asyncio.run(search_fifa_one_to_watch())
