import unittest

from models import ReviewDocumentModel, ReviewFindingModel
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


if __name__ == '__main__':
    unittest.main()
