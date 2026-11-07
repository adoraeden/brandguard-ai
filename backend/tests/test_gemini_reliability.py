import json
import os
import unittest
from contextlib import nullcontext
from unittest.mock import patch

from google import genai

import gemini_analyzer as analyzer


class SyntheticGeminiError(Exception):
    def __init__(self, code):
        super().__init__(f"synthetic HTTP {code}")
        self.code = code


class SequencedModels:
    def __init__(self, outcomes):
        self.outcomes = list(outcomes)
        self.calls = []

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        result = self.outcomes.pop(0)
        if isinstance(result, Exception):
            raise result
        return type("Response", (), {"text": json.dumps(result)})()


class SequencedClient:
    outcomes = []
    instances = []

    def __init__(self, **kwargs):
        self.options = kwargs.get("http_options")
        self.models = SequencedModels(self.outcomes)
        self.closed = False
        self.instances.append(self)

    def close(self):
        self.closed = True


class GeminiReliabilityTests(unittest.TestCase):
    def analyze(self, outcomes, max_attempts=None):
        SequencedClient.outcomes = outcomes
        SequencedClient.instances = []
        attempt_patch = (patch.object(analyzer, "GEMINI_MAX_ATTEMPTS", max_attempts)
                         if max_attempts is not None else nullcontext())
        with patch.dict(os.environ, {"GEMINI_API_KEY": "synthetic-test-key"}), \
             patch.object(genai, "Client", SequencedClient), \
             patch.object(analyzer.time, "sleep") as sleep, attempt_patch:
            result = analyzer.run_gemini_contextual_analysis(
                "Synthetic availability statement.", "Retry test", "general_communication",
                [], [], "review-retry-test", [])
        return result, sleep, SequencedClient.instances[0]

    def test_504_retries_once_with_bounded_backoff_and_configured_timeout(self):
        result, sleep, client = self.analyze([SyntheticGeminiError(504), []])
        self.assertEqual(result.status, "completed")
        self.assertEqual(len(client.models.calls), 2)
        self.assertEqual(sleep.call_args_list[0].args[0], 0.5)
        self.assertEqual(client.options.timeout, 20_000)
        self.assertEqual(client.options.retry_options.attempts, 1)
        self.assertEqual(client.models.calls[0]["model"], "gemini-3.1-flash-lite")
        self.assertTrue(client.closed)

    def test_required_transient_codes_are_retryable(self):
        for code in (429, 500, 502, 503, 504):
            with self.subTest(code=code):
                result, sleep, client = self.analyze([SyntheticGeminiError(code), []])
                self.assertEqual(result.status, "completed")
                self.assertEqual(len(client.models.calls), 2)
                sleep.assert_called_once()

    def test_backoff_delay_increases_exponentially_and_remains_capped(self):
        result, sleep, client = self.analyze(
            [SyntheticGeminiError(503), SyntheticGeminiError(504), []], max_attempts=3)
        self.assertEqual(result.status, "completed")
        self.assertEqual(len(client.models.calls), 3)
        self.assertEqual([call.args[0] for call in sleep.call_args_list], [0.5, 1.0])

    def test_exhausted_504_returns_timeout_status(self):
        result, sleep, client = self.analyze([SyntheticGeminiError(504), SyntheticGeminiError(504)])
        self.assertEqual(result.status, "timeout")
        self.assertIn("HTTP 504", result.message)
        self.assertIn("2 bounded attempt(s)", result.message)
        self.assertEqual(len(client.models.calls), 2)
        sleep.assert_called_once_with(0.5)

    def test_authentication_failure_is_not_retried_and_reports_service_status(self):
        result, sleep, client = self.analyze([SyntheticGeminiError(401)])
        self.assertEqual(result.status, "failed")
        self.assertIn("Check the API key", result.message)
        self.assertEqual(len(client.models.calls), 1)
        sleep.assert_not_called()

    def test_service_failure_is_distinct_after_retries(self):
        result, sleep, client = self.analyze([SyntheticGeminiError(503), SyntheticGeminiError(503)])
        self.assertEqual(result.status, "service_failure")
        self.assertIn("HTTP 503", result.message)
        self.assertEqual(len(client.models.calls), 2)
        sleep.assert_called_once_with(0.5)


if __name__ == "__main__":
    unittest.main()
