import json
import os
import unittest
from unittest.mock import patch

from google import genai

from gemini_analyzer import run_gemini_contextual_analysis
from models import ApprovedFactModel


class FakeModels:
    def __init__(self, payload):
        self.payload = payload
        self.calls = 0

    def generate_content(self, **_kwargs):
        self.calls += 1
        return type('Response', (), {'text': json.dumps(self.payload)})()


class FakeClient:
    payload = []

    def __init__(self, **_kwargs):
        self.models = FakeModels(self.payload)

    def close(self):
        pass


def finding(*, category, evidence_id, evidence_type, quote, exact_text):
    return {
        'title': 'Claim review',
        'category': category,
        'severity': 'medium',
        'exactText': exact_text,
        'explanation': 'Review this statement against the approved record.',
        'evidenceRecordId': evidence_id,
        'evidenceRecordType': evidence_type,
        'evidenceQuote': quote,
        'confidence': 'high',
        'suggestedText': 'A more careful statement.',
        'suggestionRationale': 'Avoids an unsupported absolute.',
        'authorIntentPreserved': 'Retains the core message.',
    }


class GeminiEvidenceTests(unittest.TestCase):
    def analyze(self, draft, payload, facts=None):
        FakeClient.payload = payload
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
             patch.object(genai, 'Client', FakeClient):
            return run_gemini_contextual_analysis(
                draft, 'Evidence test', 'general_communication', [], facts or [],
                'review-evidence-test', [])

    def test_rejects_mismatched_evidence(self):
        fact = ApprovedFactModel(
            id='fact-security', title='SOC-2 Audit',
            statement='SOC-2 Type II controls were independently audited.',
            category='security', source='Audit factsheet',
            verificationStatus='verified', lastUpdated='2026-11-07')
        item = finding(category='direct_contradiction', evidence_id=fact.id,
                       evidence_type='fact', quote='SOC-2 Type II controls',
                       exact_text='Our platform has 100% uptime.')

        result = self.analyze(item['exactText'], [item], [fact])

        self.assertEqual(result.status, 'failed')
        self.assertEqual(result.findings, [])
        self.assertIn('unapproved evidence', result.message)

    def test_labels_claim_without_evidence_as_insufficient(self):
        item = finding(category='unsupported_claim', evidence_id=None,
                       evidence_type=None, quote='', exact_text='Our AI is 100% accurate.')

        result = self.analyze(item['exactText'], [item])

        self.assertEqual(result.status, 'completed')
        self.assertEqual(result.findings[0].title, 'Insufficient Evidence')
        self.assertIsNone(result.findings[0].evidenceRecordId)
        self.assertIn('No directly relevant approved source', result.findings[0].sourceReference)
        self.assertNotEqual(result.findings[0].confidence, 'high')
        self.assertIsNone(result.findings[0].suggestion)

    def test_accepts_exact_quote_from_matching_approved_fact(self):
        fact = ApprovedFactModel(
            id='fact-uptime', title='Availability SLA',
            statement='The service provides a 99.95% verified uptime SLA each month.',
            category='availability', source='Operational SLA factsheet',
            verificationStatus='verified', lastUpdated='2026-11-07')
        item = finding(category='direct_contradiction', evidence_id=fact.id,
                       evidence_type='fact', quote='99.95% verified uptime SLA',
                       exact_text='Our service provides a 99.95% verified uptime SLA.')

        result = self.analyze(item['exactText'], [item], [fact])

        self.assertEqual(result.status, 'completed')
        self.assertEqual(len(result.findings), 1)
        self.assertEqual(result.findings[0].evidenceRecordType, 'fact')
        self.assertEqual(result.findings[0].evidenceRecordId, fact.id)
        self.assertEqual(result.findings[0].evidenceQuote, item['evidenceQuote'])
        self.assertIn(fact.id, result.findings[0].sourceReference)

    def test_drops_suggestion_with_unapproved_numbers_or_certifications(self):
        fact = ApprovedFactModel(
            id='fact-uptime', title='Availability SLA',
            statement='The service provides a 99.95% verified uptime SLA each month.',
            category='availability', source='Operational SLA factsheet',
            verificationStatus='verified', lastUpdated='2026-11-07')
        item = finding(category='direct_contradiction', evidence_id=fact.id,
                       evidence_type='fact', quote='99.95% verified uptime SLA',
                       exact_text='Our service provides a 99.95% verified uptime SLA.')
        item['suggestedText'] = 'ISO 9001 certified with 99.99% uptime.'

        result = self.analyze(item['exactText'], [item], [fact])

        self.assertEqual(result.status, 'completed')
        self.assertIsNone(result.findings[0].suggestion)


if __name__ == '__main__':
    unittest.main()
