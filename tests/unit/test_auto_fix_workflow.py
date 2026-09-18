import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class AutoFixWorkflowTests(unittest.TestCase):
    def test_agent_fix_uses_only_opencode_with_a_long_reasoning_timeout(self):
        workflow = (ROOT / ".github/workflows/auto-fix.yml").read_text()
        agent = (ROOT / ".github/scripts/auto_fix_agent.py").read_text()

        self.assertIn("LLM_PROVIDER_MODE:  opencode-only", workflow)
        self.assertIn('AGENT_FIX_LLM_TIMEOUT_SEC: "480"', workflow)
        self.assertIn("issues: write", workflow)
        self.assertIn("actions: write", workflow)
        self.assertNotIn("OPENROUTER", workflow.upper())
        self.assertIn("timeout=AGENT_LLM_TIMEOUT", agent)

    def test_fix_pr_dispatches_the_exact_sha_to_the_two_model_gate(self):
        agent = (ROOT / ".github/scripts/auto_fix_agent.py").read_text()
        review = (ROOT / ".github/workflows/agent-observability.yml").read_text()

        self.assertIn("def dispatch_merge_gate", agent)
        self.assertIn('review_sha = git("rev-parse", "HEAD")', agent)
        self.assertIn('"gpt-5.6-luna", "responses"', review)
        self.assertIn('"mimo-v2.5", "chat/completions"', review)
        self.assertIn("Both independent OpenCode models must approve", review)

    def test_merge_requires_unchanged_sha_and_green_playwright(self):
        review = (ROOT / ".github/workflows/agent-observability.yml").read_text()

        self.assertIn('if [ "$current_sha" != "$REVIEW_SHA" ]', review)
        self.assertIn('select(.name == "playwright")', review)
        self.assertIn('--match-head-commit "$REVIEW_SHA"', review)
        self.assertIn("steps.pr_gate.outcome == 'failure'", review)
        self.assertIn("HUMAN_REVIEW_CHANNEL_ID", review)


if __name__ == "__main__":
    unittest.main()
