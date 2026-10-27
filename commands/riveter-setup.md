---
name: riveter-setup
description: Set up the Riveter plugin — add the MCP server, configure the API key, and verify the tools are connected
---

# Riveter Plugin Setup

## You (the AI) must:

1. Ask the user for their Riveter API key (starts with `sk_riv_`). If they don't have one, point them to https://app.riveterhq.com/settings/api to create one.

2. Add the following MCP config to the project's `.cursor/mcp.json` file (create the file and parent directory if they don't exist). If the file already exists, merge the `riveter` entry into the existing `mcpServers` object — do not overwrite other servers.

```json
{
  "mcpServers": {
    "riveter": {
      "command": "npx",
      "args": ["-y", "--prefer-online", "riveter-mcp-server@latest"],
      "env": {
        "RIVETER_API_KEY": "sk_riv_PASTE_KEY_HERE"
      }
    }
  }
}
```

Replace `sk_riv_PASTE_KEY_HERE` with the key the user provided. If the user prefers not to write the key into a file, keep `"${env:RIVETER_API_KEY}"` there instead and have them export `RIVETER_API_KEY` in the shell that starts Cursor.

3. After writing the config, verify setup by checking whether tools like `enrich`, `build_dataset`, `list_datasets`, or `scrape` (under the `riveter` MCP server) are available in your tool list.

## Request the user to:

1. Open **Cursor Settings → Tools & MCP**.
2. Find **riveter** in the list.
3. Toggle it **on** (the green enable button).
4. If the server doesn't show up immediately, restart Cursor (Cmd/Ctrl+Shift+P → "Developer: Reload Window").

## Troubleshooting

If Riveter tools are still not available after setup:

### You (the AI) must:

- Stop and do not attempt to use fallback tools, web search, or your own knowledge to fulfill enrichment / dataset / scraping requests.

### Request the user to:

- Confirm `~/.cursor/mcp.json` (or the project's `.cursor/mcp.json`) contains the `riveter` entry with a valid `RIVETER_API_KEY`.
- Confirm the MCP server shows as enabled (green) in **Cursor Settings → Tools & MCP**.
- Make sure they have Node.js 20+ installed (`node --version`) — the MCP server runs via `npx`.
- Restart Cursor after editing the config.
- Test the key directly: `curl -H "Authorization: Bearer $RIVETER_API_KEY" https://api.riveterhq.com/v1/account`.

If the dataset tools answer `feature_not_enabled`, the account has not migrated to Datasets yet: open https://app.riveterhq.com/v2/datasets and click "Migrate to Datasets"; the tools work once the copy completes.

### If the tool names look old

The MCP server loads Riveter's API definition once, when Cursor starts it. If the tool list lacks `enrich`, `get_run`, or `list_datasets` and shows other names instead, the server process is stale. Ask the user to toggle the `riveter` server off and on in **Cursor Settings → Tools & MCP** (or reload the window).
