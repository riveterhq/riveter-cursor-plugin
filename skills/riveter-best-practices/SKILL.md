---
name: riveter-best-practices
description: "Reference guide for Riveter MCP tools. Covers tool selection, datasets vs. one-off enrichment, the async run pattern, credit estimates (estimate_cost / max_credits), monitors, and troubleshooting. Read this when you're about to use any riveter:* tool and want a quick map of which tool does what."
---

# Riveter Best Practices

Riveter has three core primitives:

- **Datasets** (`ds_...`) — grids Riveter keeps: input columns (row identity) and output columns (cells an enrichment fills). Rows you send or rows Riveter generates from a prompt.
- **Enrichments** (`enr_...`) — the column configuration: a task prompt, output columns with their prompts, the tools, a per-row budget. Every dataset has one; a saved one can be shared.
- **Runs** (`run_...`) — one execution: a fill, a build, an extraction, a monitor run.

The MCP server exposes the [Riveter API](https://docs.riveterhq.com) as tools. Every tool name is the snake_case version of the OpenAPI `operationId` (`getRunResult` → `get_run_result`). Ids carry a prefix: runs `run_...`, enrichments `enr_...`, datasets `ds_...`, rows `row_...`, extractions `ext_...`, monitors `mon_...`, configured datasets `cds_...`.

## Tool Selection

| Need | Tool | When |
|------|------|------|
| Enrich rows the user has | `build_dataset` with `rows` + `attributes`, then `enrich` with `dataset_id` | The preferred flow: rows and cells are kept, the user sees the grid in the app, a later fill runs only what changed. Skill: **riveter-enrich** |
| Enrich rows once, nothing kept | `enrich` with inline `input` | A one-off; config from `enrichment_id`, `prompt` + `attributes`, or `output` |
| Generate a list of rows from a prompt | `build_dataset` with `prompt` + `count` | "Give me the top 100 SaaS companies". Skill: **riveter-datasets** |
| More generated rows for a dataset | `build_dataset_rows` | The generator skips rows the dataset already has |
| Read a dataset | `list_datasets`, `get_dataset`, `list_dataset_rows`, `get_dataset_summary` | Columns, `enrichment_id`, `row_count`, `runs`; rows with cell `value` + `state` (`columns` + `compact` for a whole column); per-column counts |
| Add rows | `add_dataset_rows` (JSON, 100 per call), `import_dataset_rows` (CSV text) | Free |
| Change columns | `update_dataset` | Add / change / rename / remove input and output columns, `index_column`, `budget` / `budget_locked`. Free; does not run |
| Fix one row | `update_dataset_row` | `input` values and / or `cells` by id or position |
| Output column → input column | `promote_dataset_column` | Values move with it |
| Remove rows / dataset | `delete_dataset_rows`, `delete_dataset` | Rows by `ids` and / or `positions` |
| Download a dataset | `export_dataset` | `output_format` `csv`, `xlsx`, `jsonl` |
| Saved enrichments | `list_enrichments`, `get_enrichment`, `create_enrichment`, `update_enrichment`, `delete_enrichment` | Compact list; the columns; save a recipe (comes with an empty dataset); change columns; delete |
| Which tools a column may use | `list_tools` | Names, prices, whether the account may use each, the budget defaults |
| Check a run | `get_run` | Status + progress + `credit_detail` |
| Get a run's results | `get_run_result` | Pass `wait: 50` to long-poll; `output` is null until finished |
| Stop a run | `stop_run` | Wrong inputs, taking too long |
| Runs history / counts | `list_runs`, `runs_summary` | Filter by `type`, `status`, `enrichment_id`, `monitor_id` |
| Scrape a webpage | `scrape` | One URL → clean text. Synchronous |
| One search query → results | `quick_search` | Titles, links, snippets. Synchronous |
| One research question → one answer | `search_agent` | Same agent that fills one cell. Synchronous (long-polls) |
| Structured records from a hard website | `create_extraction` → `get_extraction` → `run_extraction` | Pagination, filters. Discovery is a paid one-time step |
| Fill a dataset again on a schedule | `create_monitor` with `dataset_id` | "Keep this dataset fresh every Monday" |
| Inspect / pause / resume a monitor | `list_monitors`, `get_monitor`, `update_monitor`, `list_monitor_runs` | Existing monitors |
| Account / credits | `get_account` | Balance and quota questions |
| Configured list build | `build_configured_dataset` | A pre-configured template (`cds_...`) with `parameters`; the rows land in the dataset the run's `dataset_id` names |
| Reference docs | `help` | Topics: `overview`, `enrich_modes`, `column_config`, `run_when`, `formats`, `tools`, `examples`, `credits`, `datasets_vs_enrichment`, `datasets`, `pinned_columns`, `output_schema`, `limits`, `webhooks`, `monitors`, `errors` |

## Credits: estimate before you spend (memorize this)

Every paid tool (`enrich`, `build_dataset` with `prompt` + `count`, `build_dataset_rows`, `build_configured_dataset`, `create_extraction`, `run_extraction`, `create_monitor`, `quick_search`, `search_agent`, `scrape`) accepts two optional fields:

- `estimate_cost: true` — validates the request and returns `{ "estimate_cost": true, "type", "credit_detail": { "estimate": { "minimum", "maximum", "charged_upfront" }, "credits_used": 0, "credits_remaining", "sufficient_credits" } }`. Nothing is created or charged.
- `max_credits` — a ceiling. When the estimate's `maximum` exceeds it, the call is refused with `credit_cap_exceeded` and nothing is charged.

Rules:

1. For anything larger than a handful of rows (roughly > 50), or whenever the user asks what something costs, call the tool with `estimate_cost: true` **first**. Show the user `estimate.maximum`, `credits_remaining`, and `sufficient_credits`, then wait for a go-ahead before the real call.
2. When the user names a budget, pass it as `max_credits` on the real call. `max_credits` alone also works as the check: the API runs the call when the estimate fits and refuses it with the estimate otherwise.
3. When the user says to run without a cost check, run it without `max_credits`; `insufficient_credits` is the backstop.
4. `maximum` is the contract — a run never charges more. `minimum` is 0 when cells can skip. `charged_upfront` is true for builds and extractions, false for fills and searches.
5. `create_monitor` is free itself; its estimate is for **one** tick (every row of the dataset with an input value), and every tick charges that again.
6. Every run also carries `credit_detail` on kickoff and on `get_run`. Report `credits_used` when a run finishes.

Creating datasets, adding rows, and changing columns are free.

Rough pricing: a fill is at most the enrichment's `budget_credits_per_row` per row (1.5 credits per output column by default; the budget moves with the columns unless `budget_locked`); a build = at most its budget (`budget` on the request, else 50 + 1.5 per row), with a deposit of `expected` charged now and the rest charged as it runs; `search_agent` = 1 per call; `quick_search` and `scrape` are fractional. Use `estimate_cost` for exact numbers, or call `help({ "topic": "credits" })`.

## Async pattern

Every kickoff (`enrich`, `build_dataset` with `count`, `run_extraction`, ...) returns a run (`build_dataset` returns the dataset with the run under `run`):

1. Capture `id` (`run_...`). Tell the user the run started.
2. Call `get_run_result({ "id": "run_...", "wait": 50 })`. The request holds up to 50 seconds and returns as soon as the run finishes. Repeat while `status` is `pending`, `enqueued`, or `processing`. Do not call `get_run` more than every 10–20 seconds.
3. When `status` is `success`, read `output`. When `status` is `stopped`, read `error` / `stopped_reason` and surface it.
4. If the user can wait minutes/hours, pass `webhook_url` and skip polling.

Typical run takes **10–120 seconds**. `output` of a fill on a dataset is `{ "rows": [...] }` — the rows the fill ran, each with `input`, `cells` (`value` + `state` per column), `credits`; `list_dataset_rows` reads the whole grid. `output` of a run on inline `input` or of a build run is columnar: `{ "Company": [{ "value": "Apple" }, ...], "CEO": [{ "value": "Tim Cook" }, ...] }`. A response with a `legacy` key (`notice`, `successor`, `docs`) reached the legacy pipeline through a legacy id; it still worked, and `successor` says what to call instead.

## Defining columns

On a dataset: `attributes` on `build_dataset` names the columns; `update_dataset` `output` gives each a `prompt`, an `output_schema` (a JSON Schema for the value; inferred for plain values when you give none), or a pinned `tool` (one call of it per row is the cell). `enrich` carries the task `prompt` for the row. Call `help` with `column_config`, `output_schema`, or `pinned_columns` before writing hard columns.

On inline `input`, three modes, in order of preference: `enrichment_id` (a saved recipe; up to 10,000 rows), `prompt` + `attributes` (Riveter drafts the columns; up to 1,000 rows), `output` (a full per-column spec; up to 1,000 rows).

## Input data shape

A dataset row is an object keyed by input column name: `{ "Company": "Apple", "Country": "USA" }`. Inline `input` is columnar — keys are headers, values equal-length arrays of strings:

```json
{
  "Company": ["Apple", "Google", "Microsoft"],
  "Country": ["USA", "USA", "USA"]
}
```

## Citation Standards

When presenting enriched data to the user:

- Lead with a clean table (or the format the user asked for) using each cell's `value`.
- Quote the dataset `id` and the run `id` so the user can open the grid or re-fetch results later.
- Report `credits_used` from the finished run.
- If results include source URLs, include them inline.
- Never invent values — show a `not_found` cell as empty; its row's `not_found_reason` says what the agent looked for.

## Troubleshooting

- **Tools not available**: Run `/riveter-setup`, confirm the `riveter` MCP server is enabled in **Cursor Settings → Tools & MCP**, and verify `RIVETER_API_KEY` is set in `.cursor/mcp.json`.
- **401 / "API key required"**: The `RIVETER_API_KEY` env var on the MCP server is missing or invalid. Re-run `/riveter-setup` and paste a fresh key from https://app.riveterhq.com/settings/api.
- **`feature_not_enabled` (403)**: The account has not migrated to Datasets. Stop retrying; tell the user to open https://app.riveterhq.com/v2/datasets and click "Migrate to Datasets". `enrich` with inline `input` works meanwhile.
- **`insufficient_credits`**: The response's `credit_detail` shows `credits_remaining`. Tell the user; do not retry.
- **`credit_cap_exceeded`**: The estimate was above `max_credits`. Show the estimate and ask whether to raise the cap or shrink the request.
- **`dataset_in_use` / `enrichment_in_use` / `row_in_use` (409)**: A fill is running on it. Wait for the run or `stop_run`, then retry.
- **Run stuck in `enqueued` for >2 minutes**: Check `get_run` for `progress`; if nothing moves, `stop_run` and retry.
- **Empty results**: Inspect the run with `get_run` — the `error` field usually explains why. On a dataset, `list_dataset_rows` shows each cell's `state` (`not_found`, `failed` with `reason` and `error`).
- **An error names a limit**: Call `help({ "topic": "limits" })` or `help({ "topic": "errors" })`.
