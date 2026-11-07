"""PostgreSQL integration regressions for the public demo workflow."""
import os
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from database import (DBDecisionAudit, DBReviewDocument, DBReviewFinding,
                      DBReviewSuggestion, SessionLocal)
from main import app


@unittest.skipUnless(os.getenv("DATABASE_URL"), "Requires the configured PostgreSQL database")
class FinalReviewWorkflowIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client_context = TestClient(app)
        cls.client = cls.client_context.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_context.__exit__(None, None, None)

    def test_api_is_available_without_authentication_routes_or_tokens(self):
        self.assertEqual(self.client.get("/api/reviews").status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 404)
        self.assertEqual(self.client.post("/api/auth/login", json={}).status_code, 404)

    def test_brand_knowledge_api_is_available_without_authentication(self):
        entry_id = f"demo-permission-{uuid4().hex}"
        payload = {"id": entry_id, "title": "Permission test", "category": "test",
            "description": "temporary test row", "severity": "low", "sourceReference": "test",
            "status": "active", "lastUpdated": "2026-11-08"}
        created = self.client.post("/api/guidelines", json=payload)
        self.assertEqual(created.status_code, 201, created.text)
        deleted = self.client.delete(f"/api/guidelines/{entry_id}")
        self.assertEqual(deleted.status_code, 200, deleted.text)

    def make_review(self, status="in_review", decision="pending", suggestion=False):
        review_id = f"workflow-test-{uuid4().hex}"
        finding_id = f"finding-{uuid4().hex}"
        review = DBReviewDocument(id=review_id, title="Workflow integration test",
            content_type="general_communication", original_content="test", current_content="test",
            status=status, reviewer="integration reviewer", decision_status=decision,
            summary={"totalFindings": 1, "unresolvedFindings": 1}, findings=[], audit_history=[])
        finding = DBReviewFinding(id=finding_id, review_id=review_id, position=0, title="test finding",
            category="unsupported_claim", severity="medium", exact_text="test", start_index=0,
            end_index=4, explanation="test", source_rule_or_term="test", source_reference="test",
            detection_method="gemini_contextual", confidence="medium")
        if suggestion:
            finding.suggestion = DBReviewSuggestion(id=f"suggestion-{uuid4().hex}",
                suggested_text="safe text", rationale="test", author_intent_preserved="test", status="pending")
        review.findings.append(finding)
        with SessionLocal() as db:
            db.add(review)
            db.commit()
        return review_id, finding_id

    def test_finding_decision_persists_separately_from_suggestion_and_rejects_wrong_review(self):
        review_id, finding_id = self.make_review(suggestion=True)
        try:
            for value in ("accepted", "dismissed", "verification_required"):
                response = self.client.post(f"/api/reviews/{review_id}/findings/{finding_id}/decision",json={"decision": value, "note": "integration note", "reviewer": "Marcus Chen"})
                self.assertEqual(response.status_code, 200, response.text)
                finding = response.json()["findings"][0]
                self.assertEqual(finding["findingDecision"], value)
                self.assertEqual(finding["suggestion"]["status"], "pending")
                self.assertEqual(finding["findingDecisionReviewer"], "Marcus Chen")
            self.assertEqual(self.client.get(f"/api/reviews/{review_id}").json()["findings"][0]["findingDecision"], "verification_required")
            self.assertEqual(self.client.post(f"/api/reviews/unknown/findings/{finding_id}/decision",json={"decision": "accepted"}).status_code, 404)
        finally:
            self.delete_cleanup(review_id)

    def test_locked_review_is_read_only_for_finding_decisions(self):
        review_id, finding_id = self.make_review(status="completed", decision="rejected")
        try:
            response = self.client.post(f"/api/reviews/{review_id}/findings/{finding_id}/decision",json={"decision": "accepted"})
            self.assertEqual(response.status_code, 409)
        finally:
            self.delete_cleanup(review_id)

    def test_findings_without_suggestions_can_receive_each_finding_decision(self):
        for decision in ("accepted", "dismissed", "verification_required"):
            review_id, finding_id = self.make_review(suggestion=False)
            try:
                response = self.client.post(f"/api/reviews/{review_id}/findings/{finding_id}/decision",json={"decision": decision})
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(response.json()["findings"][0]["findingDecision"], decision)
                self.assertEqual(response.json()["findings"][0]["suggestion"], None)
                expected_unresolved = 0 if decision in ("accepted", "dismissed") else 1
                self.assertEqual(response.json()["summary"]["unresolvedFindings"], expected_unresolved)
            finally:
                self.delete_cleanup(review_id)

    def test_review_delete_is_rejected_in_demo_mode_and_preserves_data(self):
        for status, decision in (("in_review", "pending"), ("completed", "approved_as_is"),
                                 ("completed", "approved_with_changes"), ("completed", "rejected")):
            review_id, _finding_id = self.make_review(status=status, decision=decision, suggestion=True)
            with SessionLocal() as db:
                db.add(DBDecisionAudit(id=f"audit-{uuid4().hex}", review_id=review_id,
                    action="test", reviewer="tester", previous_value={}, new_value={}))
                db.commit()
            rejected = self.client.delete(f"/api/reviews/{review_id}")
            self.assertEqual(rejected.status_code, 403)
            self.assertIn("disabled in public demo mode", rejected.json()["detail"])
            self.assertEqual(self.client.get(f"/api/reviews/{review_id}").status_code, 200)
            with SessionLocal() as db:
                self.assertEqual(db.query(DBReviewFinding).filter_by(review_id=review_id).count(), 1)
                self.assertEqual(db.query(DBDecisionAudit).filter_by(review_id=review_id).count(), 1)
                self.assertEqual(db.query(DBReviewSuggestion).join(DBReviewFinding).filter(
                    DBReviewFinding.review_id == review_id).count(), 1)
            self.delete_cleanup(review_id)

    def test_suggestion_decision_is_persisted_and_audit_attributed(self):
        review_id, finding_id = self.make_review(suggestion=True)
        try:
            response = self.client.post(f"/api/reviews/{review_id}/decisions",json={
                    "findingId": finding_id, "suggestionAction": "accept", "reviewer": "Marcus Chen"})
            self.assertEqual(response.status_code, 200, response.text)
            finding = response.json()["findings"][0]
            self.assertEqual(finding["suggestion"]["status"], "accepted")
            self.assertIsNone(finding["findingDecision"])
            audit = self.client.get(f"/api/reviews/{review_id}/history").json()
            self.assertEqual(audit[-1]["reviewer"], "Marcus Chen")
        finally:
            self.delete_cleanup(review_id)

    def delete_cleanup(self, review_id):
        with SessionLocal() as db:
            row = db.get(DBReviewDocument, review_id)
            if row:
                db.delete(row)
                db.commit()


if __name__ == "__main__":
    unittest.main()
