---
name: riveter-status
description: "Check the status of a Riveter run and fetch results when ready. Usage: /riveter-status <run_id>"
---

Look up the Riveter run with id: $ARGUMENTS

## You (the AI) must:

1. Call `get_run_result` with `id` set to the provided run id (`run_...`; a bare run key also works as `run_<run_key>`) and `wait: 50`.
2. Report the current `status`, `progress`, and `credit_detail` (`estimate.maximum` and `credits_used`) to the user.
3. If `status` is `success`, present `output` in a readable table. A fill on a dataset answers `{ "rows": [...] }`, each row with `input` and `cells` (one `value` + `state` per column); a run on inline `input` or a build run answers the columnar shape `{ "Column": [{ "value": "..." }, ...] }`. A `legacy` key on the response (`notice`, `successor`, `docs`) means the run reached the legacy pipeline through a legacy id; it still worked, and `successor` says what to call instead.
4. If `status` is `stopped`, surface `error` / `stopped_reason` and suggest next steps (e.g. retry with `enrich`, estimating first with `estimate_cost: true`).
5. If `status` is still `pending`, `enqueued`, or `processing`, tell the user the current progress and either:
   - call `get_run_result` again with `wait: 50` (do this for short runs), or
   - tell the user to call `/riveter-status <run_id>` again later for long-running jobs.

If the run has a `dataset_id`, mention that `list_dataset_rows` reads the whole grid, filled cells included, and that the dataset is open in the Riveter app.

If the Riveter MCP server is not connected, refer to `/riveter-setup` instead of guessing.
