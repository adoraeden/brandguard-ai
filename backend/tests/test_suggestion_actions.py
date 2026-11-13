"""Unit regressions for context-preserving, explicitly approved suggestions."""
import unittest
from datetime import datetime

from fastapi import HTTPException

from database import DBReviewDocument, DBReviewFinding, DBReviewSuggestion
from routers.reviews import apply_suggestion_action


def make_review(content, exact_text, suggested_text="clear, evidence-based wording"):
    now = datetime.now()
    review = DBReviewDocument(
        id="suggestion-action-test",
        title="Suggestion action regression",
        content_type="general_communication",
        original_content=content,
        current_content=content,
        status="in_review",
        reviewer="Test Reviewer",
        decision_status="pending",
        summary={"totalFindings": 1, "unresolvedFindings": 1},
        ai_analysis_status="completed",
        deterministic_analysis_status="completed",
        created_at=now,
        updated_at=now,
        findings=[],
        audit_history=[],
    )
    finding = DBReviewFinding(
        id="finding-1",
        review_id=review.id,
        position=0,
        title="Unsupported claim",
        category="unsupported_claim",
        severity="medium",
        exact_text=exact_text,
        start_index=content.find(exact_text),
        end_index=content.find(exact_text) + len(exact_text),
        explanation="The wording needs substantiation.",
        source_rule_or_term="Evidence requirement",
        source_reference="Approved evidence catalogue",
        detection_method="gemini_contextual",
        confidence="medium",
    )
    finding.suggestion = DBReviewSuggestion(
        id="suggestion-1",
        suggested_text=suggested_text,
        rationale="Replace the absolute claim with appropriately qualified wording.",
        author_intent_preserved="Retains the original product-benefit message without overstating it.",
        status="pending",
    )
    review.findings.append(finding)
    return review, finding


class SuggestionActionTests(unittest.TestCase):
    def test_accept_applies_only_after_explicit_action_and_keeps_intent_rationale(self):
        original = "Our tool guarantees protection for every customer."
        review, finding = make_review(original, "guarantees protection")

        self.assertEqual(review.current_content, original)
        self.assertEqual(finding.suggestion.status, "pending")

        apply_suggestion_action(review, finding, "accept")

        self.assertEqual(
            review.current_content,
            "Our tool clear, evidence-based wording for every customer.",
        )
        self.assertEqual(finding.suggestion.status, "accepted")
        self.assertEqual(
            finding.suggestion.author_intent_preserved,
            "Retains the original product-benefit message without overstating it.",
        )
        self.assertEqual(finding.suggestion.replaced_text, "guarantees protection")
        self.assertEqual(
            review.current_content[
                finding.suggestion.applied_start:finding.suggestion.applied_end
            ],
            finding.suggestion.suggested_text,
        )

    def test_custom_edit_can_be_rejected_and_reset_restores_original_text(self):
        original = "Our tool guarantees protection for every customer."
        review, finding = make_review(original, "guarantees protection")
        custom = "may help protect"

        apply_suggestion_action(review, finding, "edit", custom_text=custom)
        self.assertIn(custom, review.current_content)
        self.assertEqual(finding.suggestion.status, "edited")
        self.assertEqual(finding.suggestion.custom_edited_text, custom)

        apply_suggestion_action(review, finding, "reject")
        self.assertEqual(review.current_content, original)
        self.assertEqual(finding.suggestion.status, "rejected")
        self.assertIsNone(finding.suggestion.applied_start)
        self.assertIsNone(finding.suggestion.applied_end)
        self.assertIsNone(finding.suggestion.replaced_text)

        apply_suggestion_action(review, finding, "reset")
        self.assertEqual(review.current_content, original)
        self.assertEqual(finding.suggestion.status, "pending")
        self.assertIsNone(finding.suggestion.custom_edited_text)

    def test_ambiguous_exact_text_requires_explicit_occurrence_selection(self):
        original = "The claim guarantees protection. Our page guarantees protection."
        review, finding = make_review(original, "guarantees protection")

        with self.assertRaises(HTTPException) as error:
            apply_suggestion_action(review, finding, "accept")

        self.assertEqual(error.exception.status_code, 409)
        self.assertIn("Ambiguous text match", str(error.exception.detail))
        self.assertEqual(review.current_content, original)
        self.assertEqual(finding.suggestion.status, "pending")

        apply_suggestion_action(review, finding, "accept", occurrence_index=1)
        self.assertEqual(
            review.current_content,
            "The claim guarantees protection. Our page clear, evidence-based wording.",
        )

    def test_edit_requires_nonempty_custom_text_and_does_not_change_draft(self):
        original = "Our tool guarantees protection."
        review, finding = make_review(original, "guarantees protection")

        with self.assertRaises(HTTPException) as error:
            apply_suggestion_action(review, finding, "edit", custom_text="  ")

        self.assertEqual(error.exception.status_code, 422)
        self.assertEqual(review.current_content, original)
        self.assertEqual(finding.suggestion.status, "pending")


if __name__ == "__main__":
    unittest.main()
