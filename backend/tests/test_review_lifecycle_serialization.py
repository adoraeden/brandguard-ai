import unittest

from models import ApprovedFactModel, ReviewDocumentModel, ReviewFindingModel
from routers.reviews import enrich_finding_evidence
from storage import add_review, review_model


class RecordingSession:
    def __init__(self):
        self.added = []

    def add(self, item):
        self.added.append(item)


def make_document(lifecycle_status=None):
    finding = ReviewFindingModel(
        id='finding-lifecycle-test',
        reviewId='review-lifecycle-test',
        title='Lifecycle regression finding',
        category='potential_issue',
        severity='high',
        exactText='100% guaranteed protection',
        explanation='Absolute claim requires review.',
        sourceRuleOrTerm='Absolute claims rule',
        sourceReference='Approved deterministic rule',
        detectionMethod='deterministic_rule',
        confidence='high',
        lifecycleStatus=lifecycle_status,
    )
    return ReviewDocumentModel(
        id='review-lifecycle-test',
        title='Lifecycle serialization regression',
        contentType='general_communication',
        originalContent=finding.exactText,
        currentContent=finding.exactText,
        reviewer='Regression Reviewer',
        createdAt='2026-11-12T00:00:00Z',
        updatedAt='2026-11-12T00:00:00Z',
        findings=[finding],
    )


class ReviewLifecycleSerializationTests(unittest.TestCase):
    def test_new_finding_defaults_to_active_without_attribute_error(self):
        session = RecordingSession()
        row = add_review(session, make_document())

        self.assertEqual(session.added, [row])
        self.assertEqual(row.findings[0].lifecycle_status, 'active')
        self.assertEqual(review_model(row).findings[0].lifecycleStatus, 'active')

    def test_resolved_lifecycle_status_round_trips_through_storage(self):
        row = add_review(RecordingSession(), make_document('resolved'))

        self.assertEqual(row.findings[0].lifecycle_status, 'resolved')
        self.assertEqual(review_model(row).findings[0].lifecycleStatus, 'resolved')


    def test_evidence_provenance_round_trips_through_storage(self):
        document = make_document()
        finding = document.findings[0]
        finding.evidenceRecordType = 'fact'
        finding.evidenceRecordId = 'fact-source-test'
        finding.evidenceQuote = 'The verified service availability is 99.95%.'
        finding.evidenceStatus = 'supported'
        finding.sourceDocumentId = 'doc-source-test'
        finding.sourcePageNumber = 4
        finding.sourceSectionLabel = 'Availability'
        finding.sourceExcerpt = 'The verified service availability is 99.95%.'

        row = add_review(RecordingSession(), document)
        stored = row.findings[0]
        self.assertEqual(stored.evidence_status, 'supported')
        self.assertEqual(stored.source_document_id, 'doc-source-test')
        self.assertEqual(stored.source_page_number, 4)
        self.assertEqual(stored.source_section_label, 'Availability')
        self.assertEqual(stored.source_excerpt, 'The verified service availability is 99.95%.')

        restored = review_model(row).findings[0]
        self.assertEqual(restored.evidenceStatus, 'supported')
        self.assertEqual(restored.sourceDocumentId, 'doc-source-test')
        self.assertEqual(restored.sourcePageNumber, 4)
        self.assertEqual(restored.sourceSectionLabel, 'Availability')
        self.assertEqual(restored.sourceExcerpt, 'The verified service availability is 99.95%.')



    def test_evidence_enrichment_attaches_source_provenance_and_status(self):
        fact = ApprovedFactModel(
            id='fact-source-test',
            title='Availability commitment',
            statement='The service provides a verified 99.95% monthly uptime SLA.',
            category='uptime_performance',
            source='Uploaded reliability guide',
            verificationStatus='verified',
            lastUpdated='2026-11-12',
            sourceDocumentId='doc-source-test',
            sourcePageNumber=4,
            sourceSectionLabel='Availability',
            sourceExcerpt='The service provides a verified 99.95% monthly uptime SLA.',
        )
        supported = ReviewFindingModel(
            id='finding-supported',
            reviewId='review-evidence-test',
            title='Availability claim',
            category='direct_contradiction',
            severity='high',
            exactText='We guarantee 100% uptime.',
            explanation='The claim differs from the approved SLA.',
            sourceRuleOrTerm='Availability commitment',
            sourceReference='Uploaded reliability guide',
            detectionMethod='gemini_contextual',
            confidence='high',
            evidenceRecordType='fact',
            evidenceRecordId=fact.id,
            evidenceQuote='verified 99.95% monthly uptime SLA',
        )
        unsupported = ReviewFindingModel(
            id='finding-unsupported',
            reviewId='review-evidence-test',
            title='Insufficient Evidence',
            category='unsupported_claim',
            severity='medium',
            exactText='We guarantee zero downtime.',
            explanation='No approved source supports the claim.',
            sourceRuleOrTerm='Insufficient Evidence',
            sourceReference='No directly relevant approved source was found.',
            detectionMethod='gemini_contextual',
            confidence='low',
        )

        enrich_finding_evidence([supported, unsupported], [], [fact])

        self.assertEqual(supported.evidenceStatus, 'supported')
        self.assertEqual(supported.sourceDocumentId, 'doc-source-test')
        self.assertEqual(supported.sourcePageNumber, 4)
        self.assertEqual(supported.sourceSectionLabel, 'Availability')
        self.assertEqual(supported.sourceExcerpt, fact.sourceExcerpt)
        self.assertEqual(unsupported.evidenceStatus, 'unsupported')
        self.assertIsNone(unsupported.sourceDocumentId)



if __name__ == '__main__':
    unittest.main()
