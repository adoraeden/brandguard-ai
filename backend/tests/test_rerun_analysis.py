import unittest
from datetime import datetime
from unittest.mock import patch

from database import (DBApprovedFact, DBBrandGuideline, DBDecisionAudit,
                      DBKnowledgeSource, DBReviewDocument, DBReviewFinding,
                      DBReviewSuggestion, DBTerminology)
from gemini_analyzer import GeminiAnalysisResult
from models import (AnalysisRerunRequest, ApprovedFactModel, BrandGuidelineModel,
                    ReviewFindingModel, SuggestionModel)
import routers.reviews as reviews
from rule_engine import run_python_deterministic_checks


ABSOLUTE_CLAIM_DRAFT = (
    'Our platform guarantees 100% protection against every cyber threat '
    'and delivers perfect results every time.'
)


class FakeQuery:
    def __init__(self, session, model):
        self.session = session
        self.model = model

    def filter(self, *_args, **_kwargs):
        return self

    def with_for_update(self):
        return self

    def first(self):
        return self.session.row if self.model is DBReviewDocument else None

    def all(self):
        return []


class FakeSession:
    def __init__(self, row):
        self.row = row
        self.audit_entries = []

    def query(self, model):
        return FakeQuery(self, model)

    def add(self, item):
        if isinstance(item, DBDecisionAudit):
            self.audit_entries.append(item)

    def commit(self):
        pass

    def refresh(self, _row):
        pass

    def rollback(self):
        pass


def make_row(*, status='in_review', decision_status='pending', findings=None):
    now = datetime.utcnow()
    return DBReviewDocument(
        id='review-rerun-test', title='Rerun regression', content_type='general_communication',
        original_content=ABSOLUTE_CLAIM_DRAFT, current_content=ABSOLUTE_CLAIM_DRAFT,
        status=status, reviewer='Original Reviewer', decision_status=decision_status,
        decision_notes='Existing human decision', decided_at='2026-11-07T12:00:00' if status == 'completed' else None,
        summary={'totalFindings': len(findings or []), 'unresolvedFindings': 0},
        ai_analysis_status='failed', ai_analysis_message='Earlier Gemini failure',
        deterministic_analysis_status='completed', deterministic_analysis_message=None,
        last_analysis_run_id=None, created_at=now, updated_at=now,
        findings=findings or [], audit_history=[])


def make_finding(review_id, *, text='100% protection against every cyber threat', title='Contextual finding'):
    return ReviewFindingModel(
        id=f'test-{title}', reviewId=review_id, title=title,
        category='unsupported_claim', severity='medium', exactText=text,
        explanation='No direct approved evidence supports this absolute claim.',
        sourceRuleOrTerm='Insufficient Evidence',
        sourceReference='No directly relevant approved source was found in the database.',
        detectionMethod='gemini_contextual', confidence='medium',
        suggestion=None)


class RerunAnalysisTests(unittest.TestCase):
    def call_rerun(self, row, result, deterministic=None, ai_side_effect=None):
        session = FakeSession(row)
        expected_content = row.current_content
        with patch.object(reviews, 'run_python_deterministic_checks',
                          side_effect=deterministic if isinstance(deterministic, Exception) else None,
                          return_value=[] if deterministic is None or isinstance(deterministic, Exception) else deterministic) as deterministic_call, \
             patch.object(reviews, 'run_gemini_contextual_analysis',
                          side_effect=ai_side_effect if ai_side_effect is not None else None,
                          return_value=result if ai_side_effect is None else None) as gemini_call:
            updated = reviews.rerun_review_analysis(
                row.id, AnalysisRerunRequest(reviewer='Rerun Reviewer'), session)
        self.assertEqual(gemini_call.call_args.args[0], expected_content)
        return updated, session, deterministic_call, gemini_call

    def test_gemini_failure_is_persisted_and_not_reported_as_zero_finding_success(self):
        row = make_row()
        updated, session, _deterministic, gemini = self.call_rerun(
            row, GeminiAnalysisResult([], 'failed', 'Gemini transport failed.'))

        self.assertEqual(gemini.call_count, 1)
        self.assertEqual(updated.aiAnalysisStatus, 'failed')
        self.assertEqual(updated.aiAnalysisMessage, 'Gemini transport failed.')
        self.assertEqual(updated.deterministicAnalysisStatus, 'completed')
        self.assertEqual(updated.findings, [])
        self.assertEqual(session.audit_entries[0].new_value['aiAnalysisStatus'], 'failed')

    def test_timeout_status_persists_while_deterministic_findings_remain_available(self):
        row = make_row()
        deterministic_finding = ReviewFindingModel(
            id="deterministic-absolute", reviewId=row.id, title="Absolute Claim",
            category="potential_issue", severity="high",
            exactText="guarantees 100% protection", explanation="Absolute wording requires review.",
            sourceRuleOrTerm="Absolute claims rule", sourceReference="approved deterministic rule",
            detectionMethod="deterministic_rule", confidence="medium", suggestion=None)
        updated, _session, deterministic, gemini = self.call_rerun(
            row, GeminiAnalysisResult([], "timeout", "Gemini deadline exceeded."),
            deterministic=[deterministic_finding])

        self.assertEqual(deterministic.call_count, 1)
        self.assertEqual(gemini.call_count, 1)
        self.assertEqual(updated.aiAnalysisStatus, "timeout")
        self.assertEqual(updated.findings[0].id, deterministic_finding.id)
        self.assertEqual(updated.findings[0].detectionMethod, "deterministic_rule")

    def test_successful_zero_finding_analysis_is_distinct_from_failure(self):
        updated, _session, _deterministic, gemini = self.call_rerun(
            make_row(), GeminiAnalysisResult([], 'completed'))

        self.assertEqual(gemini.call_count, 1)
        self.assertEqual(updated.aiAnalysisStatus, 'completed')
        self.assertIsNone(updated.aiAnalysisMessage)
        self.assertEqual(updated.findings, [])

    def test_successful_findings_are_added_to_the_same_review(self):
        row = make_row()
        finding = make_finding(row.id)
        updated, _session, _deterministic, gemini = self.call_rerun(
            row, GeminiAnalysisResult([finding], 'completed'))

        self.assertEqual(gemini.call_count, 1)
        self.assertEqual(updated.id, row.id)
        self.assertEqual(len(updated.findings), 1)
        self.assertEqual(updated.findings[0].analysisRunId, updated.lastAnalysisRunId)
        self.assertEqual(row.current_content, ABSOLUTE_CLAIM_DRAFT)

    def test_repeated_reruns_do_not_duplicate_and_preserve_rejected_review_decision(self):
        row = make_row(status='completed', decision_status='rejected')
        accepted_suggestion = DBReviewSuggestion(
            id='accepted-suggestion', suggested_text='edited accepted text', rationale='rationale',
            author_intent_preserved='intent', status='accepted', custom_edited_text='accepted edit')
        rejected_suggestion = DBReviewSuggestion(
            id='rejected-suggestion', suggested_text='rejected text', rationale='rationale',
            author_intent_preserved='intent', status='rejected', custom_edited_text=None)
        accepted = DBReviewFinding(id='accepted-finding', review_id=row.id, position=0,
            title='Accepted', category='potential_issue', severity='low', exact_text='accepted phrase',
            start_index=0, end_index=15, explanation='existing', source_rule_or_term='existing rule',
            source_reference='existing reference', detection_method='gemini_contextual', confidence='low',
            suggestion=accepted_suggestion)
        rejected = DBReviewFinding(id='rejected-finding', review_id=row.id, position=1,
            title='Rejected', category='potential_issue', severity='low', exact_text='rejected phrase',
            start_index=0, end_index=15, explanation='existing', source_rule_or_term='existing rule',
            source_reference='existing reference', detection_method='gemini_contextual', confidence='low',
            suggestion=rejected_suggestion)
        row.findings = [accepted, rejected]
        row.summary = {'totalFindings': 2, 'acceptedSuggestions': 1,
                       'rejectedSuggestions': 1, 'unresolvedFindings': 0}
        new_finding = make_finding(row.id)
        result = GeminiAnalysisResult([new_finding], 'completed')

        first, session, _deterministic, first_gemini = self.call_rerun(row, result)
        first_count = len(first.findings)
        second, _session2, _deterministic2, second_gemini = self.call_rerun(row, result)

        self.assertEqual(first_gemini.call_count, 1)
        self.assertEqual(second_gemini.call_count, 1)
        self.assertEqual(first_count, 3)
        self.assertEqual(len(second.findings), first_count)
        self.assertEqual(second.decisionStatus, 'rejected')
        self.assertEqual(second.status, 'completed')
        self.assertEqual(second.findings[0].suggestion.status, 'accepted')
        self.assertEqual(second.findings[1].suggestion.status, 'rejected')
        self.assertEqual(row.current_content, ABSOLUTE_CLAIM_DRAFT)
        self.assertEqual(len(session.audit_entries), 1)

    def test_rerun_refreshes_evidence_metadata_for_an_existing_finding(self):
        row = make_row()
        existing = DBReviewFinding(
            id="existing-evidence-finding", review_id=row.id, position=0,
            title="Existing partial evidence", category="unsupported_claim",
            severity="medium", exact_text="100% protection against every cyber threat",
            start_index=0, end_index=40, explanation="Existing explanation",
            source_rule_or_term="Evidence check", source_reference="Old source",
            detection_method="gemini_contextual", confidence="medium",
            evidence_record_type="fact", evidence_record_id="old-fact",
            evidence_quote="Old incomplete quote", evidence_status="partially_supported",
            source_document_id="old-document", source_page_number=1,
            source_section_label="Old section", source_excerpt="Old excerpt",
            analysis_run_id="run-old", lifecycle_status="active",
        )
        row.findings = [existing]
        row.summary = {"totalFindings": 1, "unresolvedFindings": 1}

        refreshed = make_finding(row.id)
        refreshed.evidenceRecordType = "fact"
        refreshed.evidenceRecordId = "new-approved-fact"
        refreshed.evidenceQuote = "New complete approved evidence quote"
        refreshed.evidenceStatus = "supported"
        refreshed.sourceDocumentId = "new-document"
        refreshed.sourcePageNumber = 4
        refreshed.sourceSectionLabel = "Verified SLA"
        refreshed.sourceExcerpt = "New complete approved evidence quote"

        with patch.object(reviews, "enrich_finding_evidence", return_value=None):
            updated, _session, _deterministic, gemini = self.call_rerun(
                row, GeminiAnalysisResult([refreshed], "completed"))

        self.assertEqual(gemini.call_count, 1)
        self.assertEqual(len(updated.findings), 1)
        finding = updated.findings[0]
        self.assertEqual(finding.id, "existing-evidence-finding")
        self.assertEqual(finding.evidenceStatus, "supported")
        self.assertEqual(finding.evidenceRecordId, "new-approved-fact")
        self.assertEqual(finding.evidenceQuote, "New complete approved evidence quote")
        self.assertEqual(finding.sourceDocumentId, "new-document")
        self.assertEqual(finding.sourcePageNumber, 4)
        self.assertEqual(finding.sourceSectionLabel, "Verified SLA")
        self.assertEqual(finding.sourceExcerpt, "New complete approved evidence quote")
        self.assertEqual(finding.analysisRunId, updated.lastAnalysisRunId)

    def test_both_analysis_methods_failed_are_recorded_separately(self):
        row = make_row()

        updated, session, deterministic, gemini = self.call_rerun(
            row, GeminiAnalysisResult([], 'failed', 'Gemini failed.'),
            deterministic=RuntimeError('synthetic deterministic failure'))

        self.assertEqual(deterministic.call_count, 1)
        self.assertEqual(gemini.call_count, 1)
        self.assertEqual(updated.deterministicAnalysisStatus, 'failed')
        self.assertEqual(updated.aiAnalysisStatus, 'failed')
        self.assertEqual(session.audit_entries[0].new_value['deterministicAnalysisStatus'], 'failed')

    def test_rule_engine_flags_an_absolute_claim_covered_by_approved_sla_rule(self):
        guideline = BrandGuidelineModel(
            id='bg-sla-test', title='Uptime & Reliability Fact Rigor',
            category='writing_standards',
            description="State availability accurately; never claim '100% zero downtime'.",
            severity='high', sourceReference='Engineering SLA Standard',
            status='active', lastUpdated='2026-11-07',
            examples={'approved': '99.95% verified uptime',
                      'prohibited': 'Experience 100% zero-downtime uninterrupted forever.'})

        findings = run_python_deterministic_checks(
            'Experience 100% zero-downtime uninterrupted forever.', [], [guideline], [], 'rule-test')

        self.assertTrue(any('100% Availability' in item.title for item in findings))

    def test_unrelated_soc_evidence_does_not_create_deterministic_absolute_finding(self):
        guideline = BrandGuidelineModel(
            id='bg-sla-test', title='Uptime & Reliability Fact Rigor',
            category='writing_standards',
            description="State availability accurately; never claim '100% zero downtime'.",
            severity='high', sourceReference='Engineering SLA Standard',
            status='active', lastUpdated='2026-11-07',
            examples={'approved': '99.95% verified uptime',
                      'prohibited': 'Experience 100% zero-downtime uninterrupted forever.'})
        security_fact = ApprovedFactModel(
            id='fact-soc-test', title='SOC-2 Audit',
            statement='SOC-2 Type II controls were independently audited.',
            category='security', source='Approved SOC-2 factsheet',
            verificationStatus='verified', lastUpdated='2026-11-07')

        findings = run_python_deterministic_checks(
            ABSOLUTE_CLAIM_DRAFT, [], [guideline], [security_fact], 'absolute-test')

        self.assertEqual(findings, [])


if __name__ == '__main__':
    unittest.main()
