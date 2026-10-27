# cursor-plugin

The Riveter plugin for Cursor: the MCP server entry, an always-on awareness rule, five skills, and seven slash commands. Hand-written prose over the hosted catalog; nothing here is generated. Git rules: see root [`AGENTS.md`](../AGENTS.md) — diffs only, never commit/merge/push.

This directory is the source. The public repository `github.com/riveterhq/riveter-cursor-plugin`, which the Cursor Marketplace installs from, is a mirror of it: a `git subtree split` of this directory force-pushed over its `main` by `.github/workflows/publish-clients.yml` on every push to `main` that touches it (`PUBLISHING.md`; by hand when the workflow cannot run), never edited directly. Everything the public repository needs — `README.md`, `LICENSE`, `install.sh` — therefore lives here. Until 2026-10-23 the public repository was edited on its own and last pushed on 2026-04-21, with the legacy verb tool names; its uncommitted September edits were folded into this directory and are superseded.

## Layout

- `.cursor-plugin/plugin.json` — the manifest Cursor reads (name, version, `repository` = the public mirror, where the skills / rules / commands / `mcp.json` live).
- `README.md`, `LICENSE`, `install.sh` — the public repository's face: install from the Marketplace or `bash install.sh` (copies the plugin components into `~/.cursor/plugins/local/riveter` and registers it). `PUBLISHING.md` is the mirror push.
- `mcp.json` — the `riveter` MCP server: `npx riveter-mcp-server@latest` (stdio) with `RIVETER_API_KEY` from the environment (`${env:RIVETER_API_KEY}`). No key is stored in the repo; `/riveter-setup` writes the user's key into their project's `.cursor/mcp.json`.
- `rules/riveter-awareness.mdc` — always applied: when to reach for which tool, the async run pattern, `estimate_cost` / `max_credits`, the `feature_not_enabled` message, the `help` topics.
- `skills/` — `riveter-enrich` (rows into a dataset, estimate, fill, poll, read the grid), `riveter-datasets` (generate rows with `prompt` + `count`; read / change / export an existing dataset; configured list builds), `riveter-monitors`, `riveter-scrape`, `riveter-best-practices` (the tool map and credit rules).
- `commands/` — `/riveter-enrich`, `/riveter-build`, `/riveter-dataset`, `/riveter-monitor`, `/riveter-scrape`, `/riveter-status`, `/riveter-setup`.
- `test/check-plugin-names.mjs` — fails when the prose names a tool, argument, field, or help topic that `public/api_docs/openapi.yaml` does not define, when a `tool_name({ ... })` code block sends an argument the tool does not take, or when `dry_run` appears (`docs/cli-plan.md` check 5). Run on every spec or plugin change. Reads the spec next door in the monorepo; in the mirror it fetches `https://docs.riveterhq.com/openapi.yaml` (`RIVETER_OPENAPI_URL` overrides).

## Rules of the text

- Every tool name is the snake_case `operationId` the MCP server generates; every argument is a spec field. If the spec does not have it, the plugin must not say it — the test enforces this.
- Datasets first: rows go into a dataset (`build_dataset` with `rows`) and `enrich` fills it; inline `input` is the one-off. The plugin names no legacy tool: the retired list-build operations live only in `openapi.legacy.yaml`, and the test fails on any name the current spec lacks. A response's `legacy` key is explained where results are read (`riveter-best-practices`, `/riveter-status`).
- Paid calls estimate first with `estimate_cost: true` and respect `max_credits`; the credit rules in the awareness rule and `riveter-best-practices` must agree with the spec's `credits` help topic.
- Long guidance lives in the spec's `x-mcp-help` topics, reached through `help`; the skills point there instead of repeating it.

## Run / test

```bash
pnpm --filter riveter-cursor-plugin test          # the name check against the repo spec
node cursor-plugin/test/check-plugin-names.mjs ~/.cursor/plugins/local/riveter   # check an installed copy
```

## Install locally

Cursor loads local plugins from `~/.cursor/plugins/local/<name>/`. `bash cursor-plugin/install.sh` copies the plugin components there and registers the plugin (`--uninstall` reverses it); a symlink to this directory works too. Reload Cursor; set `RIVETER_API_KEY` in the environment Cursor starts from, or run `/riveter-setup` to write the key into the project's `.cursor/mcp.json`. Before 2026-10-22 the plugin lived only in that local directory, with a key in its `mcp.json`, and had drifted (`dry_run`, the legacy list builder only).

## Publish

`PUBLISHING.md`: bump the version in `plugin.json` + `package.json` and merge to `main`; the `cursor-plugin-mirror` job of `publish-clients.yml` runs the name check, `git subtree split --prefix=cursor-plugin`, and the force-push over the mirror's `main` (secret `MIRROR_PUSH_TOKEN`). A forgotten bump fails `published-versions.yml`: `sdk/scripts/check-published-versions.mjs` compares the installed files with the mirror's at the same version. Listed with the other client releases in `docs/releasing-api-clients.md`.

## How to regenerate

Rebuild from: `.cursor-plugin/plugin.json`, `mcp.json`, `rules/`, `skills/`, `commands/`, `test/`, `README.md`, `install.sh`, `PUBLISHING.md`, `../public/api_docs/openapi.yaml` (tool names, arguments, help topics).

Last verified: 2026-10-23
