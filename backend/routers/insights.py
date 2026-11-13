from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import DBReviewDocument, get_db

router = APIRouter(prefix="/api/insights", tags=["insights"])

CATEGORIES = ("exact_violation", "contextual_inconsistency", "direct_contradiction",
              "unsupported_claim", "potential_issue")
SEVERITIES = ("critical", "high", "medium", "low", "informational")
RESOLVING_DECISIONS = {"accepted", "dismissed"}


def _is_unresolved(finding):
    if getattr(finding, "lifecycle_status", "active") == "resolved":
        return False
    return getattr(finding, "finding_decision", None) not in RESOLVING_DECISIONS


@router.get("")
def get_governance_insights(db: Session = Depends(get_db)):
    reviews = db.query(DBReviewDocument).order_by(DBReviewDocument.created_at.asc()).all()
    term_counts, term_categories = Counter(), {}
    categories = Counter({key: 0 for key in CATEGORIES})
    severities = Counter({key: 0 for key in SEVERITIES})
    mismatch_sources = Counter()
    evidence = Counter()
    decisions = Counter()
    monthly = {}
    unresolved_total = 0
    total_findings = 0

    for review in reviews:
        month = review.created_at.strftime("%Y-%m")
        month_data = monthly.setdefault(month, {"month": month, "reviews": 0,
                                                 "findings": 0, "unresolved": 0})
        month_data["reviews"] += 1
        for finding in review.findings:
            total_findings += 1
            month_data["findings"] += 1
            unresolved = _is_unresolved(finding)
            if unresolved:
                unresolved_total += 1
                month_data["unresolved"] += 1

            key = finding.source_rule_or_term or finding.exact_text or "Unclassified finding"
            term_counts[key] += 1
            term_categories.setdefault(key, finding.category)
            if finding.category in categories:
                categories[finding.category] += 1
            if finding.severity in severities:
                severities[finding.severity] += 1

            evidence_status = getattr(finding, "evidence_status", None) or "not_assessed"
            evidence[evidence_status] += 1
            decision = getattr(finding, "finding_decision", None) or "pending"
            decisions[decision] += 1

            source_reference = finding.source_reference or "No source reference"
            rule = (finding.source_rule_or_term or "").lower()
            if finding.detection_method == "fact_check" or finding.category == "unsupported_claim":
                mismatch_sources[("factsheet", source_reference)] += 1
            elif not rule.startswith("terminology:"):
                mismatch_sources[("guideline", source_reference)] += 1

    completed = sum(review.decision_status not in ("pending", "partially_approved")
                    for review in reviews)
    pending = len(reviews) - completed
    repeated = [{"term": term, "count": count, "category": term_categories[term]}
                for term, count in term_counts.most_common(8)]
    assessed = sum(count for status, count in evidence.items() if status != "not_assessed")
    supported = evidence["supported"] + evidence["partially_supported"]
    trends = []
    for item in list(monthly.values())[-6:]:
        trends.append({
            "month": item["month"],
            # Clamp defensively so malformed legacy counters can never render above 100%.
            "rate": min(100, max(0, round(item["unresolved"] * 100 / item["findings"])))
                    if item["findings"] else 0,
            "reviews": item["reviews"],
            "totalFindings": item["findings"],
            "unresolvedFindings": item["unresolved"],
        })

    return {
        "topViolatedTerms": repeated[:6],
        "repeatedTerminology": [item for item in repeated if item["category"] == "exact_violation"],
        "referenceMismatches": [{"type": kind, "source": source, "count": count}
                                 for (kind, source), count in mismatch_sources.most_common(8)],
        "reviewStatistics": {
            "total": len(reviews), "completed": completed, "pending": pending,
            "completionRate": round(completed * 100 / len(reviews)) if reviews else 0,
            "totalFindings": total_findings, "unresolvedFindings": unresolved_total,
        },
        "findingsByCategory": [{"category": category, "count": count,
            "percentage": round(count * 100 / total_findings) if total_findings else 0}
            for category, count in categories.items()],
        "severityDistribution": [{"severity": severity, "count": count}
                                 for severity, count in severities.items()],
        "unresolvedTrends": trends,
        "evidenceCoverage": {
            "totalFindings": total_findings,
            "assessed": assessed,
            "notAssessed": evidence["not_assessed"],
            "supported": evidence["supported"],
            "partiallySupported": evidence["partially_supported"],
            "unsupported": evidence["unsupported"],
            "conflicting": evidence["conflicting"],
            "assessmentRate": round(assessed * 100 / total_findings) if total_findings else 0,
            "supportRate": round(supported * 100 / assessed) if assessed else 0,
        },
        "findingDecisionBreakdown": [
            {"decision": key, "count": decisions[key]}
            for key in ("accepted", "dismissed", "verification_required", "pending")
        ],
        "clarificationRecommendations": (
            (["Add explicit citation and evidence requirements to audited factsheets; unsupported claims recur in reviewed content."]
             if categories["unsupported_claim"] else []) +
            (["Review the most frequently flagged restricted terminology and make approved alternatives easier to find."]
             if categories["exact_violation"] else []) +
            (["Clarify tone examples where contextual inconsistencies continue to appear."]
             if categories["contextual_inconsistency"] else []) +
            (["Prioritize verification of claims with conflicting evidence before approving new content."]
             if evidence["conflicting"] else [])
        ),
    }
