---
name: riveter-monitors
description: "Create, inspect, and pause Riveter monitors — scheduled enrichments that run on a daily/weekly/monthly cadence and optionally fire webhooks. Use when the user wants 'run this enrichment every X' or wants to check on/pause an existing monitor."
allowed-tools: mcp(riveter:monitor_enrichment), mcp(riveter:get_monitor_status), mcp(riveter:get_monitor_recent_run_data), mcp(riveter:pause_monitor)
---

# Riveter Monitors

Manage monitors for: $ARGUMENTS

## Tools

- `monitor_enrichment` — create a new scheduled monitor for an existing enrichment.
- `get_monitor_status` — show schedule, enabled state, next run time.
- `get_monitor_recent_run_data` — fetch the results from the monitor's most recent run.
- `pause_monitor` — pause an active monitor (idempotent).

A monitor wraps an existing enrichment (created in the [Riveter UI](https://app.riveterhq.com/enrichments) or via `run_new_enrichment`) and re-runs it on a schedule.

## When to Use

- "Run this enrichment every Monday at 9am ET."
- "Check on monitor abc-123" / "show me the latest results for monitor abc-123".
- "Pause the daily monitor for our customer list."
- "Alert me only when the data changes."

## Creating a Monitor

`monitor_enrichment` requires:

- `enrichment_uuid` *(query, required)* — from app.riveterhq.com/enrichments/<uuid>
- `cadence` *(required)* — `"daily"`, `"weekly"`, or `"monthly"`
- `minute` *(required)* — `0–59`
- `hour` *(required)* — `0–23`
- `timezone` *(required)* — IANA tz name like `"America/New_York"` or `"UTC"`
- `day_of_week` — `0–6` (`0` = Sunday); **required when `cadence` is `"weekly"`**
- `day_of_month` — `1–28`; **required when `cadence` is `"monthly"`**
- `webhook_url` *(optional)* — POST results when each run completes
- `alert_rule` *(optional)* — `"each_run"` (default) or `"only_on_change"`
- `output_format` *(optional)* — `"current_only"` (default) or `"current_and_previous"`
- `run_immediately` *(optional)* — kick off the first run right after creation
- `input` *(optional)* — input data for the monitor (same shape as enrichment `input`)

### Example: weekly Monday 9am ET, alert only when data changes

```
monitor_enrichment({
  "enrichment_uuid": "<uuid>",
  "cadence": "weekly",
  "day_of_week": 1,
  "hour": 9,
  "minute": 0,
  "timezone": "America/New_York",
  "alert_rule": "only_on_change",
  "webhook_url": "https://example.com/webhook"
})
```

The response includes a `monitor.uuid` — save that for later inspection / pausing.

## Inspecting a Monitor

```
get_monitor_status({ monitor_uuid: "<uuid>" })
get_monitor_recent_run_data({ monitor_uuid: "<uuid>" })
```

Show the user the schedule, enabled state, next run time, and (if requested) the most recent results as a markdown table.

## Pausing a Monitor

```
pause_monitor({ monitor_uuid: "<uuid>" })
```

Idempotent — calling on an already-paused monitor returns success.

## Output Format

When creating: confirm the schedule in plain English ("This will run every Monday at 9:00 AM America/New_York. Next run: …") and quote the `monitor_uuid`.

When fetching status / recent data: render the schedule + state, then the most recent results as a markdown table.

## Before You Start

Confirm `monitor_enrichment` (under the `riveter` MCP server) is in your tool list.

## If the MCP Server Is Not Connected

### You (the AI) must:

1. **Stop immediately**. Do NOT pretend to schedule anything.
2. Tell the user the Riveter MCP server is not connected.

### Request the user to:

1. Run `/riveter-setup` in Cursor.
2. Open **Cursor Settings → Tools & MCP** and toggle `riveter` **on**.
3. Retry.
