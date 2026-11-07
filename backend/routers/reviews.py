from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import (DBApprovedFact, DBBrandGuideline, DBDecisionAudit,
                      DBKnowledgeSource, DBReviewDocument, DBReviewFinding,
                      DBReviewSuggestion, DBTerminology, get_db)
from gemini_analyzer import run_gemini_contextual_analysis
from models import (AnalysisRerunRequest, DecisionUpdateRequest, ReviewDocumentCreate,
                    ReviewDocumentModel, ReviewSummaryModel)
from rule_engine import run_python_deterministic_checks
from storage import (add_review, fact_model, guideline_model, review_model,
                     source_model, terminology_model)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

@router.get("", response_model=list[ReviewDocumentModel])
def list_reviews(db: Session = Depends(get_db)):
    rows = db.query(DBReviewDocument).order_by(DBReviewDocument.created_at.desc()).all()
    return [review_model(row) for row in rows]

@router.get("/{review_id}", response_model=ReviewDocumentModel)
def get_review(review_id: str, db: Session = Depends(get_db)):
    row = db.get(DBReviewDocument, review_id)
    if not row:
        raise HTTPException(404, "Review document not found")
    return review_model(row)

@router.get("/{review_id}/history")
def get_review_history(review_id: str, db: Session = Depends(get_db)):
    row = db.get(DBReviewDocument, review_id)
    if not row:
        raise HTTPException(404, "Review document not found")
    return [{"id": item.id, "reviewId": item.review_id, "findingId": item.finding_id,
        "action": item.action, "reviewer": item.reviewer,
        "previousValue": item.previous_value, "newValue": item.new_value,
        "createdAt": item.created_at.isoformat()}
        for item in row.audit_history]

@router.post("", response_model=ReviewDocumentModel, status_code=201)
def submit_review(payload: ReviewDocumentCreate, db: Session = Depends(get_db)):
    review_id = f"rev-{uuid4().hex}"
    guidelines = [guideline_model(x) for x in db.query(DBBrandGuideline).all()]
    terminology = [terminology_model(x) for x in db.query(DBTerminology).all()]
    facts = [fact_model(x) for x in db.query(DBApprovedFact).all()]
    sources = [source_model(x) for x in db.query(DBKnowledgeSource).all()]

    deterministic = run_python_deterministic_checks(
        payload.content, terminology, guidelines, facts, review_id)
    contextual_result = run_gemini_contextual_analysis(
        payload.content, payload.title, payload.contentType, guidelines, facts,
        review_id, deterministic, terminology, sources)
    contextual = contextual_result.findings
    findings = deterministic + contextual
    summary = ReviewSummaryModel(
        totalFindings=len(findings),
        exactViolations=sum(f.category == "exact_violation" for f in findings),
        directContradictions=sum(f.category == "direct_contradiction" for f in findings),
        contextualInconsistencies=sum(f.category == "contextual_inconsistency" for f in findings),
        unsupportedClaims=sum(f.category == "unsupported_claim" for f in findings),
        potentialIssues=sum(f.category == "potential_issue" for f in findings),
        unresolvedFindings=sum(not f.suggestion or f.suggestion.status == "pending" for f in findings))
    now = datetime.utcnow().isoformat()
    document = ReviewDocumentModel(
        id=review_id, title=payload.title, contentType=payload.contentType,
        originalContent=payload.content, currentContent=payload.content,
        status="in_review", reviewer=payload.reviewer or "Human Brand Reviewer",
        createdAt=now, updatedAt=now, findings=findings,
        decisionStatus="pending", aiAnalysisStatus=contextual_result.status,
        aiAnalysisMessage=contextual_result.message, summary=summary)
    try:
        row = add_review(db, document)
        db.commit()
        db.refresh(row)
        return review_model(row)
    except Exception:
        db.rollback()
        raise


def _finding_key(detection_method, category, exact_text):
    normalized = ' '.join((exact_text or '').casefold().split())
    return detection_method, category, normalized


@router.post("/{review_id}/rerun-analysis", response_model=ReviewDocumentModel)
def rerun_review_analysis(review_id: str, payload: AnalysisRerunRequest,
                          db: Session = Depends(get_db)):
    # Lock this review while analyzing so two concurrent reruns cannot append the
    # same finding before either request commits.
    row = (db.query(DBReviewDocument)
           .filter(DBReviewDocument.id == review_id)
           .with_for_update()
           .first())
    if not row:
        raise HTTPException(404, "Review document not found")

    now = datetime.utcnow()
    previous_ai_status = row.ai_analysis_status
    previous_finding_count = len(row.findings)
    content = row.current_content
    reviewer = payload.reviewer or row.reviewer or "Human Brand Reviewer"
    run_id = f"run-{uuid4().hex}"

    try:
        guidelines = [guideline_model(x) for x in db.query(DBBrandGuideline).all()]
        terminology = [terminology_model(x) for x in db.query(DBTerminology).all()]
        facts = [fact_model(x) for x in db.query(DBApprovedFact).all()]
        sources = [source_model(x) for x in db.query(DBKnowledgeSource).all()]
        existing_models = review_model(row).findings

        deterministic = run_python_deterministic_checks(
            content, terminology, guidelines, facts, review_id)
        contextual_result = run_gemini_contextual_analysis(
            content, row.title, row.content_type, guidelines, facts,
            review_id, existing_models + deterministic, terminology, sources)
        generated = deterministic + contextual_result.findings

        known = {_finding_key(item.detection_method, item.category, item.exact_text)
                 for item in row.findings}
        added_count = 0
        for finding in generated:
            key = _finding_key(finding.detectionMethod, finding.category, finding.exactText)
            if not key[2] or key in known:
                continue
            known.add(key)
            finding_id = f"finding-{uuid4().hex}"
            finding.id = finding_id
            finding.reviewId = review_id
            finding.analysisRunId = run_id
            finding_row = DBReviewFinding(
                id=finding_id, review_id=review_id, position=len(row.findings),
                title=finding.title, category=finding.category, severity=finding.severity,
                exact_text=finding.exactText, start_index=finding.startIndex,
                end_index=finding.endIndex, explanation=finding.explanation,
                source_rule_or_term=finding.sourceRuleOrTerm,
                source_reference=finding.sourceReference,
                detection_method=finding.detectionMethod, confidence=finding.confidence,
                evidence_record_type=finding.evidenceRecordType,
                evidence_record_id=finding.evidenceRecordId,
                evidence_quote=finding.evidenceQuote, analysis_run_id=run_id)
            if finding.suggestion:
                finding.suggestion.id = f"suggestion-{uuid4().hex}"
                finding_row.suggestion = DBReviewSuggestion(
                    id=finding.suggestion.id, suggested_text=finding.suggestion.suggestedText,
                    rationale=finding.suggestion.rationale,
                    author_intent_preserved=finding.suggestion.authorIntentPreserved,
                    status='pending')
            row.findings.append(finding_row)
            added_count += 1

        all_findings = row.findings
        counts = {
            "totalFindings": len(all_findings),
            "exactViolations": sum(f.category == "exact_violation" for f in all_findings),
            "directContradictions": sum(f.category == "direct_contradiction" for f in all_findings),
            "contextualInconsistencies": sum(f.category == "contextual_inconsistency" for f in all_findings),
            "unsupportedClaims": sum(f.category == "unsupported_claim" for f in all_findings),
            "potentialIssues": sum(f.category == "potential_issue" for f in all_findings),
            "acceptedSuggestions": sum(bool(f.suggestion and f.suggestion.status == "accepted") for f in all_findings),
            "rejectedSuggestions": sum(bool(f.suggestion and f.suggestion.status == "rejected") for f in all_findings),
            "editedSuggestions": sum(bool(f.suggestion and f.suggestion.status == "edited") for f in all_findings),
            "unresolvedFindings": sum(not f.suggestion or f.suggestion.status == "pending" for f in all_findings),
        }

        row.ai_analysis_status = contextual_result.status
        row.ai_analysis_message = contextual_result.message
        row.last_analysis_run_id = run_id
        row.reviewer = reviewer
        row.updated_at = now
        row.summary = counts
        if added_count and row.status == "completed":
            # New pending findings reopen the review but retain the former
            # decision and every audit entry in the history table.
            row.status = "in_review"
            row.decision_status = "pending"
            row.decided_at = None

        db.add(DBDecisionAudit(
            id=f"aud-{uuid4().hex}", review_id=review_id, action="analysis_rerun",
            reviewer=reviewer,
            previous_value={"aiAnalysisStatus": previous_ai_status,
                            "findingCount": previous_finding_count},
            new_value={"aiAnalysisStatus": contextual_result.status,
                       "aiAnalysisMessage": contextual_result.message,
                       "analysisRunId": run_id, "newFindingCount": added_count,
                       "totalFindingCount": len(all_findings), "reviewStatus": row.status},
            created_at=now))
        db.commit()
        db.refresh(row)
        return review_model(row)
    except Exception:
        db.rollback()
        raise

@router.post("/{review_id}/decisions", response_model=ReviewDocumentModel)
def record_decision(review_id: str, payload: DecisionUpdateRequest, db: Session = Depends(get_db)):
    row = db.get(DBReviewDocument, review_id)
    if not row:
        raise HTTPException(404, "Review document not found")
    if payload.completeDecision == "pending":
        raise HTTPException(422, "A completed decision must be approved or rejected")
    now = datetime.utcnow()
    before = {"content": row.current_content, "status": row.status,
              "decisionStatus": row.decision_status, "decisionNotes": row.decision_notes}
    audit_action = payload.suggestionAction or ("complete" if payload.completeDecision else "update")
    finding_id = payload.findingId

    if payload.findingId and payload.suggestionAction:
        finding = next((item for item in row.findings if item.id == payload.findingId), None)
        if not finding:
            raise HTTPException(404, "Finding not found")
        suggestion = finding.suggestion
        if not suggestion:
            raise HTTPException(400, "Finding has no suggestion to decide")
        previous = {"status": suggestion.status, "customEditedText": suggestion.custom_edited_text,
                    "currentContent": row.current_content}
        if payload.suggestionAction == "accept":
            suggestion.status = "accepted"
            row.current_content = row.current_content.replace(finding.exact_text, suggestion.suggested_text, 1)
        elif payload.suggestionAction == "reject":
            suggestion.status = "rejected"
        elif payload.suggestionAction == "edit":
            if not payload.customText:
                raise HTTPException(422, "customText is required when editing a suggestion")
            suggestion.status = "edited"
            suggestion.custom_edited_text = payload.customText
            row.current_content = row.current_content.replace(finding.exact_text, payload.customText, 1)
        elif payload.suggestionAction == "reset":
            suggestion.status = "pending"
            suggestion.custom_edited_text = None
        db.add(DBDecisionAudit(id=f"aud-{uuid4().hex}", review_id=review_id,
            finding_id=finding_id, action=payload.suggestionAction,
            reviewer=payload.reviewer, previous_value=previous,
            new_value={"status": suggestion.status, "customEditedText": suggestion.custom_edited_text,
                       "currentContent": row.current_content}, created_at=now))

    unresolved = sum(not finding.suggestion or finding.suggestion.status == "pending" for finding in row.findings)
    row.summary = dict(row.summary or {})
    row.summary.update({
        "acceptedSuggestions": sum(1 for f in row.findings if f.suggestion and f.suggestion.status == "accepted"),
        "rejectedSuggestions": sum(1 for f in row.findings if f.suggestion and f.suggestion.status == "rejected"),
        "editedSuggestions": sum(1 for f in row.findings if f.suggestion and f.suggestion.status == "edited"),
        "unresolvedFindings": unresolved,
    })
    if payload.completeDecision:
        if unresolved > 0:
            # Persist any finding decision included in this request, but refuse sign-off.
            row.updated_at = now
            db.commit()
            return JSONResponse(status_code=400, content={
                "error": f"Cannot finalize review with unresolved findings. All {len(row.findings)} finding(s) must receive an explicit human decision (accepted, edited, or rejected) before final sign-off. ({unresolved} finding(s) still unresolved).",
                "unresolvedCount": unresolved,
                "acceptedCount": row.summary["acceptedSuggestions"],
                "rejectedCount": row.summary["rejectedSuggestions"],
                "editedCount": row.summary["editedSuggestions"],
                "totalFindings": len(row.findings)})
        row.decision_status = payload.completeDecision
        row.status = "completed"
        row.decision_notes = payload.decisionNotes or row.decision_notes
        row.decided_at = now.isoformat()
        if payload.reviewer:
            row.reviewer = payload.reviewer
        db.add(DBDecisionAudit(id=f"aud-{uuid4().hex}", review_id=review_id,
            action="complete", reviewer=payload.reviewer,
            previous_value=before,
            new_value={"decisionStatus": row.decision_status, "status": row.status,
                       "decisionNotes": row.decision_notes}, created_at=now))
    elif unresolved and row.status == "completed":
        row.status = "in_review"
        row.decision_status = "pending"
        row.decided_at = None
    row.updated_at = now
    try:
        db.commit()
        db.refresh(row)
        return review_model(row)
    except Exception:
        db.rollback()
        raise
