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

    def test_every_run_releases_its_background_lease(self):
        release = self.workflow.split("- name: Release background model lease", 1)[1]
        self.assertIn("if: always()", release)
        self.assertIn("/release/background", release)


if __name__ == "__main__":
    unittest.main()
