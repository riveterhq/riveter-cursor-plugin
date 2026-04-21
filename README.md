# Riveter Cursor Plugin

[Riveter](https://riveterhq.com) lets you build datasets, run AI enrichments, scrape webpages, and schedule recurring monitors. This plugin wires the [Riveter MCP server](https://github.com/riveterhq/riveter-mcp-server) into Cursor and adds skills, slash commands, and an awareness rule so the agent uses Riveter when it should.

## Features

| Capability | Skill | Command |
| --- | --- | --- |
| **Run an AI enrichment** | `riveter-enrich` | `/riveter-enrich <prompt + inputs>` |
| **Build a dataset from a prompt** | `riveter-build-dataset` | `/riveter-build <description>` |
| **Scrape a webpage** | `riveter-scrape` | `/riveter-scrape <url>` |
| **Schedule / inspect a monitor** | `riveter-monitors` | `/riveter-monitor <enrichment + schedule>` |
| **Check on a previous run** | — | `/riveter-status <run_key>` |

Additional: `/riveter-setup` (configure the MCP server + API key), `riveter-best-practices` (tool selection + async patterns), `riveter-awareness` (always-on rule that nudges the agent to use Riveter when relevant).

The MCP server [generates tools dynamically](https://github.com/riveterhq/riveter-mcp-server) from Riveter's [OpenAPI spec](https://docs.riveterhq.com/openapi.yaml), so all 19+ Riveter endpoints (`run_new_enrichment`, `build_dataset`, `scrape`, `monitor_enrichment`, `get_run_status`, `get_run_data`, etc.) are exposed automatically.

## Installation

Install it from the Cursor Marketplace, or run `bash install.sh` from a clone (see [Local Development](#local-development)).

After installing, run `/riveter-setup` in chat to add your `RIVETER_API_KEY`.

### MCP Only

If you just want the Riveter tools without skills, commands, or rules, add this to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "riveter": {
      "command": "npx",
      "args": ["-y", "riveter-mcp-server"],
      "env": {
        "RIVETER_API_KEY": "sk_riv_your_key_here"
      }
    }
  }
}
```

Get an API key at https://app.riveterhq.com/settings/api.

## Quick Start

**Set up the MCP server (first time only):**

```
/riveter-setup
```

**Run an enrichment:**

```
/riveter-enrich For each of OpenAI, Anthropic, Mistral — find the CEO, total funding raised, and flagship model.
```

**Build a dataset:**

```
/riveter-build Top 50 venture-backed AI infrastructure companies founded after 2020, with CEO and total funding.
```

**Scrape a webpage:**

```
/riveter-scrape https://docs.riveterhq.com
```

**Schedule a recurring monitor:**

```
/riveter-monitor Run enrichment <uuid> every Monday at 9am ET, alert only when data changes.
```

**Check on a run later:**

```
/riveter-status abc-123
```

## How it works

1. The [`riveter-mcp-server`](https://github.com/riveterhq/riveter-mcp-server) fetches Riveter's OpenAPI spec at startup and exposes every endpoint as an MCP tool with typed parameters.
2. The skills in this plugin tell Cursor's agent **when** and **how** to use those tools — async polling patterns, prompt+attributes vs full output, dataset → enrichment chaining, monitor cadence, etc.
3. The `riveter-awareness` rule keeps Riveter top-of-mind so the agent reaches for it instead of fabricating lists or hand-rolling scrapers.

When you update Riveter's API docs, the MCP server picks up the changes the next time Cursor launches — no plugin update required.

## Local Development

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

## Links

- [Riveter API docs](https://docs.riveterhq.com)
- [Get an API Key](https://app.riveterhq.com/settings/api)
- [Riveter MCP Server](https://github.com/riveterhq/riveter-mcp-server)
- [Riveter App](https://app.riveterhq.com)

## License

MIT — see [LICENSE](./LICENSE).
