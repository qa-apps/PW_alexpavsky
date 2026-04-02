---
description: Use Playwright MCP with Windsurf for browser inspection and debugging in this repo
---
1. Start the local Playwright MCP server from the project root.

```bash
npm run mcp:playwright
```

2. Keep that terminal running. The MCP server writes session data and traces into `.playwright-mcp`.

3. In Windsurf, use the project MCP connection for Playwright and ask the agent to inspect the live site through MCP instead of relying only on static code.

4. Use prompts like these when debugging:

```text
Use Playwright MCP to open the AI assistant and inspect why the bot response is empty.
```

```text
Use Playwright MCP to reproduce the failing chatbot flow, inspect the DOM, and summarize the root cause.
```

```text
Use Playwright MCP to verify whether the chat widget opens, the consent flow completes, and the last bot message receives text.
```

5. When a UI bug is intermittent, ask the agent to combine MCP browser inspection with the Playwright test artifacts in `playwright-report` and `test-results`.

6. If the MCP server is already running, reuse the existing process instead of starting another one.

7. Stop the MCP server when you are done by closing the terminal that is running `npm run mcp:playwright`.
