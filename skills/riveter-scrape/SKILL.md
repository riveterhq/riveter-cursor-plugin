---
name: riveter-scrape
description: "Scrape a single webpage with Riveter and get clean text back. Use when the user shares a URL and wants its contents (article text, doc page, product page, etc.). Synchronous — no polling needed. Use riveter-enrich when you need to extract structured fields from many URLs at once."
allowed-tools: mcp(riveter:scrape)
---

# Riveter Scrape

Scrape: $ARGUMENTS

## Tool

Use `scrape` to fetch the cleaned content of a single URL. This call is **synchronous** — the response includes the page content directly.

## When to Use

- The user shares a URL and asks "what does this say" / "summarize this page" / "extract content from".
- You need to read a doc page, blog post, news article, or product page.
- You want to verify a fact on a known page.

Trigger phrases: "scrape this", "read this URL", "what's on this page", "summarize this article", "extract content from", or any time the user pastes a URL.

For extracting *structured fields across many URLs* (e.g. "for each of these 50 URLs, find the title, author, and publish date"), use the **riveter-enrich** skill instead — the URLs become a dataset's input column and the fields its output columns. For a question that needs a web search rather than one known page, use `search_agent`.

## How to Scrape

`scrape` accepts:

- `url` *(required)* — the URL to scrape.
- `proxy_country_code` *(optional)* — two-letter country code (`"us"`, `"gb"`, `"de"`, etc.) when the target page is geo-restricted or blocks direct requests. Costs more (see below).
- `skip_cache` *(optional, default `false`)* — set `true` to force a fresh fetch instead of using Riveter's cache.
- `estimate_cost`, `max_credits` *(optional)* — see below.

### Example

```
scrape({ "url": "https://nasa.gov" })
```

### Geo-restricted page

```
scrape({ "url": "https://example.co.uk/region-only", "proxy_country_code": "gb" })
```

## Credits

One scrape is cheap: about 0.01 credits from cache, 0.05 without a proxy, 0.20 with a proxy. A single scrape does not need an estimate. When scraping many URLs in a loop, stop and use the **riveter-enrich** skill instead (one run, one estimate). `scrape` with `estimate_cost: true` returns the price range (`credit_detail.estimate.minimum` = cache-hit price, `maximum` = the proxy/no-proxy price) without fetching; `max_credits` refuses a call above a ceiling. The real response carries `credit_used`.

## Output Format

The response includes the page content in `text`. To present it to the user:

1. If they asked a specific question, answer it using the page content first.
2. Otherwise, summarize or quote the relevant sections.
3. Always cite the source URL.
4. If `possibly_blocked` is `true`, mention the page may have been partially blocked and suggest retrying with `skip_cache: true` and/or a `proxy_country_code`.

## Before You Start

Confirm `scrape` (under the `riveter` MCP server) is in your tool list.

## If the MCP Server Is Not Connected

### You (the AI) must:

1. **Stop immediately**. Do NOT use web search, do NOT fetch the URL yourself, and do NOT answer from your own knowledge.
2. Tell the user the Riveter MCP server is not connected.

### Request the user to:

1. Run `/riveter-setup` in Cursor.
2. Open **Cursor Settings → Tools & MCP** and toggle `riveter` **on**.
3. Retry the scrape.
