---
description: Use Playwright MCP for live browser inspection and debugging in this repo
---

1. Start the local Playwright MCP server from the project root:

```bash
npm run mcp:playwright
```

2. Keep that terminal running. Session data and traces go to `.playwright-mcp/`.

3. Connect your agent client (VS Code via `.vscode/mcp.json`, Claude, Grok, etc.)
   to the Playwright MCP server and inspect the **live site** — do not rely only
   on static code when debugging UI.

4. Useful prompts:

```text
Use Playwright MCP to open the AI assistant and inspect why the bot response is empty.
```

```text
Use Playwright MCP to reproduce the failing chatbot flow, inspect the DOM, and summarize the root cause.
```

```text
Use Playwright MCP to verify whether the chat widget opens, the consent flow completes, and the last bot message receives text.
```

5. For intermittent UI bugs, combine MCP inspection with Playwright artifacts in
   `playwright-report/` and `test-results/`.

6. If the MCP server is already running, reuse it — do not start a second process.

7. Stop the server by closing the terminal that runs `npm run mcp:playwright`.
