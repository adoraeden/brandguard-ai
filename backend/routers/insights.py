from fastapi import APIRouter
from typing import List, Dict, Any
from models import ReviewDocumentModel

router = APIRouter(prefix="/api/insights", tags=["insights"])

_reviews_ref: List[ReviewDocumentModel] = []

def set_insights_reviews_store(store: List[ReviewDocumentModel]):
    global _reviews_ref
    _reviews_ref = store

@router.get("")
def get_governance_insights():
    term_counts: Dict[str, Dict[str, Any]] = {}
    for r in _reviews_ref:
        for f in r.findings:
            key = f.sourceRuleOrTerm or f.exactText
            if key not in term_counts:
                term_counts[key] = {"count": 0, "category": f.category}
            term_counts[key]["count"] += 1

    top_violated = [
        {"term": k, "count": v["count"], "category": v["category"]}
        for k, v in term_counts.items()
    ]
    top_violated.sort(key=lambda x: x["count"], reverse=True)

    cat_counts = {
        "exact_violation": 0,
        "contextual_inconsistency": 0,
        "unsupported_claim": 0,
        "potential_issue": 0
    }
    total = 0
    for r in _reviews_ref:
        for f in r.findings:
            if f.category in cat_counts:
                cat_counts[f.category] += 1
                total += 1

    findings_by_cat = [
        {"category": cat, "count": count, "percentage": round((count / total) * 100) if total > 0 else 0}
        for cat, count in cat_counts.items()
    ]

    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "informational": 0}
    for r in _reviews_ref:
        for f in r.findings:
            if f.severity in severity_counts:
                severity_counts[f.severity] += 1

    severity_dist = [
        {"severity": sev, "count": cnt}
        for sev, cnt in severity_counts.items()
    ]

    recommendations = []
    if cat_counts["unsupported_claim"] > 0:
        recommendations.push = (
            "Audited engineering factsheets should be expanded to include clear performance benchmark citations to prevent unsupported uptime or security guarantees."
        )
        recommendations.append(
            "Audited engineering factsheets should be expanded to include clear performance benchmark citations to prevent unsupported uptime or security guarantees."
        )
    if cat_counts["exact_violation"] > 1:
        recommendations.append(
            "High frequency of restricted naming ('Aura Cloud App') and workforce elimination claims indicates need for corporate terminology refresher."
        )
    if cat_counts["contextual_inconsistency"] > 0:
        recommendations.append(
            "Contextual tone checks detect recurrent hyperbolic adjectives. Update Brand Voice Guide to include additional concrete approved alternatives."
        )

    return {
        "topViolatedTerms": top_violated[:6],
        "findingsByCategory": findings_by_cat,
        "severityDistribution": severity_dist,
        "unresolvedTrends": [
            {"month": "Aug", "rate": 12},
            {"month": "Sep", "rate": 18},
            {"month": "Oct", "rate": 8},
            {"month": "Nov", "rate": 4}
        ],
        "clarificationRecommendations": recommendations
    }
