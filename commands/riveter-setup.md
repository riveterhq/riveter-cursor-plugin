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
      "args": ["-y", "riveter-mcp-server"],
      "env": {
        "RIVETER_API_KEY": "sk_riv_PASTE_KEY_HERE"
      }
    }
  }
}
```

Replace `sk_riv_PASTE_KEY_HERE` with the key the user provided.

3. After writing the config, verify setup by checking whether tools like `run_new_enrichment`, `build_dataset`, or `scrape` (under the `riveter` MCP server) are available in your tool list.

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
