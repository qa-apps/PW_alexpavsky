#!/usr/bin/env python3
"""
giskard_scan.py — Giskard red-team / vulnerability scan.

Runs adversarial probes across 7 categories:
  hallucination, injection, harmfulness, stereotypes,
  robustness, sensitive_topics, jailbreak.

Giskard auto-generates its own adversarial prompts inside each category;
the exact count per detector is decided by Giskard's defaults (typically
3-10 probes per detector). With 7 categories enabled, total LLM calls
are ~30-70 — small enough to finish in ~5 minutes on the free tier and
share the 30-min CI timeout with Ragas + giskard_rag.

Exit code:
  0 — scan completed (issues are reported in HTML, not failed in CI)
  1 — scan itself crashed (LLM unreachable, all providers down)
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import requests

RAG_API = os.environ.get("RAG_API_URL", "https://alexpavsky.com").rstrip("/")
RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)

SCAN_CATEGORIES = [
    "hallucination",
    "injection",
    "harmfulness",
    "stereotypes",
    "robustness",
    "sensitive_topics",
    "jailbreak",
]


def log(msg: str) -> None:
    print(msg, flush=True)


def fail(msg: str) -> None:
    log(f"\nFAIL: {msg}")
    sys.exit(1)


def query_rag(question: str) -> str:
    try:
        r = requests.post(
            f"{RAG_API}/api/rag/query",
            json={"query": question},
            timeout=60,
        )
        r.raise_for_status()
        return r.json().get("answer", "")
    except Exception as e:
        return f"[error: {e}]"


def main() -> None:
    log("=" * 72)
    log("Giskard Vulnerability Scan")
    log("=" * 72)
    log(f"  RAG_API:    {RAG_API}")
    log(f"  Categories: {', '.join(SCAN_CATEGORIES)}")
    log("")

    try:
        import pandas as pd
        import giskard
    except ImportError as e:
        fail(f"Missing dependency: {e}. Run: pip install -r eval/requirements.txt")

    from rotating_llm import build_provider_list
    providers = build_provider_list()
    if not providers:
        fail("No LLM provider keys configured.")

    primary = providers[0]
    log(f"  Judge: {primary['name']}/{primary['model']} (+{len(providers)-1} fallbacks)")

    # Point Giskard at the primary provider via the OpenAI-compatible env.
    os.environ["OPENAI_API_KEY"] = primary["api_key"]
    os.environ["OPENAI_API_BASE"] = primary["base_url"]
    try:
        giskard.llm.set_llm_model(f"openai/{primary['model']}")
        # Use HF embeddings — Groq/Cerebras/etc don't serve embedding endpoints.
        if os.environ.get("HF_TOKEN"):
            giskard.llm.set_embedding_model(
                "huggingface/sentence-transformers/all-MiniLM-L6-v2"
            )
    except Exception as e:
        log(f"  WARN: Giskard config helper failed ({e}); relying on env defaults")

    # Wrap our RAG endpoint as a Giskard model. Giskard will pass DataFrames
    # of probe prompts; we extract the `question` column and return a Series.
    def predict_fn(df: "pd.DataFrame") -> "pd.Series":
        return df["question"].apply(query_rag)

    model = giskard.Model(
        model=predict_fn,
        model_type="text_generation",
        name="alexpavsky-rag",
        description=(
            "QA assistant trained on Playwright, LLM evaluation, RAG testing, "
            "MCP, agentic testing, cloud-native QA, and the FinNova case study. "
            "Should refuse to leak PII, ignore prompt injections, and avoid harmful content."
        ),
        feature_names=["question"],
    )

    log("")
    log(f"Running scan across {len(SCAN_CATEGORIES)} categories...")
    t0 = time.time()
    try:
        report = giskard.scan(
            model,
            only=SCAN_CATEGORIES,
            raise_exceptions=False,
        )
    except Exception as e:
        fail(f"Scan crashed: {e}")
    log(f"  Done in {time.time()-t0:.1f}s")

    html_path = RESULTS_DIR / "giskard_scan.html"
    json_path = RESULTS_DIR / "giskard_scan.json"
    try:
        report.to_html(str(html_path))
        log(f"  HTML report: {html_path}")
    except Exception as e:
        log(f"  WARN: could not write HTML: {e}")

    # Aggregate by category.
    by_cat: dict[str, int] = {c: 0 for c in SCAN_CATEGORIES}
    try:
        issues = list(report.issues) if hasattr(report, "issues") else []
        for issue in issues:
            group = getattr(getattr(issue, "group", None), "name", None) \
                or str(getattr(issue, "group", "unknown")).lower()
            for c in SCAN_CATEGORIES:
                if c in group.lower():
                    by_cat[c] += 1
                    break
    except Exception as e:
        log(f"  WARN: could not enumerate issues: {e}")
        issues = []

    summary = {
        "rag_api": RAG_API,
        "categories": SCAN_CATEGORIES,
        "judge": f"{primary['name']}/{primary['model']}",
        "total_issues": len(issues),
        "issues_by_category": by_cat,
    }
    json_path.write_text(json.dumps(summary, indent=2))

    log("")
    log("=" * 72)
    log(f"Scan complete: {len(issues)} issues found across {len(SCAN_CATEGORIES)} categories")
    for c, n in by_cat.items():
        log(f"  {c:20s} {n}")
    log("=" * 72)


if __name__ == "__main__":
    main()
