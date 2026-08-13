# Playwright good practices (this repo)

## Locators

- Prefer **role / label / text** over CSS when stable:
  `getByRole`, `getByLabel`, `getByText`, `getByTestId`.
- Put repeating selectors in **`pages/`** (Page Object Model). Specs import POM
  methods; they should not grow long `page.locator()` chains.
- Avoid brittle full-path CSS and nth-child chains tied to layout order.
- For dynamic copy, match with a **regex** or a stable substring — not a full
  sentence that marketing can rewrite.

## Waiting (flake killers)

**Do**

- `await expect(locator).toBeVisible()` / `toHaveText()` / `toBeEnabled()`
- `locator.waitFor({ state: 'visible' })` when you need an explicit wait
- Assert on **UI state** the user can see

**Do not**

- `waitForTimeout(N)` / `sleep()` as a “fix”
- `waitForLoadState('networkidle')` on this site — chat widget + analytics keep
  the network busy and the wait can hang. Prefer `domcontentloaded` + element waits.

## POM rules

- New specs import from `pages/` — no fresh multi-step locator soup in the test body.
- Known hotspots that belong in POM when touched: live rail, feed, chat toggle,
  auth forms.
- One page class ≈ one product surface; shared chrome can live in a base helper.

## Assertions

- Assert outcomes, not implementation details (class names that only style).
- For chat / LLM answers: separate **UI plumbing** tests (`@pure`) from
  **quality judges** (`@llm-judge`). Do not mix a free-tier judge into a merge gate.
- Design / screenshot failures (`@design`, `toHaveScreenshot`) are **owner
  decisions**. Do not auto-update baselines or loosen thresholds to go green.

## Isolation

- Each test must stand alone: no order dependence, no shared mutable file state.
- Prefer fresh browser context via Playwright fixtures.
- Auth: use the project’s established login helper / storage pattern; do not
  hard-code session cookies into specs.

## Data and environment

- Target is live `baseURL` (see `playwright.config.ts`) unless a test explicitly
  mocks an API.
- Secrets only via env / CI secrets. Never commit `.env`.
- When a flow needs a file upload, use fixtures under the repo (or documented
  paths) — not machine-specific Desktop paths.

## Debugging

```bash
npx playwright test path/spec.ts --debug
npx playwright test path/spec.ts --headed
npm run report          # last HTML report + traces
npm run mcp:playwright  # live DOM via MCP (see agents/playwright-mcp.md)
```

Use the **healer** agent for systematic fix loops; use **triage** first when it
is unclear whether the site or the test broke.
