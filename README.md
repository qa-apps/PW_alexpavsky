# PW_alexpavsky

Playwright coverage for the live [alexpavsky.com](https://www.alexpavsky.com) experience.

## Commands

```bash
npm test
npm run test:headed
npm run test:chromium
```

## Playwright MCP

This project includes `@playwright/mcp` so the browser can be attached to an AI orchestrator or agent client for live DOM inspection.

Run the local MCP server:

```bash
npm run mcp:playwright
```

Example Codex MCP config:

```toml
[mcp_servers.playwright]
command = "npx"
args = ["playwright-mcp", "--headless", "--browser", "chrome", "--output-dir", ".playwright-mcp", "--save-trace", "--save-session"]
```

## Coverage Areas

- Hero ticker and navigation
- Live feed filters and article modal
- Essential Principles and tooling sections
- AI Lab tools and challenge playground
- AI assistant UI and LLM-as-a-judge checks
- YouTube/video carousel
- Responsive navigation and newsletter digest flow
