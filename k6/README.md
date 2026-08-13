# k6 performance

- **Script:** `site.js`
- **Results:** `results/` (gitignored) — HTML + JSON summaries per scenario

```bash
npm run performance              # default / smoke-ish
npm run performance:load
mkdir -p k6/results && k6 run -e PERFORMANCE_SCENARIO=smoke k6/site.js
```

CI: `.github/workflows/k6-performance.yml` writes to `k6/results/`.
