---
name: riveter-best-practices
description: "Reference guide for Riveter MCP tools. Covers tool selection, async run patterns, dataset building vs enrichment, monitors, and troubleshooting. Read this when you're about to use any riveter:* tool and want a quick map of which tool does what."
---

# Riveter Best Practices

Riveter has two core primitives:

- **Datasets** — collections of rows (companies, people, URLs, anything). You can generate them from a natural-language prompt.
- **Enrichments** — fill in new columns on rows of input data using AI, web scraping, and other tools.

The MCP server exposes the full [Riveter API](https://docs.riveterhq.com) as tools. Every tool name is the snake_case version of the OpenAPI `operationId` (for example `runNewEnrichment` → `run_new_enrichment`).

## Tool Selection

| Need | Tool | When |
|------|------|------|
| Run an AI enrichment in one shot | `run_new_enrichment` | You have input rows + want new columns generated |
| Re-run an enrichment built in the UI | `run_existing_enrichment` | You already configured the enrichment at app.riveterhq.com and just want to feed new inputs |
| Generate a list of rows from a prompt | `build_dataset` | "Give me the top 100 SaaS companies with revenue + CEO" |
| Generate rows that match an existing enrichment's input schema | `build_dataset_from_enrichment` | You have an enrichment but need fresh input rows |
| Check progress of an async run | `get_run_status` | After any `run_*` call |
| Get final results of a finished run | `get_run_data` | When status is `success` |
| Stop a run | `stop_run` | Wrong inputs, taking too long, etc. |
| Check progress of a dataset build | `get_dataset_build_status` | After `build_dataset` |
| Get rows from a finished dataset build | `get_dataset_build_data` | When state is `completed` |
| Wire a built dataset into a new enrichment | `create_enrichment_from_dataset` → `run_enrichment_from_dataset` | After a build completes and you want to enrich it |
| Scrape a webpage | `scrape` | One-off URL → clean text/markdown |
| Schedule a recurring enrichment | `monitor_enrichment` | "Re-run this enrichment every Monday" |
| Inspect / pause a monitor | `get_monitor_status`, `get_monitor_recent_run_data`, `pause_monitor` | Existing monitors |
| API usage / quota | `get_api_stats`, `get_account` | Debugging or quota questions |

## Async pattern (memorize this)

Almost every Riveter run is asynchronous. The pattern is always the same:

1. Call the kickoff tool (`run_new_enrichment`, `run_existing_enrichment`, `build_dataset`, `run_enrichment_from_dataset`, etc.)
2. The response includes a `run_key` (or for builds, a `run_key` you pass to the build status tool).
3. Poll the matching status tool every **5–10 seconds**:
   - Enrichment runs → `get_run_status`
   - Dataset builds → `get_dataset_build_status`
4. When `status` is `success` (runs) or `state` is `completed` (builds), call the matching data tool:
   - Enrichment runs → `get_run_data`
   - Dataset builds → `get_dataset_build_data`
5. If the user can wait minutes/hours, suggest passing `webhook_url` (for runs) or `dataset_webhook_url` (for builds) to skip polling entirely.

Typical run takes **10–120 seconds**. Don't spam the status tool — 5 second intervals are plenty.

## Defining enrichments: prompt + attributes vs full output

When calling `run_new_enrichment`, prefer **prompt + attributes** over the full `output` specification:

- `prompt`: natural-language description of what to enrich (e.g. "For each company, find its CEO, latest funding round, and headquarters city")
- `attributes`: array of output column names (e.g. `["CEO", "Latest Funding", "HQ City"]`)

Riveter generates the per-column prompts, contexts, tools, and formats automatically. Only fall back to the full `output` spec when you need pixel-perfect control over a specific column's behavior.

## Input data shape

Input data is always a JSON object where keys are column headers and values are arrays of strings, all the same length:

```json
{
  "Company": ["Apple", "Google", "Microsoft"],
  "Country": ["USA", "USA", "USA"]
}
```

Up to **1,000 rows per request**. Default rate limit is **30 requests/minute**.

## Citation Standards

When presenting enriched data to the user:

- Lead with a clean table (or the format the user asked for) using the values from `formatted_data`.
- Quote the `run_key` so the user can re-fetch results with `get_run_data` later.
- If results include source URLs, include them inline.
- Never invent values — if a cell came back empty, show it as empty.

## Troubleshooting

- **Tools not available**: Run `/riveter-setup`, confirm the `riveter` MCP server is enabled in **Cursor Settings → Tools & MCP**, and verify `RIVETER_API_KEY` is set in `.cursor/mcp.json`.
- **401 / "API key required"**: The `RIVETER_API_KEY` env var on the MCP server is missing or invalid. Re-run `/riveter-setup` and paste a fresh key from https://app.riveterhq.com/settings/api.
- **Run stuck in `queued` for >2 minutes**: Check `get_api_stats` for quota issues, then `stop_run` and retry.
- **Empty results**: Inspect the run with `get_run_status` — the `error` field usually explains why. Re-run with a more specific `prompt` or smaller input.
- **Rate limited**: Default is 30 req/min. Batch up to 1,000 rows in a single `run_new_enrichment` call instead of looping.
