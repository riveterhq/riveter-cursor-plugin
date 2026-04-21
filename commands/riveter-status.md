---
name: riveter-status
description: "Check the status of a Riveter run and fetch results when ready. Usage: /riveter-status <run_key>"
---

Look up the Riveter run with `run_key`: $ARGUMENTS

## You (the AI) must:

1. Call `get_run_status` with the provided `run_key`.
2. Report the current `status` and `progress` to the user.
3. If `status` is `success`, call `get_run_data` for the same `run_key` and present the enriched results in a readable table.
4. If `status` is `error` or `stopped`, surface the error message and suggest next steps (e.g. retry with `run_new_enrichment`).
5. If `status` is still `running` or `queued`, tell the user the current progress and either:
   - poll again with `get_run_status` after waiting 5–10 seconds (do this for short runs), or
   - tell the user to call `/riveter-status <run_key>` again later for long-running jobs.

If the Riveter MCP server is not connected, refer to `/riveter-setup` instead of guessing.
