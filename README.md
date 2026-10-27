# Riveter Cursor Plugin

[Riveter](https://riveterhq.com) builds datasets, enriches rows with AI research, scrapes webpages, and schedules recurring monitors. This plugin wires the Riveter MCP server into Cursor and adds skills, slash commands, and an awareness rule so the agent uses Riveter when it should.

## Features

| Capability | Skill | Command |
| --- | --- | --- |
| **Enrich rows with new columns** | `riveter-enrich` | `/riveter-enrich <prompt + inputs>` |
| **Generate a dataset from a description** | `riveter-datasets` | `/riveter-build <description>` |
| **Read or change an existing dataset** | `riveter-datasets` | `/riveter-dataset <ds_... id and what to do>` |
| **Scrape a webpage** | `riveter-scrape` | `/riveter-scrape <url>` |
| **Schedule or inspect a monitor** | `riveter-monitors` | `/riveter-monitor <dataset + schedule>` |
| **Check on a previous run** | — | `/riveter-status <run_...>` |

Additional: `/riveter-setup` (configure the MCP server + API key), `riveter-best-practices` (tool selection, credit estimates, the async run pattern), `riveter-awareness` (always-on rule that nudges the agent to use Riveter when relevant).

The MCP server generates its tools from Riveter's [OpenAPI spec](https://docs.riveterhq.com/openapi.yaml), so every Riveter endpoint (`build_dataset`, `enrich`, `list_dataset_rows`, `scrape`, `search_agent`, `create_monitor`, `get_run`, `get_run_result`, ...) is exposed automatically, plus a `help` tool with reference topics.

## Installation

Install it from the Cursor Marketplace, or run `bash install.sh` from a clone (see [Local Development](#local-development)).

The MCP server reads `RIVETER_API_KEY` from the environment Cursor starts from. Export it in your shell, or run `/riveter-setup` in chat to write the key into your project's `.cursor/mcp.json`.

### MCP only

If you just want the Riveter tools without skills, commands, or rules, add this to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "riveter": {
      "command": "npx",
      "args": ["-y", "--prefer-online", "riveter-mcp-server@latest"],
      "env": {
        "RIVETER_API_KEY": "sk_riv_your_key_here"
      }
    }
  }
}
```

Get an API key at https://app.riveterhq.com/settings/api.

## Quick start

**Set up the MCP server (first time only):**

```
/riveter-setup
```

**Enrich a list:**

```
/riveter-enrich For each of OpenAI, Anthropic, Mistral — find the CEO, total funding raised, and flagship model.
```

**Build a dataset:**

```
/riveter-build 50 venture-backed AI infrastructure companies founded after 2020, with CEO and total funding.
```

**Work on an existing dataset:**

```
/riveter-dataset ds_... add a column "Headquarters city" and fill it
```

**Scrape a webpage:**

```
/riveter-scrape https://docs.riveterhq.com
```

**Schedule a recurring monitor:**

```
/riveter-monitor Fill dataset ds_... again every Monday at 9am ET, alert only when data changes.
```

**Check on a run later:**

```
/riveter-status run_...
```

## How it works

1. The `riveter-mcp-server` npm package fetches Riveter's OpenAPI spec at startup and exposes every endpoint as an MCP tool with typed parameters.
2. The skills tell Cursor's agent **when** and **how** to use those tools: rows go into a dataset and `enrich` fills it, paid calls are estimated first with `estimate_cost: true`, runs are async and read back with `get_run_result`.
3. The `riveter-awareness` rule keeps Riveter top of mind so the agent reaches for it instead of fabricating lists or hand-rolling scrapers.

The MCP server loads Riveter's API definition once, when Cursor starts it. After a Riveter API update, toggle the `riveter` server off and on in **Cursor Settings → Tools & MCP** (or reload the window) to get the new tools. No plugin update is required for new endpoints; the plugin changes when the guidance does.

## Local development

The plugin is developed in the Riveter monorepo (`cursor-plugin/`) and mirrored to this repository; open a pull request against the monorepo if you have access, otherwise file an issue here.

To test the plugin from source:

1. Clone and open in Cursor:

```bash
git clone https://github.com/riveterhq/riveter-cursor-plugin.git
cursor riveter-cursor-plugin
```

2. To test as a full plugin (with commands), run the install script:

```bash
bash install.sh
```

3. Restart Cursor (or `Cmd/Ctrl+Shift+P → Developer: Reload Window`).

4. Type `/` in chat to verify the `riveter-*` commands and skills are listed, then run `/riveter-setup` to add your API key.

5. To uninstall:

```bash
bash install.sh --uninstall
```

`node test/check-plugin-names.mjs` checks that every tool, argument, field, and help topic the plugin names exists in the spec (fetched from https://docs.riveterhq.com/openapi.yaml outside the monorepo; needs `npm install` for the `yaml` package).

## Links

- [Riveter API docs](https://docs.riveterhq.com)
- [Get an API key](https://app.riveterhq.com/settings/api)
- [Riveter MCP server on npm](https://www.npmjs.com/package/riveter-mcp-server)
- [Riveter app](https://app.riveterhq.com)

## License

MIT — see [LICENSE](./LICENSE).
