import unittest
from datetime import datetime
from types import SimpleNamespace
from fastapi import HTTPException

from routers.reviews import apply_workflow_stage_decision, workflow_stage_model, next_workflow_stage_status


def stage(order, status, name):
    return SimpleNamespace(
        id=f"stage-{order}", review_id="review-workflow-test",
        stage_order=order, name=name, assigned_reviewer=f"Reviewer {order}",
        status=status, decision_note=None, created_by="Admin",
        created_at=datetime(2026, 11, 12, 10, 0, 0),
        updated_at=datetime(2026, 11, 12, 10, 0, 0),
        completed_at=None,
    )


class ReviewWorkflowTests(unittest.TestCase):
    def test_approval_hands_off_to_next_stage_in_order(self):
        now = datetime(2026, 11, 12, 11, 0, 0)
        first = stage(1, "in_review", "Brand review")
        second = stage(2, "pending", "Legal review")
        previous = apply_workflow_stage_decision(
            [first, second], first, "approved", "Looks good", now
        )
        self.assertEqual(previous["status"], "in_review")
        self.assertEqual(first.status, "approved")
        self.assertEqual(first.completed_at, now)
        self.assertEqual(first.decision_note, "Looks good")
        self.assertEqual(second.status, "in_review")
        self.assertEqual(second.updated_at, now)

    def test_return_keeps_stage_open_for_rework(self):
        now = datetime(2026, 11, 12, 11, 0, 0)
        current = stage(1, "in_review", "Brand review")
        apply_workflow_stage_decision([current], current, "returned", "Please revise", now)
        self.assertEqual(current.status, "returned")
        self.assertIsNone(current.completed_at)
        self.assertEqual(current.decision_note, "Please revise")

    def test_later_stage_cannot_be_decided_before_earlier_stage(self):
        first = stage(1, "in_review", "Brand review")
        second = stage(2, "in_review", "Legal review")
        with self.assertRaises(HTTPException) as error:
            apply_workflow_stage_decision(
                [first, second], second, "approved", None, datetime.utcnow()
            )
        self.assertEqual(error.exception.status_code, 409)

    def test_stage_serialization_keeps_assignment_and_status(self):
        current = stage(1, "in_review", "Brand review")
        result = workflow_stage_model(current)
        self.assertEqual(result.reviewId, "review-workflow-test")
        self.assertEqual(result.assignedReviewer, "Reviewer 1")
        self.assertEqual(result.status, "in_review")


    def test_new_stage_starts_immediately_when_all_previous_stages_are_approved(self):
        completed = [
            stage(1, "approved", "Brand review"),
            stage(2, "approved", "Legal review"),
        ]
        self.assertEqual(next_workflow_stage_status(completed), "in_review")

    def test_new_stage_waits_when_an_existing_stage_is_still_open(self):
        existing = [
            stage(1, "approved", "Brand review"),
            stage(2, "in_review", "Legal review"),
        ]
        self.assertEqual(next_workflow_stage_status(existing), "pending")

    def test_first_stage_starts_in_review(self):
        self.assertEqual(next_workflow_stage_status([]), "in_review")

if __name__ == "__main__":
    unittest.main()
