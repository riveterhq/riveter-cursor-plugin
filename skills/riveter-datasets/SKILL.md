---
name: riveter-datasets
description: "Generate rows of data from a natural-language description, or read and change an existing Riveter dataset (rows, columns, cells, export). Use when the user wants a list (top 100 companies, all YC W24 startups, competitors of X) and doesn't have the inputs, or names a dataset (ds_...). Estimates paid steps first."
allowed-tools: mcp(riveter:build_dataset), mcp(riveter:build_dataset_rows), mcp(riveter:list_datasets), mcp(riveter:get_dataset), mcp(riveter:update_dataset), mcp(riveter:delete_dataset), mcp(riveter:list_dataset_rows), mcp(riveter:get_dataset_summary), mcp(riveter:add_dataset_rows), mcp(riveter:import_dataset_rows), mcp(riveter:delete_dataset_rows), mcp(riveter:update_dataset_row), mcp(riveter:promote_dataset_column), mcp(riveter:export_dataset), mcp(riveter:enrich), mcp(riveter:build_configured_dataset), mcp(riveter:get_run), mcp(riveter:get_run_result), mcp(riveter:stop_run), mcp(riveter:help)
---

# Riveter Datasets

Work on a dataset for: $ARGUMENTS

A dataset (`ds_...`) is a grid Riveter keeps: input columns (row identity — values you send or Riveter generates) and output columns (cells an enrichment fills). Rows are `row_...`; positions count from 1. Columns are addressed by name. The user sees the grid at the dataset's `app_url`.

## Tools

| Tool | Does | Paid? |
|---|---|---|
| `build_dataset` | a new dataset: rows you send (`rows`) or rows Riveter generates (`prompt` + `count`) | generating rows |
| `build_dataset_rows` | more generated rows for an existing dataset | yes |
| `list_datasets` / `get_dataset` | the account's datasets; one dataset's columns, `enrichment_id`, `row_count`, newest `runs` | no |
| `list_dataset_rows` | rows in position order with every cell's `value` and `state` and the row's `credits`; page with `cursor`. `columns` keeps the named columns; `compact: true` answers the values alone, so a whole column of 1,000 rows is one call | no |
| `get_dataset_summary` | per-column counts without reading rows: an output column's cells by state, `filled`, `distinct_values`, the top `values` | no |
| `add_dataset_rows` / `import_dataset_rows` | append rows as JSON objects (100 per call) or as CSV text | no |
| `update_dataset` | rename, set `index_column`, add / rename / remove input columns, add / change / rename / remove output columns, set `budget` / `budget_locked` | no |
| `update_dataset_row` | one row by id or position: `input` values and / or `cells` (`manual` cells; `null` clears) | no |
| `promote_dataset_column` | an output column becomes an input column, values moving with it | no |
| `delete_dataset_rows` / `delete_dataset` | remove rows by `ids` and / or `positions` (100 per call) / the whole dataset | no |
| `export_dataset` | the grid as a file (`output_format` `csv`, `xlsx`, or `jsonl`) | no |
| `enrich` with `dataset_id` | fill cells — see the **riveter-enrich** skill | yes |
| `help` | `datasets`, `datasets_vs_enrichment`, `credits`, `limits` | no |

## When to Use

- The user wants a *list* but doesn't have it yet: "top 100 SaaS companies", "all YC W24 startups", "competitors of Stripe".
- The user wants both the list **and** researched columns.
- The user names a dataset and wants to read it, add rows, change columns, fix a cell, re-run cells, or export it.

If the user *already has* the rows and wants new columns, the **riveter-enrich** skill covers the whole flow (it creates the dataset with `rows`).

## Generating Rows

**A build finds rows. It does not research them.** The generated rows carry the input columns only; `attributes` name the output columns a fill researches afterwards (`auto_fill: true` starts that fill when the rows land, or `enrich` with `dataset_id` later).

`build_dataset` with:

- `name` — a short name.
- `prompt` — what the rows are, e.g. *"Top 50 venture-backed AI infrastructure companies founded after 2020"*. Put constraints in the prompt ("US-based", "founded after 2020").
- `count` — how many rows to generate.
- `input_columns` — what identifies a row, e.g. `["Company", "Website"]`. Omitted, Riveter names them from the prompt. The first is the `index_column`: duplicates skipped.
- `attributes` — output columns for the fill, e.g. `["CEO", "Total Funding"]`. Or `enrichment_id` to bind a saved enrichment.
- `auto_fill` — fill the attributes as soon as the rows land (a second paid run).
- `webhook_url` — POST when the build finishes; `fill_webhook_url` — when the auto fill finishes.
- `estimate_cost`, `max_credits` — see below.

```
build_dataset({
  "name": "AI infra 2020+",
  "prompt": "Top 50 venture-backed AI infrastructure companies founded after 2020",
  "count": 50,
  "input_columns": ["Company", "Website"],
  "attributes": ["CEO", "Total Funding", "HQ City"],
  "auto_fill": true
})
```

The response is the dataset plus `run` (the build run, `run_...`). More rows later:

```
build_dataset_rows({ "id": "ds_...", "prompt": "Also include Canadian companies", "count": 25 })
```

The generator knows the existing rows and skips them. The run's `progress` reports `requested_rows`, `generated_rows`, `added_rows`, `skipped_duplicate_rows`.

## Estimate First (credits cost real money)

A build runs on a credit **budget**: `budget` on the request, else 50 + 1.5 per row requested (10–5,000). A deposit of the expected spend (`upfront` / `expected`) is charged when it starts; the rest is charged as it runs, up to the budget; unused deposit is refunded. A low budget means fewer rows. With `auto_fill: true` the fill is a second charge (rows × the per-row budget, 1.5 credits per output column by default).

Before the real call, when `count` is more than a handful (roughly > 50) or the user asks about cost, send the **same** request with `estimate_cost: true`:

```
build_dataset({ "name": "AI infra 2020+", "prompt": "Top 50 venture-backed AI infrastructure companies founded after 2020", "count": 50, "estimate_cost": true })
```

The response is `{ "estimate_cost": true, "type": "dataset_build", "credit_detail": { "estimate": { "minimum", "maximum", "expected", "upfront", "typical": { "low", "high" }, "charged_upfront": true }, "credits_used": 0, "credits_remaining", "sufficient_credits" } }`. `upfront` / `expected` is charged now; `typical` is the recent range; `maximum` is the budget. Nothing is created or charged. Tell the user charged now, typically, at most, and `credits_remaining`, and wait for a go-ahead. If `sufficient_credits` is false, stop and say so. When the user names a ceiling, pass it as `budget` on the real call (the build spends at most that); `max_credits` instead refuses the call when the estimate is higher.

Adding rows (`rows`, `add_dataset_rows`, `import_dataset_rows`) and changing columns are free.

## Async Workflow

1. Call `build_dataset`. Capture the dataset `id` (`ds_...`) and `run.id` (`run_...`).
2. Call `get_run_result({ "id": "run_...", "wait": 50 })`. Repeat while `status` is `pending`, `enqueued`, or `processing`.
3. When `status` is `success`, call `list_dataset_rows({ "id": "ds_..." })` for the rows (the build run's `output` is columnar; the grid is the source of truth). With `auto_fill`, `get_dataset` lists the fill among `runs`; poll it the same way and read the cells from `list_dataset_rows`.
4. Without `auto_fill`, when the user wants columns: `enrich({ "dataset_id": "ds_..." })` per the **riveter-enrich** skill — estimate first.
5. Present the table with the dataset `id`, the run id(s), and `credits_used`.

## Working on an Existing Dataset

```
get_dataset({ "id": "ds_..." })
list_dataset_rows({ "id": "ds_...", "limit": 100 })
list_dataset_rows({ "id": "ds_...", "columns": "Company,CEO", "compact": true, "limit": 1000 })
get_dataset_summary({ "id": "ds_...", "columns": "CEO" })
add_dataset_rows({ "id": "ds_...", "rows": [{ "Company": "Shopify", "Website": "shopify.com" }] })
import_dataset_rows({ "id": "ds_...", "csv": "Company,Website\nStripe,stripe.com\n" })
```

Change columns (a changed prompt makes the column's cells `stale`; the next fill re-runs them):

```
update_dataset({
  "id": "ds_...",
  "output": {
    "CEO": { "prompt": "Full name of the current CEO" },
    "Employee count": { "prompt": "Headcount as an integer", "output_schema": { "type": "integer" } },
    "HQ City": { "delete": true }
  }
})
```

Add an input column and make it the index column:

```
update_dataset({ "id": "ds_...", "input_columns": { "Ticker": {} }, "index_column": "Ticker" })
```

Fix one row by position (`row_id` is a `row_...` id or a 1-based position):

```
update_dataset_row({ "id": "ds_...", "row_id": "3", "input": { "Website": "apple.com" }, "cells": { "CEO": "Tim Cook", "HQ City": null } })
```

Remove rows, export:

```
delete_dataset_rows({ "id": "ds_...", "positions": [4, 5] })
export_dataset({ "id": "ds_...", "output_format": "csv" })
```

While a fill runs, column edits answer `dataset_in_use` / `enrichment_in_use` (409): wait for it or `stop_run`.

## Configured list builds

`build_configured_dataset` runs a pre-configured template (`cds_...`) with `parameters`; the rows land in the dataset the run's `dataset_id` names, and `enrich` with it fills columns. It takes `estimate_cost` / `max_credits`. Always generate rows with `prompt` + `count` and `build_dataset_rows`; never send `max_items`, which is the retired list-build body.

## Output Format

Render the rows as a markdown table. If a fill finished, show the filled columns. Always include the ids:

> Dataset: `ds_abc-123` (open in Riveter) · build run `run_abc-123`. Credits used: 200.

## Before You Start

Confirm `build_dataset` and `list_dataset_rows` (under the `riveter` MCP server) are in your tool list.

## If the account has not migrated to Datasets

Every tool above answers `feature_not_enabled` (403). Stop retrying. Tell the user to open Datasets in the Riveter app (https://app.riveterhq.com/v2/datasets) and click "Migrate to Datasets"; the tools work once the copy completes.

## If the MCP Server Is Not Connected

### You (the AI) must:

1. **Stop immediately**. Do NOT generate the list yourself, do NOT use web search, and do NOT fabricate rows.
2. Tell the user the Riveter MCP server is not connected.

### Request the user to:

1. Run `/riveter-setup` in Cursor.
2. Open **Cursor Settings → Tools & MCP** and toggle `riveter` **on**.
3. Retry the request.
