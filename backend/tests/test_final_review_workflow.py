"""PostgreSQL integration regressions for the public demo workflow."""
import os
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from database import (DBDecisionAudit, DBReviewDocument, DBReviewFinding,
                      DBReviewSuggestion, DBReviewStage, SessionLocal)
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

    def make_review(self, status="in_review", decision="pending", suggestion=False, evidence_gap=False):
        review_id = f"workflow-test-{uuid4().hex}"
        finding_id = f"finding-{uuid4().hex}"
        review = DBReviewDocument(id=review_id, title="Workflow integration test",
            content_type="general_communication", original_content="test", current_content="test",
            status=status, reviewer="integration reviewer", decision_status=decision,
            summary={"totalFindings": 1, "unresolvedFindings": 1}, findings=[], audit_history=[])
        finding = DBReviewFinding(id=finding_id, review_id=review_id, position=0, title="test finding",
            category="unsupported_claim", severity="medium", exact_text="test", start_index=0,
            end_index=4, explanation="test",
            source_rule_or_term="Insufficient Evidence" if evidence_gap else "test",
            source_reference=("No directly relevant approved source was found for this claim." if evidence_gap else "test"),
            detection_method="gemini_contextual", confidence="medium",
            evidence_status="unsupported" if evidence_gap else None)
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
                expected_unresolved = 0 if value == "dismissed" else 1
                self.assertEqual(response.json()["summary"]["unresolvedFindings"], expected_unresolved)
            self.assertEqual(self.client.get(f"/api/reviews/{review_id}").json()["findings"][0]["findingDecision"], "verification_required")
            self.assertEqual(self.client.post(f"/api/reviews/unknown/findings/{finding_id}/decision",json={"decision": "accepted"}).status_code, 404)
        finally:
            self.delete_cleanup(review_id)

    def test_approve_as_is_acknowledges_evidence_gaps_without_claiming_support(self):
        review_id, finding_id = self.make_review(evidence_gap=True)
        try:
            response = self.client.post(
                f"/api/reviews/{review_id}/decisions",
                json={
                    "completeDecision": "approved_as_is",
                    "decisionNotes": "Demo reviewer accepts this claim as-is despite the evidence gap.",
                    "reviewer": "Evelyn Voss",
                },
            )
            self.assertEqual(response.status_code, 200, response.text)
            document = response.json()
            self.assertEqual(document["status"], "completed")
            self.assertEqual(document["decisionStatus"], "approved_as_is")
            self.assertEqual(document["summary"]["unresolvedFindings"], 0)

            finding = next(item for item in document["findings"] if item["id"] == finding_id)
            self.assertEqual(finding["lifecycleStatus"], "resolved")
            self.assertEqual(finding["findingDecision"], "accepted")
            self.assertEqual(finding["evidenceStatus"], "unsupported")
            self.assertIsNone(finding["evidenceRecordId"])
            self.assertIn("not treated as verified evidence", finding["findingDecisionNote"])

            history = self.client.get(f"/api/reviews/{review_id}/history")
            self.assertEqual(history.status_code, 200, history.text)
            self.assertTrue(any(item["action"] == "evidence_gap_approved_as_is" for item in history.json()))
            self.assertTrue(any(item["action"] == "complete" for item in history.json()))
        finally:
            self.delete_cleanup(review_id)

    def test_approve_as_is_does_not_bypass_pending_correction_on_evidence_gap(self):
        review_id, finding_id = self.make_review(suggestion=True, evidence_gap=True)
        try:
            response = self.client.post(
                f"/api/reviews/{review_id}/decisions",
                json={"completeDecision": "approved_as_is", "reviewer": "Evelyn Voss"},
            )
            self.assertEqual(response.status_code, 200, response.text)
            document = response.json()
            self.assertEqual(document["status"], "in_review")
            self.assertEqual(document["decisionStatus"], "pending")
            self.assertEqual(document["summary"]["unresolvedFindings"], 1)
            finding = next(item for item in document["findings"] if item["id"] == finding_id)
            self.assertEqual(finding["lifecycleStatus"], "active")
            self.assertEqual(finding["suggestion"]["status"], "pending")
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

    def test_returned_workflow_stage_can_be_resubmitted_by_stage_creator(self):
        review_id, _ = self.make_review()
        stage_id = f"stage-{uuid4().hex}"
        with SessionLocal() as db:
            db.add(DBReviewStage(
                id=stage_id, review_id=review_id, stage_order=1,
                name="Brand & Messaging Review", assigned_reviewer="Marcus Chen",
                status="in_review", created_by="Evelyn Voss",
            ))
            db.commit()
        try:
            returned = self.client.post(
                f"/api/reviews/{review_id}/workflow/stages/{stage_id}/decision",
                json={"decision": "returned", "note": "Please substantiate the uptime claim.", "reviewer": "Marcus Chen"},
            )
            self.assertEqual(returned.status_code, 200, returned.text)
            self.assertEqual(returned.json()[0]["status"], "returned")

            wrong_actor = self.client.post(
                f"/api/reviews/{review_id}/workflow/stages/{stage_id}/decision",
                json={"decision": "resubmitted", "reviewer": "Devon Price"},
            )
            self.assertEqual(wrong_actor.status_code, 403, wrong_actor.text)

            resubmitted = self.client.post(
                f"/api/reviews/{review_id}/workflow/stages/{stage_id}/decision",
                json={"decision": "resubmitted", "note": "Updated the draft with the approved SLA source.", "reviewer": "Evelyn Voss"},
            )
            self.assertEqual(resubmitted.status_code, 200, resubmitted.text)
            self.assertEqual(resubmitted.json()[0]["status"], "in_review")

            approved = self.client.post(
                f"/api/reviews/{review_id}/workflow/stages/{stage_id}/decision",
                json={"decision": "approved", "reviewer": "Marcus Chen"},
            )
            self.assertEqual(approved.status_code, 200, approved.text)
            self.assertEqual(approved.json()[0]["status"], "approved")

            with SessionLocal() as db:
                actions = [row.action for row in db.query(DBDecisionAudit).filter_by(review_id=review_id).all()]
            self.assertIn("workflow_stage_returned", actions)
            self.assertIn("workflow_stage_resubmitted", actions)
            self.assertIn("workflow_stage_approved", actions)
        finally:
            self.delete_cleanup(review_id)

    def test_only_stage_creator_can_save_a_returned_draft_revision(self):
        review_id, _ = self.make_review()
        stage_id = f"stage-{uuid4().hex}"
        with SessionLocal() as db:
            db.add(DBReviewStage(
                id=stage_id, review_id=review_id, stage_order=1,
                name="Brand & Messaging Review", assigned_reviewer="Marcus Chen",
                status="returned", decision_note="Please correct the unsupported uptime claim.",
                created_by="Evelyn Voss",
            ))
            db.commit()
        try:
            denied = self.client.put(
                f"/api/reviews/{review_id}/content",
                json={"content": "Unauthorized revision", "reviewer": "Marcus Chen"},
            )
            self.assertEqual(denied.status_code, 403, denied.text)

            revised_text = "AuraCloud Workspace provides a 99.95% verified uptime SLA."
            saved = self.client.put(
                f"/api/reviews/{review_id}/content",
                json={"content": revised_text, "reviewer": "Evelyn Voss"},
            )
            self.assertEqual(saved.status_code, 200, saved.text)
            self.assertEqual(saved.json()["currentContent"], revised_text)

            history = self.client.get(f"/api/reviews/{review_id}/history")
            self.assertEqual(history.status_code, 200, history.text)
            self.assertTrue(any(item["action"] == "content_revision" for item in history.json()))
        finally:
            self.delete_cleanup(review_id)

    def test_final_approval_waits_for_every_collaborative_stage(self):
        review_id, finding_id = self.make_review(suggestion=False)
        stage_id = f"stage-{uuid4().hex}"
        with SessionLocal() as db:
            db.add(DBReviewStage(
                id=stage_id, review_id=review_id, stage_order=1,
                name="Brand & Messaging Review", assigned_reviewer="Marcus Chen",
                status="in_review", created_by="Evelyn Voss",
            ))
            db.commit()
        try:
            finding_decision = self.client.post(
                f"/api/reviews/{review_id}/findings/{finding_id}/decision",
                json={"decision": "accepted", "reviewer": "Evelyn Voss"},
            )
            self.assertEqual(finding_decision.status_code, 200, finding_decision.text)

            blocked = self.client.post(
                f"/api/reviews/{review_id}/decisions",
                json={"completeDecision": "approved_as_is", "reviewer": "Evelyn Voss"},
            )
            self.assertEqual(blocked.status_code, 409, blocked.text)
            self.assertIn("collaborative review stages", blocked.text)

            stage_approved = self.client.post(
                f"/api/reviews/{review_id}/workflow/stages/{stage_id}/decision",
                json={"decision": "approved", "reviewer": "Marcus Chen"},
            )
            self.assertEqual(stage_approved.status_code, 200, stage_approved.text)
            self.assertEqual(stage_approved.json()[0]["status"], "approved")

            final = self.client.post(
                f"/api/reviews/{review_id}/decisions",
                json={"completeDecision": "approved_as_is", "reviewer": "Evelyn Voss"},
            )
            self.assertEqual(final.status_code, 200, final.text)
            self.assertEqual(final.json()["decisionStatus"], "approved_as_is")
        finally:
            self.delete_cleanup(review_id)

    def test_only_pending_reviews_can_be_permanently_deleted(self):
        pending_id, _ = self.make_review(status="in_review", decision="pending", suggestion=True)
        with SessionLocal() as db:
            db.add(DBDecisionAudit(id=f"audit-{uuid4().hex}", review_id=pending_id,
                action="test", reviewer="tester", previous_value={}, new_value={}))
            db.commit()

        deleted = self.client.delete(f"/api/reviews/{pending_id}")
        self.assertEqual(deleted.status_code, 200, deleted.text)
        self.assertEqual(self.client.get(f"/api/reviews/{pending_id}").status_code, 404)
        with SessionLocal() as db:
            self.assertEqual(db.query(DBReviewFinding).filter_by(review_id=pending_id).count(), 0)
            self.assertEqual(db.query(DBDecisionAudit).filter_by(review_id=pending_id).count(), 0)
            self.assertEqual(db.query(DBReviewSuggestion).join(DBReviewFinding).filter(
                DBReviewFinding.review_id == pending_id).count(), 0)

        partially_approved_id, _ = self.make_review(status="in_review", decision="partially_approved")
        try:
            deleted_partial = self.client.delete(f"/api/reviews/{partially_approved_id}")
            self.assertEqual(deleted_partial.status_code, 200, deleted_partial.text)
            self.assertEqual(self.client.get(f"/api/reviews/{partially_approved_id}").status_code, 404)
        finally:
            self.delete_cleanup(partially_approved_id)

        for status, decision in (("completed", "approved_as_is"),
                                 ("completed", "approved_with_changes"),
                                 ("completed", "rejected")):
            review_id, _ = self.make_review(status=status, decision=decision, suggestion=True)
            try:
                blocked = self.client.delete(f"/api/reviews/{review_id}")
                self.assertEqual(blocked.status_code, 403, blocked.text)
                self.assertIn("Only pending reviews", blocked.json()["detail"])
                self.assertEqual(self.client.get(f"/api/reviews/{review_id}").status_code, 200)
            finally:
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
