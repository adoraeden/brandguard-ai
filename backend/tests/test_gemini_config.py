import unittest

import gemini_analyzer


class GeminiConfigurationTests(unittest.TestCase):
    def test_required_model_remains_configured(self):
        self.assertEqual(gemini_analyzer.GEMINI_MODEL, "gemini-3.1-flash-lite")

    def test_request_timeout_and_attempt_bound_are_finite(self):
        self.assertGreater(gemini_analyzer.GEMINI_TIMEOUT_MS, 0)
        self.assertEqual(gemini_analyzer.GEMINI_MAX_ATTEMPTS, 2)


if __name__ == "__main__":
    unittest.main()
