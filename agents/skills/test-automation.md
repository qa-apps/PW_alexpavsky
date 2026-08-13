# Test automation — suite skills (alexpavsky.com)

This repo is **Playwright-only E2E** for the live site
https://www.alexpavsky.com. Application source is a **separate** repo:
`/Users/alexp/Projects/alexpavsky`. Never edit application code from here.

## What belongs in this suite

- Specs that assert **user-visible behavior** on the live site
- Page objects under `pages/`
- Fixtures and helpers under `utils/`
- Tag-gated suites for CI cost control (`@pure`, `@upstream`, `@llm-judge`, `@design`, plus domain tags)

## What does not belong

- Application / site source changes
- One-off manual notes in `tests/`
- Hard-coded secrets (use `.env` / CI secrets)
- Duplicated selectors inlined across specs (use POM)

## Domain layout

```
tests/
  smoke/         @smoke
  api/           @api
  security/      @security
  admin/rag/     @rag
  llm/           @llm / @llm-judge
  regression/    @regression
  design…        @design
```

Prefer putting a new file under the domain folder that matches its tag.

## Formal tags (CI)

| Tag | Intent | Typical CI treatment |
|-----|--------|----------------------|
| `@pure` | Deterministic, no external LLM | Gate / block merges |
| `@upstream` | Depends on third-party / live data | Informational or isolated |
| `@llm-judge` | Calls an LLM judge | Informational; rate-limited |
| `@design` | Visual / layout assertions | Owner decision; do not auto-fix |

See `TAGS.md` if present, and `package.json` scripts (`test:pure`, `test:llm-judge`, …).

## Commands (quick)

```bash
npm test
npm run test:smoke
npm run test:pure
npm run test:chromium
npx playwright test tests/path/spec.ts --headed
npm run report
```

## CI mental model

- **Deterministic Playwright** (`.github/workflows/playwright-ci.yml`) blocks merges.
- **LLM-quality** workflows are noisy on free tiers — treat as signal, not hard gate.
- Auto-fix may open PRs that touch **tests only**; it must never merge or change the site.

## Artifacts (do not hand-edit)

- `test-results/` (Playwright recordings + daily evidence), `playwright-report/`, `k6/results/`, `judge-verdicts/`
- `qa-report-ui/reports/*.json` — daily QA loop output

Regenerate via tools; stale hand-edits mislead the next run.
