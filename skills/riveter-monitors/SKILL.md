---
name: riveter-monitors
description: "Create, inspect, pause, and resume Riveter monitors — scheduled fills of a dataset (ds_...) on a daily/weekly/monthly cadence that compare each cell with the previous run and optionally fire webhooks. Use when the user wants 'keep this dataset fresh every X' / 'run this enrichment every X' or wants to check on/pause an existing monitor. Estimates the per-run cost first."
allowed-tools: mcp(riveter:create_monitor), mcp(riveter:list_monitors), mcp(riveter:get_monitor), mcp(riveter:update_monitor), mcp(riveter:list_monitor_runs), mcp(riveter:get_run_result), mcp(riveter:list_datasets), mcp(riveter:get_dataset), mcp(riveter:help)
---

# Riveter Monitors

Manage monitors for: $ARGUMENTS

## Tools

- `create_monitor` — create a scheduled monitor on a dataset (`ds_...`).
- `list_monitors` — the account's monitors, newest first.
- `get_monitor` — schedule, enabled state, next run time, the columns each run fills.
- `update_monitor` — `enabled: false` pauses, `enabled: true` resumes; `webhook_url` replaces the delivery URL; `columns` changes which output columns each run fills (`null` = every column).
- `list_monitor_runs` — the monitor's run history (run envelopes). Fetch a run's rows with `get_run_result({ "id": "run_..." })`.
- `list_datasets` / `get_dataset` — find the `ds_...` id to monitor and read its `output_columns`.
- `help({ "topic": "monitors" })` — the reference: what a tick does, diff rules, `on_diff`, `include_diffs`.

A monitor fills a dataset again on a schedule. Every tick runs the dataset's enrichment over every row that has an input value, re-filling the chosen output columns even when they already hold a value, and compares each cell with the previous tick. The dataset's rows are the input: add or remove rows with `add_dataset_rows` / `import_dataset_rows` / `delete_dataset_rows` and the next tick picks the change up.

## When to Use

- "Keep this dataset fresh every Monday at 9am ET."
- "Check on monitor mon_abc-123" / "show me what changed in the latest run".
- "Pause the daily monitor for our customer list." / "Resume it."
- "Alert me only when the data changes."

## Creating a Monitor

`create_monitor` takes:

- `dataset_id` *(required)* — the dataset (`ds_...`, from `list_datasets`); it needs at least one output column
- `cadence` *(required)* — `"daily"`, `"weekly"`, or `"monthly"`
- `minute` *(required)* — `0`, `15`, `30`, or `45`
- `hour` *(required)* — `0–23`
- `timezone` *(required)* — IANA tz name like `"America/New_York"` or `"UTC"`
- `day_of_week` — `0–6` (`0` = Sunday); **required when `cadence` is `"weekly"`**
- `day_of_month` — `1–28`; **required when `cadence` is `"monthly"`**
- `columns` *(optional)* — the output column names each run fills; omit for every column, including ones added later
- `webhook_url` *(optional)* — POST the run when each tick completes
- `alert_rule` *(optional)* — `"each_run"` (default), `"on_diff"` (post the webhook only when a monitored cell changed), or `"disabled"`
- `output_format` *(optional)* — `"current_only"` (default) or `"include_diffs"` (each cell in the run's rows carries `previous_value` and `changed`)
- `run_immediately` *(optional)* — kick off the first (paid) run right after creation
- `estimate_cost`, `max_credits` — see below

Do not pass `input`: a dataset monitor's rows are the dataset's. (`enrichment_id` still works for an enrichment bound to one dataset, and for a legacy project enrichment with `input`.)

### Example: weekly Monday 9am ET, alert only when data changes

```
create_monitor({
  "dataset_id": "ds_...",
  "cadence": "weekly",
  "day_of_week": 1,
  "hour": 9,
  "minute": 0,
  "timezone": "America/New_York",
  "columns": ["CEO", "Headcount"],
  "alert_rule": "on_diff",
  "output_format": "include_diffs",
  "webhook_url": "https://example.com/webhook"
})
```

The response is the monitor with an `id` (`mon_...`), its `dataset_id`, and `columns` — save the id for later inspection / pausing.

## Estimate First (credits cost real money, every run)

Creating a monitor is free. **Every tick charges the fill price for every row with an input value**, up to the enrichment's per-row budget, so a daily monitor over 100 rows at a 3-credit budget costs up to 300 credits per day.

Before creating, send the **same** request with `estimate_cost: true`:

```
create_monitor({
  "dataset_id": "ds_...",
  "cadence": "weekly",
  "day_of_week": 1,
  "hour": 9,
  "minute": 0,
  "timezone": "America/New_York",
  "estimate_cost": true
})
```

The response is `{ "estimate_cost": true, "type": "monitor", "credit_detail": { "estimate": { "minimum", "maximum", "expected"?, "charged_upfront": false }, "credits_used": 0, "credits_remaining", "sufficient_credits" } }`. The estimate is for **one** tick. Tell the user "up to N credits per run, M runs per month at this cadence" and wait for a go-ahead. When the user names a per-run budget, pass it as `max_credits` on the real call.

## Inspecting a Monitor

```
list_monitors({})
```
```
get_monitor({ "id": "mon_..." })
```
```
list_monitor_runs({ "id": "mon_..." })
```
```
get_run_result({ "id": "run_..." })
```

Show the user the schedule (`schedule_summary`), `enabled`, `next_run_at`, `dataset_id`, `columns`, and, if requested, the most recent run's `output.rows` as a markdown table. With `include_diffs`, point out the cells where `changed` is true and quote their `previous_value`.

## Pausing and Resuming a Monitor

```
update_monitor({ "id": "mon_...", "enabled": false })
```
```
update_monitor({ "id": "mon_...", "enabled": true })
```

Resuming starts charging again at the next scheduled run.

## Output Format

When creating: confirm the schedule in plain English ("This will fill CEO and Headcount on ds_... every Monday at 9:00 AM America/New_York over 120 rows, up to 360 credits per run. Next run: …") and quote the monitor `id`.

When fetching status / recent data: render the schedule + state, then the most recent results as a markdown table with the run `id`.

## Before You Start

Confirm `create_monitor` (under the `riveter` MCP server) is in your tool list.

## If the MCP Server Is Not Connected

### You (the AI) must:

1. **Stop immediately**. Do NOT pretend to schedule anything.
2. Tell the user the Riveter MCP server is not connected.

### Request the user to:

1. Run `/riveter-setup` in Cursor.
2. Open **Cursor Settings → Tools & MCP** and toggle `riveter` **on**.
3. Retry.
