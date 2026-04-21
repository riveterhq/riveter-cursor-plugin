---
name: riveter-enrich
description: "Run an AI enrichment on rows of input data using Riveter. Use whenever the user has a list of companies, people, URLs, or any rows and wants to fill in new columns (revenue, CEO, summary, contact info, classification, etc.). Handles the full async lifecycle: kick off the run, poll, and return results."
allowed-tools: mcp(riveter:run_new_enrichment), mcp(riveter:run_existing_enrichment), mcp(riveter:get_run_status), mcp(riveter:get_run_data), mcp(riveter:stop_run)
---

# Riveter Enrichment

Run an AI enrichment for: $ARGUMENTS

## Tools

- `run_new_enrichment` — define and execute an enrichment in one request
- `run_existing_enrichment` — re-run an enrichment already configured at app.riveterhq.com (you must have its `enrichment_uuid`)
- `get_run_status` — poll until a run finishes
- `get_run_data` — fetch results once status is `success`
- `stop_run` — cancel a run

## When to Use

- The user gives you a list of rows (companies, people, URLs, domains, anything) and wants new columns generated.
- The user describes a research task per row: "for each of these companies find their CEO and latest funding round".
- The user references an existing enrichment by UUID and wants to feed in new inputs.

Trigger phrases: "enrich this list", "for each of these…", "find me the X for each Y", "look up X for these companies", "research each of these".

If the user has *no* input list yet and wants to generate one, use the **riveter-build-dataset** skill first.

## How to Run a New Enrichment

`run_new_enrichment` needs:

- `input` *(required)* — object where keys are column headers and values are arrays of strings, all the same length:
  ```json
  {
    "Company": ["Apple", "Google", "Stripe"]
  }
  ```
- `prompt` *(recommended)* — natural-language description of what to enrich, e.g. *"For each company, find its CEO, latest funding round, and headquarters city."*
- `attributes` *(recommended, paired with `prompt`)* — array of output column names, e.g. `["CEO", "Latest Funding", "HQ City"]`. Riveter generates the per-column config automatically.
- `output` *(advanced, alternative to prompt+attributes)* — full per-column specification. Only use when the user needs precise control.
- `webhook_url` *(optional)* — URL to POST results to when the run finishes. Use this when the user can wait and doesn't want to keep the chat open while polling.
- `run_key` *(optional)* — custom identifier for the run; otherwise one is generated.

You must provide **either** (`prompt` + `attributes`) **or** `output`. Not both. Not neither.

### Example

```
run_new_enrichment({
  "input": { "Company": ["OpenAI", "Anthropic", "Mistral"] },
  "prompt": "For each AI lab, find the CEO, total funding raised to date, and their flagship model.",
  "attributes": ["CEO", "Total Funding", "Flagship Model"]
})
```

## How to Run an Existing Enrichment

`run_existing_enrichment` needs:

- `enrichment_uuid` *(required)* — from the URL at app.riveterhq.com/enrichments/<uuid>
- `input` *(required)* — same shape as above; columns must match what the enrichment expects.
- `webhook_url` *(optional)*

## Async Workflow

1. Call the kickoff tool. Capture `run_key` from the response.
2. Tell the user the run started and roughly how long it will take (most runs: 10–120 seconds).
3. Poll `get_run_status({ run_key })` every **5–10 seconds**. Don't poll faster than that.
4. When `status === "success"`, call `get_run_data({ run_key })`.
5. Present `formatted_data` (or `data`) as a markdown table. Include the `run_key` so the user can fetch it again later via `/riveter-status`.
6. If `status === "error"` or `"stopped"`, surface the error and ask if they want to retry with adjusted parameters.

For long-running jobs (>3 minutes expected) or when the user doesn't want to keep the chat open, prefer passing a `webhook_url` instead of polling.

## Output Format

Render results as a clean markdown table:

| Company | CEO | Total Funding | Flagship Model |
|---------|-----|---------------|----------------|
| OpenAI | Sam Altman | $13B+ | GPT-5 |
| ... | ... | ... | ... |

Always end with the `run_key` so the user can re-fetch:

> Run key: `abc-123` — re-fetch with `/riveter-status abc-123`

## Before You Start

Confirm `run_new_enrichment` (under the `riveter` MCP server) appears in your tool list.

## If the MCP Server Is Not Connected

### You (the AI) must:

1. **Stop immediately**. Do NOT try to enrich the data yourself, do NOT use web search, and do NOT make up values.
2. Tell the user the Riveter MCP server is not connected.

### Request the user to:

1. Run `/riveter-setup` in Cursor.
2. Open **Cursor Settings → Tools & MCP** and toggle `riveter` **on**.
3. Retry the enrichment.
