#!/usr/bin/env python3
"""
ragas_eval.py — Ragas-based RAG quality evaluation for alexpavsky.com.

Runs golden questions through the RAG API, then evaluates each answer with
Ragas metrics (faithfulness, answer_relevancy) using Groq as the LLM judge
and local sentence-transformers as embeddings.

Designed for both local development and nightly CI runs.

Usage (local):
    pip install -r eval/requirements.txt
    GROQ_API_KEY=... python eval/ragas_eval.py

Usage (CI):
    See .github/workflows/ragas-nightly.yml

Environment variables:
    GROQ_API_KEY       Required. Used as LLM judge for Ragas metrics.
    RAG_API_URL        Optional. Default: http://localhost:8001
    MIN_FAITHFULNESS   Optional. Default: 0.65. Build fails if avg below.
    MIN_RELEVANCY      Optional. Default: 0.55. Build fails if avg below.
    MAX_QUESTIONS      Optional. Limit number of questions (debugging).
    OUTPUT_PATH        Optional. Default: eval/results/report.md
"""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
QUESTIONS_PATH = ROOT / "tests" / "rag" / "golden_questions.json"
RESULTS_DIR = ROOT / "eval" / "results"

RAG_API_URL = os.environ.get("RAG_API_URL", "http://localhost:8001").rstrip("/")

# Judge providers are auto-detected from environment by build_provider_list().
# Supported (in priority order): groq, cerebras, sambanova, mistral,
# openrouter (3 models), huggingface. Each provider's API key is read from
# its respective env var: GROQ_API_KEY, CEREBRAS_API_KEY, SAMBANOVA_API_KEY,
# MISTRAL_API_KEY, OPENROUTER_API_KEY, HF_TOKEN.

MIN_FAITHFULNESS = float(os.environ.get("MIN_FAITHFULNESS", "0.65"))
MIN_RELEVANCY = float(os.environ.get("MIN_RELEVANCY", "0.55"))
MAX_QUESTIONS = int(os.environ.get("MAX_QUESTIONS", "0"))  # 0 = all
OUTPUT_PATH = Path(os.environ.get("OUTPUT_PATH", str(RESULTS_DIR / "report.md")))

REQUEST_DELAY_SEC = float(os.environ.get("REQUEST_DELAY_SEC", "1.0"))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def log(msg: str) -> None:
    print(msg, flush=True)


def fail(msg: str, code: int = 1) -> None:
    log(f"ERROR: {msg}")
    sys.exit(code)


def query_rag_api(question: str) -> dict[str, Any]:
    """Hit /api/rag/query and return the JSON response."""
    try:
        r = requests.post(
            f"{RAG_API_URL}/api/rag/query",
            json={"query": question},
            timeout=60,
        )
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        log(f"  WARN: RAG API call failed for '{question[:60]}...': {e}")
        return {"answer": "", "sources": [], "metrics": {}}


def keyword_score(answer: str, expected_any: list[str], min_matches: int = 1) -> dict[str, Any]:
    """Light keyword check — counts how many expected terms appear in the answer."""
    answer_lower = answer.lower()
    matches = [kw for kw in expected_any if kw.lower() in answer_lower]
    passed = len(matches) >= min_matches
    return {"matched": matches, "match_count": len(matches), "required": min_matches, "passed": passed}


def write_report(records: list[dict], summary: dict) -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    lines.append(f"# Ragas Evaluation Report\n")
    lines.append(f"_Generated: {datetime.now(timezone.utc).isoformat()}_\n")
    lines.append(f"\n## Summary\n")
    lines.append(f"| Metric | Value | Threshold | Status |")
    lines.append(f"|---|---|---|---|")
    lines.append(
        f"| Average faithfulness    | {summary['avg_faithfulness']:.3f} "
        f"| ≥ {MIN_FAITHFULNESS:.2f} | {'PASS' if summary['avg_faithfulness'] >= MIN_FAITHFULNESS else 'FAIL'} |"
    )
    lines.append(
        f"| Average answer_relevancy | {summary['avg_relevancy']:.3f} "
        f"| ≥ {MIN_RELEVANCY:.2f} | {'PASS' if summary['avg_relevancy'] >= MIN_RELEVANCY else 'FAIL'} |"
    )
    lines.append(f"| Keyword check pass rate | {summary['keyword_pass_rate']:.1%} | ≥ 60% | "
                 f"{'PASS' if summary['keyword_pass_rate'] >= 0.6 else 'FAIL'} |")
    lines.append(f"| Questions evaluated     | {summary['total']} | — | — |")
    lines.append(f"| Judge model             | `{summary.get('judge_model', 'unknown')}` | — | — |")
    lines.append(f"")

    lines.append(f"## Per-Question Results\n")
    lines.append("| ID | Category | Faithfulness | Relevancy | Keywords | Answer (preview) |")
    lines.append("|---|---|---|---|---|---|")
    import math
    for r in records:
        kw = "—" if r["keyword_passed"] is None else ("PASS" if r["keyword_passed"] else "FAIL")
        ans_prev = (r["answer"] or "")[:100].replace("\n", " ").replace("|", "\\|")
        f_str = "n/a" if math.isnan(r["faithfulness"]) else f"{r['faithfulness']:.2f}"
        r_str = "n/a" if math.isnan(r["relevancy"]) else f"{r['relevancy']:.2f}"
        lines.append(
            f"| {r['id']} | {r['category']} | {f_str} | {r_str} | {kw} | {ans_prev}... |"
        )

    OUTPUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    log(f"\nReport written to: {OUTPUT_PATH}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    log("=" * 72)
    log("Ragas RAG Quality Evaluation — alexpavsky.com")
    log("=" * 72)
    log(f"RAG API:       {RAG_API_URL}")
    log(f"Thresholds:    faithfulness >= {MIN_FAITHFULNESS}, relevancy >= {MIN_RELEVANCY}")
    log("")

    from rotating_llm import build_provider_list
    providers = build_provider_list()
    if not providers:
        fail("No judge API keys set. Set at least one of: GROQ_API_KEY, "
             "CEREBRAS_API_KEY, SAMBANOVA_API_KEY, MISTRAL_API_KEY, "
             "OPENROUTER_API_KEY, HF_TOKEN")
    log(f"Judge providers available: {len(providers)}")
    for p in providers:
        log(f"  - {p['name']:20s} / {p['model']}")

    # Health check
    try:
        h = requests.get(f"{RAG_API_URL}/api/health", timeout=5).json()
        log(f"Health: postgres={h.get('postgres')}, qdrant={h.get('qdrant')}")
    except Exception as e:
        fail(f"RAG API not reachable at {RAG_API_URL}: {e}")

    # Load questions
    if not QUESTIONS_PATH.exists():
        fail(f"Golden questions file not found: {QUESTIONS_PATH}")
    data = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    questions = (
        data.get("specific_facts", [])
        + data.get("concept_questions", [])
        + data.get("negative_tests", [])
    )
    if MAX_QUESTIONS > 0:
        questions = questions[:MAX_QUESTIONS]
    log(f"Loaded {len(questions)} golden questions\n")

    # Step 1: Hit RAG API for every question, collect (question, answer, contexts)
    log("Step 1/3: Querying RAG API for all questions...")
    log("-" * 72)
    samples_for_ragas: list[dict[str, Any]] = []
    records: list[dict[str, Any]] = []

    for i, q in enumerate(questions, 1):
        qid = q.get("id", f"q-{i}")
        question_text = q["question"]
        log(f"  [{i}/{len(questions)}] {qid}: {question_text[:70]}...")

        resp = query_rag_api(question_text)
        answer = resp.get("answer", "")
        # Prefer the full `contexts` array (un-truncated chunk text the LLM
        # actually saw). Fall back to `sources[].content` (300-char preview)
        # only if the API is on an older build — the preview is too short for
        # Ragas faithfulness to verify multi-fact answers.
        contexts = resp.get("contexts") or [
            s.get("content", "") for s in resp.get("sources", []) if s.get("content")
        ]
        sources = resp.get("sources", [])

        # Keyword check (cheap, doesn't need LLM)
        kw_terms = q.get("expected_contains") or q.get("expected_contains_any") or []
        min_matches = q.get("min_keyword_matches", 1)
        kw = keyword_score(answer, kw_terms, min_matches) if kw_terms else None
        if kw:
            log(f"      keywords: {kw['match_count']}/{kw['required']} required "
                f"({'PASS' if kw['passed'] else 'FAIL'}) — matched: {kw['matched']}")

        records.append({
            "id": qid,
            "category": q.get("category", "—"),
            "question": question_text,
            "answer": answer,
            "contexts_count": len(contexts),
            "faithfulness": 0.0,    # filled in step 2
            "relevancy": 0.0,       # filled in step 2
            "keyword_passed": kw["passed"] if kw else None,
            "keyword_matched": kw["matched"] if kw else [],
        })

        if contexts and answer:
            samples_for_ragas.append({
                "user_input": question_text,
                "response": answer,
                "retrieved_contexts": contexts,
                "_idx": len(records) - 1,
            })

        time.sleep(REQUEST_DELAY_SEC)

    log(f"\n  Collected {len(samples_for_ragas)} valid samples for Ragas evaluation\n")

    if not samples_for_ragas:
        fail("No valid samples to evaluate — check that documents are loaded in the RAG DB.")

    # Step 2: Run Ragas
    log("Step 2/3: Running Ragas evaluation (faithfulness + answer_relevancy)...")
    log("-" * 72)
    log("  Loading Ragas + langchain + sentence-transformers (first run is slow)...")

    try:
        from langchain_openai import ChatOpenAI
        from langchain_huggingface import HuggingFaceEmbeddings
        from ragas import evaluate, EvaluationDataset, SingleTurnSample
        from ragas.metrics import Faithfulness, ResponseRelevancy
        from ragas.llms import LangchainLLMWrapper
        from ragas.embeddings import LangchainEmbeddingsWrapper
    except ImportError as e:
        fail(f"Missing dependency: {e}. Run: pip install -r eval/requirements.txt")

    # Build rotating judge — auto-switches to next provider on rate limit / quota.
    # This is a custom LangChain ChatModel that wraps all available providers
    # and transparently rotates on errors. Ragas sees it as a normal LLM.
    from rotating_llm import RotatingJudgeLLM
    judge_llm = RotatingJudgeLLM(providers=providers, temperature=0, timeout=30)
    primary_name = providers[0]["name"]
    primary_model = providers[0]["model"]
    log(f"  Judge: rotating across {len(providers)} providers")
    log(f"  Primary: {primary_name} / {primary_model}")
    fallbacks = providers[1:]

    judge_embeds = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    log("  Embeddings: sentence-transformers/all-MiniLM-L6-v2 (local)")

    ragas_llm = LangchainLLMWrapper(judge_llm)
    ragas_embeds = LangchainEmbeddingsWrapper(judge_embeds)

    samples = [
        SingleTurnSample(
            user_input=s["user_input"],
            response=s["response"],
            retrieved_contexts=s["retrieved_contexts"],
        )
        for s in samples_for_ragas
    ]
    dataset = EvaluationDataset(samples=samples)

    log(f"  Evaluating {len(samples)} samples (this takes ~{len(samples) * 3}s)...")
    try:
        result = evaluate(
            dataset=dataset,
            metrics=[Faithfulness(), ResponseRelevancy()],
            llm=ragas_llm,
            embeddings=ragas_embeds,
            raise_exceptions=False,
            show_progress=True,
        )
    except Exception as e:
        fail(f"Ragas evaluation failed: {e}")

    # Convert to DataFrame and merge back into records.
    # NaN values mean the judge couldn't parse the answer — treat as missing,
    # not as zero, so they don't unfairly tank the average.
    import math
    df = result.to_pandas()
    for i, sample in enumerate(samples_for_ragas):
        idx = sample["_idx"]
        try:
            f_val = df.iloc[i].get("faithfulness", None)
            r_val = df.iloc[i].get("answer_relevancy", None)
            f_val = float(f_val) if f_val is not None else float("nan")
            r_val = float(r_val) if r_val is not None else float("nan")
            records[idx]["faithfulness"] = f_val
            records[idx]["relevancy"] = r_val
        except (IndexError, KeyError, ValueError, TypeError):
            records[idx]["faithfulness"] = float("nan")
            records[idx]["relevancy"] = float("nan")

    # Step 3: Summary + Report
    log("\nStep 3/3: Building report...")
    log("-" * 72)
    import math
    # Average only over non-NaN values (judge parsing failures excluded).
    f_vals = [r["faithfulness"] for r in records if not math.isnan(r["faithfulness"])]
    r_vals = [r["relevancy"] for r in records if not math.isnan(r["relevancy"])]
    avg_f = sum(f_vals) / max(len(f_vals), 1) if f_vals else 0.0
    avg_r = sum(r_vals) / max(len(r_vals), 1) if r_vals else 0.0
    parse_failures_f = len(records) - len(f_vals)
    parse_failures_r = len(records) - len(r_vals)

    kw_passes = [r["keyword_passed"] for r in records if r["keyword_passed"] is not None]
    kw_rate = sum(1 for p in kw_passes if p) / max(len(kw_passes), 1) if kw_passes else 0.0

    summary = {
        "avg_faithfulness": avg_f,
        "avg_relevancy": avg_r,
        "keyword_pass_rate": kw_rate,
        "total": len(records),
        "f_parsed": len(f_vals),
        "r_parsed": len(r_vals),
        "f_failures": parse_failures_f,
        "r_failures": parse_failures_r,
        "judge_model": f"{primary_name}/{primary_model} (+{len(fallbacks)} fallbacks)",
    }

    log("")
    log("Results")
    log("-" * 72)
    log(f"  Average faithfulness:     {avg_f:.3f}   (threshold {MIN_FAITHFULNESS:.2f}, parsed {summary['f_parsed']}/{len(records)})")
    log(f"  Average answer_relevancy: {avg_r:.3f}   (threshold {MIN_RELEVANCY:.2f}, parsed {summary['r_parsed']}/{len(records)})")
    log(f"  Keyword check pass rate:  {kw_rate:.1%}")
    log(f"  Samples evaluated:        {len(records)}")
    if parse_failures_f or parse_failures_r:
        log(f"  Judge parse failures:     faithfulness={parse_failures_f}, relevancy={parse_failures_r}")
        log(f"  (These are usually short answers the judge can't fact-check)")
    log("")

    write_report(records, summary)

    # Per-question pass/fail summary, consumed by .github/scripts/notify_slack.py
    # (via ragas-nightly.yml) to populate the #qa-rag-eval Slack post.
    def _is_passed(r: dict) -> bool:
        if not r.get("keyword_passed"):
            return False
        f = r.get("faithfulness", float("nan"))
        rel = r.get("relevancy", float("nan"))
        if math.isnan(f) or math.isnan(rel):
            return False
        return f >= MIN_FAITHFULNESS and rel >= MIN_RELEVANCY

    passed_count = sum(1 for r in records if _is_passed(r))
    summary_json = {
        "passed": passed_count,
        "failed": len(records) - passed_count,
        "flaky": 0,
        "skipped": 0,
        "total": len(records),
        "avg_faithfulness": avg_f,
        "avg_relevancy": avg_r,
        "keyword_pass_rate": kw_rate,
    }
    (RESULTS_DIR / "summary.json").write_text(
        json.dumps(summary_json, indent=2), encoding="utf-8"
    )

    # Exit code: pass/fail based on thresholds
    failed_checks: list[str] = []
    if avg_f < MIN_FAITHFULNESS:
        failed_checks.append(f"faithfulness {avg_f:.3f} < {MIN_FAITHFULNESS}")
    if avg_r < MIN_RELEVANCY:
        failed_checks.append(f"relevancy {avg_r:.3f} < {MIN_RELEVANCY}")

    if failed_checks:
        log("FAIL: " + "; ".join(failed_checks))
        return 1

    log("PASS: all thresholds met")
    return 0


if __name__ == "__main__":
    sys.exit(main())
