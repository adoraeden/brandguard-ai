import json
import os
import unittest
from unittest.mock import patch

from google import genai

from gemini_analyzer import (_approved_evidence, _retrieve_evidence,
                             MAX_RETRIEVED_EVIDENCE,
                             run_gemini_contextual_analysis)
from models import (ApprovedFactModel, BrandGuidelineModel,
                    TerminologyEntryModel)


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
    def analyze(self, draft, payload, facts=None, title="Evidence test",
                guidelines=None, terminology=None, sources=None):
        FakeClient.payload = payload
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
             patch.object(genai, 'Client', FakeClient):
            return run_gemini_contextual_analysis(
                draft, title, 'general_communication', guidelines or [],
                facts or [], 'review-evidence-test', [], terminology or [],
                sources or [])

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

        self.assertEqual(result.status, 'evidence_validation_failure')
        self.assertEqual(result.findings, [])
        self.assertIn('evidence validation', result.message)

    def test_glowpure_product_name_and_heading_are_excluded_but_claims_need_evidence(self):
        product = 'GlowPure Vitamin C Brightening Serum'
        claims = [
            '15% Vitamin C concentration',
            'Visibly brighter-looking skin in 7 days',
            'Dermatologically tested',
            'Suitable for all skin types',
        ]
        draft = '\n'.join([
            product,
            'Campaign: Radiance Reset',
            'Key Benefits',
            *claims,
        ])
        model_findings = [
            finding(category='unsupported_claim', evidence_id=None, evidence_type=None,
                    quote='', exact_text=product),
            finding(category='unsupported_claim', evidence_id=None, evidence_type=None,
                    quote='', exact_text='Key Benefits'),
            finding(category='unsupported_claim', evidence_id=None, evidence_type=None,
                    quote='', exact_text='Radiance Reset'),
            *[finding(category='unsupported_claim', evidence_id=None, evidence_type=None,
                      quote='', exact_text=claim) for claim in claims],
        ]

        result = self.analyze(draft, model_findings, title='GlowPure product launch copy')

        self.assertEqual(result.status, 'completed')
        self.assertEqual([item.exactText for item in result.findings], claims)
        self.assertTrue(all(item.title == 'Insufficient Evidence' for item in result.findings))
        self.assertTrue(all(item.evidenceRecordId is None for item in result.findings))
        self.assertTrue(all(item.evidenceRecordType is None for item in result.findings))
        self.assertTrue(all('no direct supporting approved source' in item.explanation.lower()
                            for item in result.findings))

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

    def test_valid_finding_survives_while_mismatched_finding_is_reported_as_partial(self):
        fact = ApprovedFactModel(
            id='fact-uptime', title='Availability SLA',
            statement='The service provides a 99.95% verified uptime SLA each month.',
            category='availability', source='Operational SLA factsheet',
            verificationStatus='verified', lastUpdated='2026-11-07')
        valid = finding(category='direct_contradiction', evidence_id=fact.id,
                        evidence_type='fact', quote='99.95% verified uptime SLA',
                        exact_text='Our service provides a 99.95% verified uptime SLA.')
        invalid = finding(category='direct_contradiction', evidence_id=fact.id,
                          evidence_type='fact', quote='SOC-2 certification',
                          exact_text='Our service is SOC-2 certified.')

        result = self.analyze(' '.join([valid['exactText'], invalid['exactText']]),
                              [valid, invalid], [fact])

        self.assertEqual(result.status, 'partial')
        self.assertEqual(len(result.findings), 1)
        self.assertEqual(result.findings[0].exactText, valid['exactText'])
        self.assertIn('1 finding(s)', result.message)

    def test_accepts_policy_guideline_citation_without_literal_claim_words(self):
        guideline = BrandGuidelineModel(
            id='bg-tone-test', title='Professional Tone',
            category='tone_of_voice',
            description='Use a professional tone. Avoid slang, aggressive language, and exaggerated claims.',
            severity='medium', sourceReference='Tone standard',
            status='active', lastUpdated='2026-11-07')
        item = finding(
            category='contextual_inconsistency', evidence_id=guideline.id,
            evidence_type='guideline',
            quote='Avoid slang, aggressive language, and exaggerated claims.',
            exact_text='Experience uninterrupted forever')

        result = self.analyze(item['exactText'], [item], guidelines=[guideline])

        self.assertEqual(result.status, 'completed')
        self.assertEqual(len(result.findings), 1)
        self.assertEqual(result.findings[0].evidenceRecordId, guideline.id)
        self.assertEqual(result.findings[0].evidenceRecordType, 'guideline')

    def test_nearby_number_does_not_block_null_evidence_for_unsupported_claim(self):
        fact = ApprovedFactModel(
            id='fact-uptime-nearby', title='Availability SLA',
            statement='The service provides a 99.95% verified uptime SLA each month.',
            category='uptime_performance', source='Operational SLA factsheet',
            verificationStatus='verified', lastUpdated='2026-11-07')
        claim = 'guarantee 99.99% accuracy for every customer'
        item = finding(category='unsupported_claim', evidence_id=None,
                       evidence_type=None, quote='', exact_text=claim)

        result = self.analyze(claim, [item], facts=[fact])

        self.assertEqual(result.status, 'completed')
        self.assertEqual(len(result.findings), 1)
        self.assertEqual(result.findings[0].title, 'Insufficient Evidence')
        self.assertIsNone(result.findings[0].evidenceRecordId)

    def test_unknown_evidence_reference_has_distinct_diagnostic(self):
        item = finding(category='direct_contradiction',
                       evidence_id='fact-does-not-exist', evidence_type='fact',
                       quote='99.95% verified uptime SLA',
                       exact_text='Our service has 100% uptime.')

        result = self.analyze(item['exactText'], [item])

        self.assertEqual(result.status, 'evidence_validation_failure')
        self.assertIn('unknown or unavailable evidence reference', result.message)

    def test_quote_mismatch_has_distinct_diagnostic(self):
        fact = ApprovedFactModel(
            id='fact-uptime-quote', title='Availability SLA',
            statement='The service provides a 99.95% verified uptime SLA each month.',
            category='uptime_performance', source='Operational SLA factsheet',
            verificationStatus='verified', lastUpdated='2026-11-07')
        item = finding(category='direct_contradiction', evidence_id=fact.id,
                       evidence_type='fact', quote='SOC-2 Type II controls',
                       exact_text='Our service provides 100% uptime.')

        result = self.analyze(item['exactText'], [item], facts=[fact])

        self.assertEqual(result.status, 'evidence_validation_failure')
        self.assertIn('quote not found in the approved record', result.message)

    def test_evidence_kind_must_be_permitted_for_finding_category(self):
        terminology = TerminologyEntryModel(
            id='term-uptime-test', preferredTerm='99.95% verified uptime SLA',
            restrictedTerm='100% zero downtime',
            explanation='Contradicts the verified uptime SLA.',
            approvedAlternative='99.95% verified uptime SLA',
            category='capability_claim', priority='critical', status='active',
            createdAt='2026-07-01')
        item = finding(category='direct_contradiction',
                       evidence_id=terminology.id,
                       evidence_type='terminology',
                       quote='100% zero downtime',
                       exact_text='100% zero downtime')

        result = self.analyze(item['exactText'], [item], terminology=[terminology])

        self.assertEqual(result.status, 'evidence_validation_failure')
        self.assertIn('not permitted for the finding category', result.message)

    def test_retrieval_caps_catalog_and_ranks_relevant_evidence_first(self):
        facts = [
            ApprovedFactModel(
                id='fact-target', title='Uptime SLA',
                statement='AuraCloud provides a 99.95% verified uptime SLA.',
                category='uptime_performance', source='SLA factsheet',
                verificationStatus='verified', lastUpdated='2026-11-07')
        ]
        facts.extend(
            ApprovedFactModel(
                id=f'fact-handbook-{index}', title=f'Handbook entry {index}',
                statement=f'Internal handbook entry {index} about office procedures.',
                category='company_history', source='Handbook',
                verificationStatus='verified', lastUpdated='2026-11-07')
            for index in range(1, 31)
        )

        records = _approved_evidence([], [], facts, [])
        retrieved = _retrieve_evidence(
            records, 'Our uptime claim is 99.95%.', 'Availability draft')

        self.assertEqual(len(retrieved), MAX_RETRIEVED_EVIDENCE)
        self.assertEqual(retrieved[0].id, 'fact-target')
        self.assertTrue(all(record.category for record in retrieved))

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
