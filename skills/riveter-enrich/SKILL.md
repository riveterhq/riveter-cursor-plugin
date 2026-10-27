---
name: riveter-enrich
description: "Run an AI enrichment on rows of input data using Riveter. Use whenever the user has a list of companies, people, URLs, or any rows and wants to fill in new columns (revenue, CEO, summary, contact info, classification, etc.). Puts the rows in a dataset, estimates the cost, fills the cells, polls, and returns the rows."
allowed-tools: mcp(riveter:build_dataset), mcp(riveter:add_dataset_rows), mcp(riveter:import_dataset_rows), mcp(riveter:update_dataset), mcp(riveter:enrich), mcp(riveter:list_dataset_rows), mcp(riveter:get_dataset), mcp(riveter:list_enrichments), mcp(riveter:get_enrichment), mcp(riveter:create_enrichment), mcp(riveter:update_enrichment), mcp(riveter:get_run), mcp(riveter:get_run_result), mcp(riveter:stop_run), mcp(riveter:help)
---

# Riveter Enrichment

Run an AI enrichment for: $ARGUMENTS

## Tools

- `build_dataset` — a new dataset (`ds_...`) with the rows you send (`rows`, free) and the output columns to fill (`attributes`, or a saved `enrichment_id`).
- `add_dataset_rows` / `import_dataset_rows` — more rows, as JSON objects or CSV text (free).
- `update_dataset` — add / change / rename / remove output columns, change input columns, set the per-row `budget` (free; does not run).
- `enrich` — the one way to fill cells. Rows from `dataset_id` (preferred) or inline `input`; config from the dataset's own columns, a saved `enrichment_id`, `prompt` + `attributes`, or `output`.
- `list_dataset_rows` — the grid: every row's `input`, each cell's `value` and `state`, the row's `credits`. Page with `cursor`.
- `get_dataset` — columns, `enrichment_id`, `row_count`, the newest `runs`.
- `list_enrichments` / `get_enrichment` / `create_enrichment` / `update_enrichment` — saved enrichments (`enr_...`): find one, read its columns, save a new recipe, change one.
- `get_run_result` — status plus `output`; pass `wait: 50` to long-poll. `get_run` — status and progress only. `stop_run` — cancel.
- `help` — reference docs (`datasets`, `enrich_modes`, `column_config`, `output_schema`, `pinned_columns`, `credits`, `limits`, `errors`).

## When to Use

- The user gives you a list of rows (companies, people, URLs, domains, anything) and wants new columns generated.
- The user describes a research task per row: "for each of these companies find their CEO and latest funding round".
- The user references a saved enrichment by id and wants to feed in new inputs.
- The user has a dataset (`ds_...`) and wants its cells filled or re-run.

Trigger phrases: "enrich this list", "for each of these…", "find me the X for each Y", "look up X for these companies", "research each of these".

If the user has *no* input list yet and wants to generate one, use the **riveter-datasets** skill (`build_dataset` with `prompt` + `count`). For one question about one thing, use `search_agent`.

## How to Run an Enrichment

**Put the rows in a dataset, then fill it.** The rows and every filled cell are kept, one agent researches each row's columns together, a later fill runs only what is new or changed, and the user sees the grid at the dataset's `app_url` in the Riveter app.

### 1. Create the dataset (free)

`build_dataset` with:

- `name` — a short name for the dataset.
- `input_columns` — the row identity columns, e.g. `["Company", "Website"]`. The first is the `index_column`: rows unique on it, duplicates skipped.
- `rows` — up to 100 objects keyed by input column name. More through `add_dataset_rows` (100 per call) or `import_dataset_rows` (CSV text).
- `attributes` — the output column names to fill, e.g. `["CEO", "Total Funding", "HQ City"]`. Or `enrichment_id` to bind a saved enrichment's columns instead.

```
build_dataset({
  "name": "AI labs",
  "input_columns": ["Company"],
  "rows": [{ "Company": "OpenAI" }, { "Company": "Anthropic" }, { "Company": "Mistral" }],
  "attributes": ["CEO", "Total Funding", "Flagship Model"]
})
```

The response is the dataset: `id` (`ds_...`), `enrichment_id`, `input_columns`, `output_columns`, `row_count`, `app_url`.

To give a column a precise prompt or a typed value, follow with `update_dataset`:

```
update_dataset({
  "id": "ds_...",
  "output": {
    "CEO": { "prompt": "Full name of the current CEO" },
    "Total Funding": { "prompt": "Total funding raised to date, in USD", "output_schema": { "type": "number", "description": "USD" } }
  }
})
```

Call `help({ "topic": "column_config" })` before writing prompts for hard columns and `help({ "topic": "output_schema" })` for typed values. A column may pin a tool (`"tool": "linkedin_person_profile"`) so one call of it per row is the cell — `help({ "topic": "pinned_columns" })`.

### 2. Estimate the fill (credits cost real money)

```
enrich({ "dataset_id": "ds_...", "prompt": "For each AI lab, find the CEO, total funding raised to date, and their flagship model.", "estimate_cost": true })
```

The response is `{ "estimate_cost": true, "type": "enrichment", "credit_detail": { "estimate": { "minimum", "maximum", "charged_upfront" }, "credits_used": 0, "credits_remaining", "sufficient_credits" } }`. Nothing runs or is charged. `maximum` is rows × the enrichment's `budget_credits_per_row` (1.5 credits per output column by default). Tell the user "up to N credits" and `credits_remaining`, and wait for a go-ahead when the fill is more than a handful of rows or the user asked about cost. If `sufficient_credits` is false, stop and say so.

When the user names a budget, pass it as `max_credits` on the real call; a `credit_cap_exceeded` error means the estimate was above it. When the user says to run without a cost check, run it without `max_credits`.

### 3. Fill (paid)

```
enrich({ "dataset_id": "ds_...", "prompt": "For each AI lab, find the CEO, total funding raised to date, and their flagship model." })
```

The `prompt` is the task for the whole row (it becomes the dataset's task when the dataset had none). By default every `pending`, `stale`, or `failed` cell runs. Narrow with `columns`, `rows` (`row_...` ids), or `positions` (1-based); re-run `not_found` cells with `states: ["not_found"]`; `force: true` re-runs every cell. `prompt` + `attributes` on a dataset adds the attributes it lacks first, then fills them.

### Inline input (one-off, rows not kept)

```
enrich({
  "input": { "Company": ["OpenAI", "Anthropic", "Mistral"] },
  "prompt": "For each AI lab, find the CEO, total funding raised to date, and their flagship model.",
  "attributes": ["CEO", "Total Funding", "Flagship Model"]
})
```

`input` is an object whose keys are column headers and values are equal-length arrays of strings. Config from `enrichment_id` (headers must match its `input_columns`; up to 10,000 rows), `prompt` + `attributes` (up to 20 names; up to 1,000 rows), or `output` (a full per-column spec; `help({ "topic": "column_config" })` first). Use this only when the user does not want the rows kept. Same `estimate_cost` / `max_credits`.

Optional on every `enrich`: `webhook_url` (POST results when done), `run_key` (idempotency key; becomes the run id `run_<run_key>`), `allow_duplicate_input` (with `enrichment_id`, re-run rows already present).

## Saved Enrichments

- `list_enrichments({})` — compact list of `enr_...` ids. Check it first: if a saved enrichment already does what the user wants, bind it with `build_dataset` `enrichment_id` or run it with `enrich` `enrichment_id`.
- `get_enrichment({ "id": "enr_..." })` — `input_columns`, `output` (each column's `name`, `prompt`, `output_schema`, `tool`), `tools`, `budget_credits_per_row`.
- `create_enrichment({ "name", "prompt", "input_columns", "output": ["CEO", { "name": "HQ city", "prompt": "..." }] })` — saves a recipe and comes back with an empty dataset bound to it (`dataset_id`, `app_url`); add rows and fill.
- `update_enrichment({ "id": "enr_...", "output": { "CEO": { "prompt": "..." }, "Old column": { "delete": true } } })` — change columns in place; does not run.

## Async Workflow

1. Call `enrich`. Capture `id` (`run_...`) from the response, and note `credit_detail.estimate.maximum`.
2. Tell the user the run started and roughly how long it will take (most fills: 10–120 seconds; `progress` reports `total_rows`, `completed_rows`, `running_rows`).
3. Call `get_run_result({ "id": "run_...", "wait": 50 })`. It returns as soon as the run finishes or after 50 seconds. Repeat while `status` is `pending`, `enqueued`, or `processing`. Do not call `get_run` more often than every 10–20 seconds.
4. When `status` is `success`, read `output`. On a dataset it is `{ "rows": [...] }` — the rows the fill ran, each with `id`, `position`, `input`, `cells` (one `value` + `state` per filled column), `credits`. On inline `input` it is columnar: `{ "Company": [{ "value": "OpenAI" }, ...], "CEO": [{ "value": "Sam Altman" }, ...] }`.
5. For the whole grid (earlier fills included), call `list_dataset_rows({ "id": "ds_..." })`.
6. Present the values as a markdown table. Include the dataset `id`, the run `id` (re-fetch via `/riveter-status`), and `credits_used`.
7. If `status` is `stopped`, surface `error` / `stopped_reason`. A stopped fill is not a failure: the values its agents recorded landed as `ok`, the other cells stayed `pending`, and the next `enrich` on the dataset picks them up.

For long-running jobs (more than a few minutes) or when the user doesn't want to keep the chat open, pass a `webhook_url` instead of polling.

## Cell states

`pending` (never filled), `running`, `ok`, `not_found` (researched, nothing found; the row's `not_found_reason` says what the agent looked for), `failed` (never finished; `reason` is `credit_limit`, `provider`, or `internal`, `error` is a sentence to show; the next fill re-runs it), `manual` (set by hand through `update_dataset_row`; skipped unless named), `stale` (the column changed after the cell was filled; the next fill re-runs it).

## Output Format

Render results as a clean markdown table:

| Company | CEO | Total Funding | Flagship Model |
|---------|-----|---------------|----------------|
| OpenAI | Sam Altman | $13B+ | GPT-5 |
| ... | ... | ... | ... |

Always end with the ids and the credits used:

> Dataset: `ds_abc-123` (open in Riveter) · Run: `run_abc-123` — re-fetch with `/riveter-status run_abc-123`. Credits used: 4.5.

Never invent values — show a `not_found` cell as empty, with its `not_found_reason` when the user asks.

## Before You Start

Confirm `enrich` and `build_dataset` (under the `riveter` MCP server) appear in your tool list.

## If the account has not migrated to Datasets

The dataset tools answer `feature_not_enabled` (403). Stop retrying. Tell the user to open Datasets in the Riveter app (https://app.riveterhq.com/v2/datasets) and click "Migrate to Datasets"; the tools work once the copy completes. Until then, run the enrichment with inline `input`.

## If the MCP Server Is Not Connected

### You (the AI) must:

1. **Stop immediately**. Do NOT try to enrich the data yourself, do NOT use web search, and do NOT make up values.
2. Tell the user the Riveter MCP server is not connected.

### Request the user to:

1. Run `/riveter-setup` in Cursor.
2. Open **Cursor Settings → Tools & MCP** and toggle `riveter` **on**.
3. Retry the enrichment.
