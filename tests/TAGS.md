# Playwright test tags (CI lanes)

Tags are set on `test.describe(..., { tag: [...] }, () => { ... })`.
CI filters with `npx playwright test --grep "@tag"`.

## CI lanes (mutually exclusive for gate purposes)

| Tag | CI workflow / step | Blocks merge? | Meaning |
|-----|--------------------|---------------|---------|
| `@pure` | `playwright-ci.yml` → PURE | **Yes** | Deterministic UI/API/security against our site only |
| `@upstream` | `playwright-ci.yml` → UPSTREAM | No | Live LLM, external RSS, or flaky third-party |
| `@llm-judge` | `llm-quality.yml` | No | LLM-as-a-judge scoring of chatbot answers |
| `@design` | `design-check.yml` | Design owner | Visual snapshots / layout baselines |

## Domain tags (optional filters)

| Tag | Folder / scope |
|-----|----------------|
| `@api` | `tests/api/` |
| `@security` | `tests/security/` |
| `@admin` `@rag` | `tests/admin/rag/` |
| `@llm` | `tests/llm/` |
| `@regression` | `tests/regression/` |
| `@smoke` | `tests/smoke/` |

## Local commands

```bash
npm run test:pure          # same as CI blocking lane
npm run test:upstream      # live LLM / feed
npm run test:llm-judge     # judge suite
npm run test:design        # visual baselines
npm run test:api           # domain: API
npm run test:security
npm run test:admin:rag
npm run test:llm
npm run test:regression
npm run test:smoke
```

## Rules for new tests

1. Every `test.describe` **must** set `tag: [...]`.
2. Exactly one of `@pure` | `@upstream` | `@llm-judge` | `@design` for CI routing.
3. Add a domain tag matching the folder (`@api`, `@security`, …).
4. If the test calls production `/api/chat`, RAG with a live LLM, or external RSS → `@upstream` (never `@pure` alone).
5. Prefer formal `tag:` over stuffing markers into the title string (titles may still mention the lane for humans).
