---
name: riveter-build-dataset
description: "Generate rows of data from a natural-language description using Riveter's dataset builder. Use when the user wants a list (top 100 companies, all YC W24 startups, a list of competitors, etc.) and doesn't already have the inputs. Optionally enrich the dataset in the same call."
allowed-tools: mcp(riveter:build_dataset), mcp(riveter:get_dataset_build_status), mcp(riveter:get_dataset_build_data), mcp(riveter:stop_dataset_build), mcp(riveter:create_enrichment_from_dataset), mcp(riveter:run_enrichment_from_dataset), mcp(riveter:build_dataset_from_enrichment), mcp(riveter:get_run_status), mcp(riveter:get_run_data)
---

# Riveter Dataset Builder

Build a dataset for: $ARGUMENTS

## Tools

- `build_dataset` — generate rows from a natural-language prompt. Optionally auto-enriches.
- `get_dataset_build_status` — poll until the build is `completed`.
- `get_dataset_build_data` — fetch the generated rows.
- `stop_dataset_build` — cancel a build in progress.
- `create_enrichment_from_dataset` + `run_enrichment_from_dataset` — wire a finished dataset into a new enrichment.
- `build_dataset_from_enrichment` — generate rows that match an existing enrichment's input schema.

## When to Use

- The user wants a *list* but doesn't have it yet: "top 100 SaaS companies", "all YC W24 startups", "competitors of Stripe".
- The user wants both the list **and** enriched columns in one shot.
- The user has an existing enrichment and needs new input rows that match its schema (use `build_dataset_from_enrichment`).

If the user *already has* the rows and just wants new columns, use the **riveter-enrich** skill instead.

## How to Build a Dataset

`build_dataset` accepts:

- `prompt` *(required)* — natural-language description of the rows you want, e.g. *"Top 50 venture-backed AI infrastructure companies founded after 2020"*.
- `row_count` *(optional)* — target number of rows.
- `auto_run_enrichment` *(optional, recommended for "list + columns" requests)* — when `true`, the dataset is enriched automatically with the attributes/prompt you provide.
- `prompt_for_enrichment` and `attributes` — the enrichment instructions when `auto_run_enrichment: true` (same shape as `riveter-enrich`).
- `dataset_webhook_url` *(optional)* — POST when build finishes (skip polling).
- `webhook_url` *(optional)* — POST when the auto-enrichment finishes.

### Example: list only

```
build_dataset({
  "prompt": "Top 50 venture-backed AI infrastructure companies founded after 2020",
  "row_count": 50
})
```

### Example: list + enrichment in one shot

```
build_dataset({
  "prompt": "Top 50 venture-backed AI infrastructure companies founded after 2020",
  "row_count": 50,
  "auto_run_enrichment": true,
  "prompt_for_enrichment": "Find the CEO, total funding raised, and headquarters city for each company.",
  "attributes": ["CEO", "Total Funding", "HQ City"]
})
```

## Async Workflow

The dataset build is async, and the enrichment (if you set `auto_run_enrichment: true`) is a *second* async step.

1. Call `build_dataset`. Capture `run_key`.
2. Poll `get_dataset_build_status({ run_key })` every **5–10 seconds** until `state === "completed"`.
3. Call `get_dataset_build_data({ run_key })` to get the generated rows.
4. **If you set `auto_run_enrichment: true`**: also poll `get_run_status({ run_key })` until `status === "success"`, then call `get_run_data({ run_key })` for the enriched columns.
5. Present the final table to the user with the `run_key`.

## Building a Dataset for an Existing Enrichment

If the user already has an enrichment configured at app.riveterhq.com and just needs new inputs that match its schema, use `build_dataset_from_enrichment`:

```
build_dataset_from_enrichment({
  "enrichment_uuid": "<uuid>",
  "prompt": "Recently funded YC startups in fintech",
  "row_count": 25,
  "auto_run_enrichment": true
})
```

This is convenient because the dataset builder derives the input columns from the enrichment automatically.

## Wiring a Dataset Into a New Enrichment (manual path)

If you didn't pass `auto_run_enrichment` but later decide to enrich the dataset:

1. `create_enrichment_from_dataset({ run_key, prompt, attributes })`
2. `run_enrichment_from_dataset({ run_key })`
3. Poll `get_run_status` and fetch `get_run_data` as usual.

## Output Format

Render the rows as a markdown table. If both build and enrichment finished, show the enriched columns. Always include the `run_key`:

> Dataset run key: `abc-123` — re-fetch with `get_dataset_build_data({ run_key: "abc-123" })`

## Before You Start

Confirm `build_dataset` (under the `riveter` MCP server) is in your tool list.

## If the MCP Server Is Not Connected

### You (the AI) must:

1. **Stop immediately**. Do NOT generate the list yourself, do NOT use web search, and do NOT fabricate rows.
2. Tell the user the Riveter MCP server is not connected.

### Request the user to:

1. Run `/riveter-setup` in Cursor.
2. Open **Cursor Settings → Tools & MCP** and toggle `riveter` **on**.
3. Retry the request.
