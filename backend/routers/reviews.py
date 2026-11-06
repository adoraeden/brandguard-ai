from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime
from models import (
    ReviewDocumentModel, ReviewDocumentCreate, DecisionUpdateRequest, ReviewSummaryModel,
    BrandGuidelineModel, TerminologyEntryModel, ApprovedFactModel
)
from rule_engine import run_python_deterministic_checks
from gemini_analyzer import run_gemini_contextual_analysis

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

_reviews_store: List[ReviewDocumentModel] = []
_guidelines_ref: List[BrandGuidelineModel] = []
_terminology_ref: List[TerminologyEntryModel] = []
_facts_ref: List[ApprovedFactModel] = []

def init_review_stores(revs, g, t, f):
    global _reviews_store, _guidelines_ref, _terminology_ref, _facts_ref
    _reviews_store = revs
    _guidelines_ref = g
    _terminology_ref = t
    _facts_ref = f

@router.get("", response_model=List[ReviewDocumentModel])
def list_reviews():
    return _reviews_store

@router.get("/{review_id}", response_model=ReviewDocumentModel)
def get_review(review_id: str):
    doc = next((r for r in _reviews_store if r.id == review_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Review document not found")
    return doc

@router.post("", response_model=ReviewDocumentModel, status_code=201)
def submit_review(payload: ReviewDocumentCreate):
    review_id = f"rev-{int(datetime.utcnow().timestamp())}"

    # 1. Deterministic Rule Checks (Exact Matches)
    deterministic_findings = run_python_deterministic_checks(
        payload.content,
        _terminology_ref,
        _guidelines_ref,
        _facts_ref,
        review_id
    )

    # 2. Gemini Contextual Checks (Tone, Ethics, Ambiguity)
    gemini_findings = run_gemini_contextual_analysis(
        payload.content,
        payload.title,
        payload.contentType,
        _guidelines_ref,
        _facts_ref,
        review_id,
        deterministic_findings
    )

    all_findings = deterministic_findings + gemini_findings

    summary = ReviewSummaryModel(
        totalFindings=len(all_findings),
        exactViolations=len([f for f in all_findings if f.category == 'exact_violation']),
        contextualInconsistencies=len([f for f in all_findings if f.category == 'contextual_inconsistency']),
        unsupportedClaims=len([f for f in all_findings if f.category == 'unsupported_claim']),
        potentialIssues=len([f for f in all_findings if f.category == 'potential_issue']),
        unresolvedFindings=len(all_findings)
    )

    now_iso = datetime.utcnow().isoformat()
    doc = ReviewDocumentModel(
        id=review_id,
        title=payload.title,
        contentType=payload.contentType,
        originalContent=payload.content,
        currentContent=payload.content,
        status="in_review",
        reviewer=payload.reviewer or "Human Brand Reviewer",
        createdAt=now_iso,
        updatedAt=now_iso,
        findings=all_findings,
        decisionStatus="pending",
        summary=summary
    )

    _reviews_store.insert(0, doc)
    return doc

@router.post("/{review_id}/decisions", response_model=ReviewDocumentModel)
def record_decision(review_id: str, payload: DecisionUpdateRequest):
    doc = next((r for r in _reviews_store if r.id == review_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Review document not found")

    if payload.findingId and payload.suggestionAction:
        finding = next((f for f in doc.findings if f.id == payload.findingId), None)
        if finding and finding.suggestion:
            if payload.suggestionAction == "accept":
                finding.suggestion.status = "accepted"
                doc.currentContent = doc.currentContent.replace(finding.exactText, finding.suggestion.suggestedText)
            elif payload.suggestionAction == "reject":
                finding.suggestion.status = "rejected"
            elif payload.suggestionAction == "edit" and payload.customText:
                finding.suggestion.status = "edited"
                finding.suggestion.customEditedText = payload.customText
                doc.currentContent = doc.currentContent.replace(finding.exactText, payload.customText)
            elif payload.suggestionAction == "reset":
                finding.suggestion.status = "pending"

    # Recompute summary counts
    doc.summary.acceptedSuggestions = len([f for f in doc.findings if f.suggestion and f.suggestion.status == "accepted"])
    doc.summary.rejectedSuggestions = len([f for f in doc.findings if f.suggestion and f.suggestion.status == "rejected"])
    doc.summary.editedSuggestions = len([f for f in doc.findings if f.suggestion and f.suggestion.status == "edited"])
    doc.summary.unresolvedFindings = len([f for f in doc.findings if not f.suggestion or f.suggestion.status == "pending"])

    if payload.completeDecision:
        doc.decisionStatus = payload.completeDecision
        doc.status = "completed"
        doc.decisionNotes = payload.decisionNotes or doc.decisionNotes
        doc.decidedAt = datetime.utcnow().isoformat()
        if payload.reviewer:
            doc.reviewer = payload.reviewer

    doc.updatedAt = datetime.utcnow().isoformat()
    return doc
