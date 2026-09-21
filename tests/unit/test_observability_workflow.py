import unittest
from pathlib import Path


class ObservabilityWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = Path(
            ".github/workflows/agent-observability.yml"
        ).read_text(encoding="utf-8")

    def test_manual_and_scheduled_runs_use_the_lifecycle_gateway(self):
        self.assertIn("LOCAL_LLM_BASE_URL: http://127.0.0.1:11445/v1", self.workflow)
        self.assertIn("LOCAL_LLM_MODEL: gpt-oss:120b", self.workflow)
        self.assertNotIn("scheduled/gpt-oss:120b", self.workflow)
        self.assertNotIn("http://127.0.0.1:11434/v1", self.workflow)

    def test_job_timeout_exceeds_the_longest_model_wait(self):
        self.assertIn("timeout-minutes: 360", self.workflow)
        self.assertIn("github.event_name == 'schedule' && '18000' || '3600'", self.workflow)

    def test_only_a_run_that_acquired_a_lease_releases_it(self):
        wait = self.workflow.split("- name: Wait for local evaluator", 1)[1]
        self.assertIn("id: local_evaluator", wait)
        self.assertIn('echo "lease_acquired=true" >> "$GITHUB_OUTPUT"', wait)
        release = self.workflow.split("- name: Release background model lease", 1)[1]
        self.assertIn(
            "if: always() && steps.local_evaluator.outputs.lease_acquired == 'true'",
            release,
        )
        self.assertIn("/release/background", release)


if __name__ == "__main__":
    unittest.main()
