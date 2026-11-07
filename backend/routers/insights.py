from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import DBReviewDocument, get_db

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("")
def get_governance_insights(db: Session = Depends(get_db)):
    reviews = db.query(DBReviewDocument).order_by(DBReviewDocument.created_at.asc()).all()
    term_counts, term_categories = Counter(), {}
    categories = {"exact_violation": 0, "contextual_inconsistency": 0,
                  "direct_contradiction": 0, "unsupported_claim": 0, "potential_issue": 0}
    severities = {"critical": 0, "high": 0, "medium": 0, "low": 0, "informational": 0}
    mismatch_sources = Counter()
    monthly = {}
    unresolved = 0
    for review in reviews:
        month = review.created_at.strftime("%Y-%m")
        summary = review.summary or {}
        month_data = monthly.setdefault(month, {"month": month, "reviews": 0, "unresolved": 0})
        month_data["reviews"] += 1
        month_data["unresolved"] += int(summary.get("unresolvedFindings", 0))
        unresolved += int(summary.get("unresolvedFindings", 0))
        for finding in review.findings:
            key = finding.source_rule_or_term or finding.exact_text
            term_counts[key] += 1
            term_categories.setdefault(key, finding.category)
            if finding.category in categories:
                categories[finding.category] += 1
            if finding.severity in severities:
                severities[finding.severity] += 1
            if finding.detection_method == "fact_check" or finding.category == "unsupported_claim":
                mismatch_sources[("factsheet", finding.source_reference or "No source reference")] += 1
            elif not finding.source_rule_or_term.lower().startswith("terminology:"):
                mismatch_sources[("guideline", finding.source_reference or "No source reference")] += 1
    total_findings = sum(categories.values())
    completed = sum(review.decision_status != "pending" for review in reviews)
    pending = len(reviews) - completed
    repeated = [{"term": term, "count": count, "category": term_categories[term]}
                for term, count in term_counts.most_common(8)]
    return {
        "topViolatedTerms": repeated[:6],
        "repeatedTerminology": [item for item in repeated if item["category"] == "exact_violation"],
        "referenceMismatches": [{"type": kind, "source": source, "count": count}
                                 for (kind, source), count in mismatch_sources.most_common(8)],
        "reviewStatistics": {"total": len(reviews), "completed": completed, "pending": pending,
                             "completionRate": round(completed * 100 / len(reviews)) if reviews else 0,
                             "totalFindings": total_findings, "unresolvedFindings": unresolved},
        "findingsByCategory": [{"category": category, "count": count,
            "percentage": round(count * 100 / total_findings) if total_findings else 0}
            for category, count in categories.items()],
        "severityDistribution": [{"severity": severity, "count": count}
                                 for severity, count in severities.items()],
        "unresolvedTrends": [{"month": item["month"], "rate": round(item["unresolved"] * 100 / item["reviews"])
                              if item["reviews"] else 0} for item in list(monthly.values())[-6:]],
        "clarificationRecommendations": (
            (["Add clear citations and evidence requirements to audited factsheets; unsupported claims recur in reviewed content."] if categories["unsupported_claim"] else []) +
            (["Review the most frequently flagged restricted terminology and make approved alternatives easier to find."] if categories["exact_violation"] else []) +
            (["Clarify tone examples where contextual inconsistencies continue to appear."] if categories["contextual_inconsistency"] else []))
    }
