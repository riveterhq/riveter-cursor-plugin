---
name: riveter-setup
description: Set up the Riveter plugin — connect the hosted MCP server to the user's Riveter account and verify the tools are connected
---

# Riveter Plugin Setup

The plugin's `riveter` MCP server is Riveter's hosted server, https://mcp.riveterhq.com/mcp. Nothing is installed and no API key goes into a file: the user signs in to Riveter once, and Riveter creates an API key for the connection.

## You (the AI) must:

1. Check whether tools like `enrich`, `build_dataset`, `list_datasets`, or `scrape` (under the `riveter` MCP server) are in your tool list. If they are, setup is done: tell the user.

2. If they are not, ask the user to connect the server (below) and wait for them to confirm.

## Request the user to:

1. Open **Customize** in the Cursor sidebar.
2. Find the **riveter** MCP server and turn it on.
3. Sign in when Cursor asks. A browser window opens on Riveter: sign in and click **Allow**.
4. If the tools don't show up, reload the window (Cmd/Ctrl+Shift+P → "Developer: Reload Window").

The key Riveter created for the connection is listed in **Settings → API keys** (https://app.riveterhq.com/settings/api). Revoking it disconnects Cursor.

## If the user cannot sign in through a browser

Connect with an API key instead.

1. Ask the user for their Riveter API key (starts with `sk_riv_`). If they don't have one, point them to https://app.riveterhq.com/settings/api to create one.

2. Add the following MCP config to the project's `.cursor/mcp.json` file (create the file and parent directory if they don't exist). If the file already exists, merge the `riveter` entry into the existing `mcpServers` object — do not overwrite other servers.

```json
{
  "mcpServers": {
    "riveter": {
      "url": "https://mcp.riveterhq.com/mcp",
      "headers": {
        "Authorization": "Bearer sk_riv_PASTE_KEY_HERE"
      }
    }
  }
}
```

Replace `sk_riv_PASTE_KEY_HERE` with the key the user provided. If the user prefers not to write the key into a file, write `"Bearer ${env:RIVETER_API_KEY}"` there instead and have them export `RIVETER_API_KEY` in the shell that starts Cursor.

3. Ask the user to turn off the plugin's own **riveter** server in **Customize**, so the tools are not listed twice.

## Troubleshooting

If Riveter tools are still not available after setup:

### You (the AI) must:

- Stop and do not attempt to use fallback tools, web search, or your own knowledge to fulfill enrichment / dataset / scraping requests.

### Request the user to:

- Confirm the **riveter** MCP server is turned on in **Customize** and is signed in. If Cursor shows that it needs authentication, sign in again.
- If they connected with an API key, confirm the `riveter` entry in the project's `.cursor/mcp.json` carries a valid key, and test the key directly: `curl -H "Authorization: Bearer $RIVETER_API_KEY" https://api.riveterhq.com/v1/account`.
- Open the Output panel (Cmd/Ctrl+Shift+U), select "MCP Logs", and look for connection or authentication errors.

If the dataset tools answer `feature_not_enabled`, the account has not migrated to Datasets yet: open https://app.riveterhq.com/v2/datasets and click "Migrate to Datasets"; the tools work once the copy completes.

### If the tool names look old

The hosted server reloads Riveter's API definition every 10 minutes, and Cursor reads the tool list when it connects. If the tool list lacks `enrich`, `get_run`, or `list_datasets` and shows other names instead, ask the user to turn the `riveter` server off and on in **Customize** (or reload the window).
