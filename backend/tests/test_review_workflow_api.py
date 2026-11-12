import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from database import DBReviewDocument, SessionLocal
from main import app


class ReviewWorkflowApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def create_review(self):
        review_id = f"workflow-api-ci-{uuid4().hex}"
        with SessionLocal() as db:
            db.add(DBReviewDocument(
                id=review_id,
                title="Collaborative workflow API test",
                content_type="general_communication",
                original_content="Test review content.",
                current_content="Test review content.",
                status="in_review",
                reviewer="Demo Admin",
                decision_status="pending",
                summary={},
            ))
            db.commit()
        return review_id

    def test_stage_assignment_handoff_return_export_and_audit(self):
        review_id = self.create_review()

        first = self.client.post(
            f"/api/reviews/{review_id}/workflow/stages",
            json={
                "name": "Legal review",
                "assignedReviewer": "Reviewer Alice",
                "reviewer": "Demo Admin",
            },
        )
        self.assertEqual(first.status_code, 201, first.text)
        first_stage = first.json()
        self.assertEqual(first_stage["status"], "in_review")

        second = self.client.post(
            f"/api/reviews/{review_id}/workflow/stages",
            json={
                "name": "Brand approval",
                "assignedReviewer": "Reviewer Bob",
                "reviewer": "Demo Admin",
            },
        )
        self.assertEqual(second.status_code, 201, second.text)
        second_stage = second.json()
        self.assertEqual(second_stage["status"], "pending")

        blocked = self.client.post(
            f"/api/reviews/{review_id}/workflow/stages/{second_stage['id']}/decision",
            json={"decision": "approved", "reviewer": "Reviewer Bob"},
        )
        self.assertEqual(blocked.status_code, 409, blocked.text)

        wrong_reviewer = self.client.post(
            f"/api/reviews/{review_id}/workflow/stages/{first_stage['id']}/decision",
            json={"decision": "approved", "reviewer": "Someone Else"},
        )
        self.assertEqual(wrong_reviewer.status_code, 403, wrong_reviewer.text)

        approved_first = self.client.post(
            f"/api/reviews/{review_id}/workflow/stages/{first_stage['id']}/decision",
            json={"decision": "approved", "reviewer": "Reviewer Alice", "note": "Legal checks passed."},
        )
        self.assertEqual(approved_first.status_code, 200, approved_first.text)
        stages = approved_first.json()
        self.assertEqual([item["status"] for item in stages], ["approved", "in_review"])

        returned = self.client.post(
            f"/api/reviews/{review_id}/workflow/stages/{second_stage['id']}/decision",
            json={"decision": "returned", "reviewer": "Reviewer Bob", "note": "Please revise the claim."},
        )
        self.assertEqual(returned.status_code, 200, returned.text)
        self.assertEqual(returned.json()[1]["status"], "returned")

        approved_second = self.client.post(
            f"/api/reviews/{review_id}/workflow/stages/{second_stage['id']}/decision",
            json={"decision": "approved", "reviewer": "Reviewer Bob", "note": "Revision verified."},
        )
        self.assertEqual(approved_second.status_code, 200, approved_second.text)
        self.assertEqual([item["status"] for item in approved_second.json()], ["approved", "approved"])

        history = self.client.get(f"/api/reviews/{review_id}/workflow")
        self.assertEqual(history.status_code, 200, history.text)
        self.assertEqual(len(history.json()), 2)

        exported = self.client.get(f"/api/reviews/{review_id}/workflow/export")
        self.assertEqual(exported.status_code, 200, exported.text)
        self.assertIn("Reviewer Alice", exported.text)
        self.assertIn("Reviewer Bob", exported.text)
        self.assertIn("Revision verified.", exported.text)


if __name__ == "__main__":
    unittest.main()
