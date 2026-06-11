"""
Search FIFA.com directly for player breakthrough performances.
This script uses Playwright to search FIFA.com's search functionality.
"""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "outputs" / "fifa-search-results.json"


async def search_fifa_direct():
    """Search FIFA.com directly for player content."""
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        # Test search queries
        search_queries = [
            "One to watch 2026",
            "World Cup 2026 breakthrough players",
            "World Cup 2026 debut",
        ]

        for query in search_queries:
            try:
                print(f"\nSearching FIFA.com for: {query}")

                # Try FIFA.com search
                search_url = f"https://www.fifa.com/search?q={query.replace(' ', '+')}"
                await page.goto(search_url, wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(3000)

                # Get page content
                content = await page.content()
                print(f"  Page loaded, length: {len(content)}")

                # Try to extract search results
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

                    return results.slice(0, 10);
                }""")

                if search_results:
                    for result in search_results:
                        results.append({
                            **result,
                            'query': query,
                            'source': 'fifa.com'
                        })
                        print(f"  Found: {result.get('title', 'No title')}")
                        print(f"  URL: {result.get('url', 'No URL')}")
                else:
                    print("  No results found with standard selectors")

                    # Try to get any links on the page
                    links = await page.evaluate("""() => {
                        const links = [];
                        document.querySelectorAll('a[href]').forEach(a => {
                            if (a.href && a.textContent.trim()) {
                                links.push({
                                    url: a.href,
                                    text: a.textContent.trim().substring(0, 100)
                                });
                            }
                        });
                        return links.slice(0, 20);
                    }""")

                    if links:
                        print(f"  Found {len(links)} links on page")
                        for link in links[:3]:
                            print(f"    - {link['text']}: {link['url']}")

            except Exception as e:
                print(f"  Error: {e}")

        await browser.close()

    # Save results
    output = {
        "searchType": "fifa_direct_search",
        "queries": search_queries,
        "results": results,
        "totalFound": len(results)
    }

    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nSaved {len(results)} results to {OUTPUT_PATH}")
    return output


if __name__ == "__main__":
    asyncio.run(search_fifa_direct())
