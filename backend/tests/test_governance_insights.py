import unittest
from datetime import datetime
from types import SimpleNamespace

from routers.insights import get_governance_insights


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def order_by(self, *_args):
        return self

    def all(self):
        return self.rows


class FakeDB:
    def __init__(self, reviews):
        self.reviews = reviews

    def query(self, _model):
        return FakeQuery(self.reviews)


def make_finding(category="unsupported_claim", severity="high", status="unsupported",
                 decision=None, lifecycle="active", rule="Evidence gap"):
    return SimpleNamespace(
        category=category, severity=severity, evidence_status=status,
        finding_decision=decision, lifecycle_status=lifecycle,
        source_rule_or_term=rule, exact_text="sample claim",
        detection_method="fact_check", source_reference="Approved factsheet",
    )


def make_review(findings, decision_status="pending", month=11):
    return SimpleNamespace(
        created_at=datetime(2026, month, 10),
        decision_status=decision_status,
        findings=findings,
    )


class GovernanceInsightsTests(unittest.TestCase):
    def test_unresolved_rate_uses_findings_not_review_count(self):
        reviews = [
            make_review([make_finding(), make_finding(decision="accepted")]),
            make_review([make_finding(decision="dismissed")], decision_status="approved_as_is"),
        ]
        result = get_governance_insights(FakeDB(reviews))
        self.assertEqual(result["reviewStatistics"]["totalFindings"], 3)
        self.assertEqual(result["reviewStatistics"]["unresolvedFindings"], 1)
        self.assertEqual(result["unresolvedTrends"][0]["rate"], 33)
        self.assertEqual(result["unresolvedTrends"][0]["totalFindings"], 3)

    def test_evidence_coverage_and_decision_breakdown_are_explicit(self):
        findings = [
            make_finding(status="supported", decision="accepted"),
            make_finding(status="partially_supported", decision="verification_required"),
            make_finding(status="conflicting"),
            make_finding(status=None),
        ]
        result = get_governance_insights(FakeDB([make_review(findings)]))
        coverage = result["evidenceCoverage"]
        self.assertEqual(coverage["totalFindings"], 4)
        self.assertEqual(coverage["assessed"], 3)
        self.assertEqual(coverage["assessmentRate"], 75)
        self.assertEqual(coverage["supportRate"], 67)
        decisions = {item["decision"]: item["count"]
                     for item in result["findingDecisionBreakdown"]}
        self.assertEqual(decisions["accepted"], 1)
        self.assertEqual(decisions["verification_required"], 1)
        self.assertEqual(decisions["pending"], 2)

    def test_resolved_lifecycle_is_not_counted_as_unresolved(self):
        result = get_governance_insights(FakeDB([
            make_review([make_finding(lifecycle="resolved")])
        ]))
        self.assertEqual(result["reviewStatistics"]["unresolvedFindings"], 0)
        self.assertEqual(result["unresolvedTrends"][0]["rate"], 0)

    def test_empty_database_returns_zero_safe_metrics(self):
        result = get_governance_insights(FakeDB([]))
        self.assertEqual(result["reviewStatistics"]["completionRate"], 0)
        self.assertEqual(result["evidenceCoverage"]["assessmentRate"], 0)
        self.assertEqual(result["unresolvedTrends"], [])
        self.assertEqual(sum(item["count"] for item in result["findingsByCategory"]), 0)


if __name__ == "__main__":
    unittest.main()
