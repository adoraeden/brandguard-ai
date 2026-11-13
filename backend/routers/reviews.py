
from datetime import datetime
import csv
import io
import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import (
    DBApprovedFact,
    DBBrandGuideline,
    DBDecisionAudit,
    DBKnowledgeSource,
    DBReviewDocument,
    DBIngestedDocument,
    DBReviewFinding,
    DBReviewSuggestion,
    DBReviewStage,
    DBTerminology,
    get_db,
)
from gemini_analyzer import run_gemini_contextual_analysis
from models import (
    AnalysisRerunRequest,
    DecisionUpdateRequest,
    ReviewDocumentCreate,
    ReviewDocumentModel,
    ReviewSummaryModel,
    FindingDecisionRequest,
    ReviewWorkflowStageCreateRequest,
    ReviewWorkflowStageDecisionRequest,
    ReviewWorkflowStageModel,
)
from rule_engine import run_python_deterministic_checks
from storage import (
    add_review,
    fact_model,
    guideline_model,
    review_model,
    source_model,
    terminology_model,
)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list[ReviewDocumentModel])
def list_reviews(db: Session = Depends(get_db)):
    rows = (
        db.query(DBReviewDocument)
        .order_by(DBReviewDocument.created_at.desc())
        .all()
    )
    return [review_model(row) for row in rows]


@router.get("/{review_id}", response_model=ReviewDocumentModel)
def get_review(review_id: str, db: Session = Depends(get_db)):
    row = db.get(DBReviewDocument, review_id)
    if not row:
        raise HTTPException(404, "Review document not found")
    return review_model(row)


@router.delete("/{review_id}")
def delete_review(review_id: str, db: Session = Depends(get_db)):
    """Permanently delete a pending review and its dependent records."""
    row = db.get(DBReviewDocument, review_id)
    if not row:
        raise HTTPException(404, "Review document not found")
    if row.decision_status not in ("pending", "partially_approved"):
        raise HTTPException(403, "Only pending reviews can be permanently deleted from Pending Reviews")

    db.delete(row)
    db.commit()
    return {"message": "Pending review and its associated records were permanently deleted"}


@router.get("/{review_id}/history")
def get_review_history(review_id: str, db: Session = Depends(get_db)):
    row = db.get(DBReviewDocument, review_id)
    if not row:
        raise HTTPException(404, "Review document not found")

    return [
        {
            "id": item.id,
            "reviewId": item.review_id,
            "findingId": item.finding_id,
            "action": item.action,
            "reviewer": item.reviewer,
            "previousValue": item.previous_value,
            "newValue": item.new_value,
            "createdAt": item.created_at.isoformat(),
        }
        for item in row.audit_history
    ]


def is_finding_unresolved(finding) -> bool:
    lifecycle_status = getattr(finding, "lifecycle_status", None) or getattr(
        finding, "lifecycleStatus", None
    ) or "active"

    if lifecycle_status == "resolved":
        return False

    decision = getattr(finding, "finding_decision", None)
    if decision is None:
        decision = getattr(finding, "findingDecision", None)

    # An explicit dismissal closes a false-positive finding even when a
    # correction suggestion is attached. Accepting the finding itself does
    # not apply that suggestion, so the correction remains independently open.
    if decision == "dismissed":
        return False

    suggestion = getattr(finding, "suggestion", None)
    if suggestion:
        return getattr(suggestion, "status", None) == "pending"

    return decision != "accepted"


def count_unresolved_findings(findings) -> int:
    return sum(1 for finding in findings if is_finding_unresolved(finding))


def active_findings(findings):
    return [
        finding
        for finding in findings
        if (
            getattr(finding, "lifecycle_status", None)
            or getattr(finding, "lifecycleStatus", None)
            or "active"
        ) == "active"
    ]


def apply_suggestion_action(
    row: DBReviewDocument,
    finding: DBReviewFinding,
    action: str,
    custom_text: str | None = None,
    occurrence_index: int | None = None,
    target_index: int | None = None,
):
    suggestion = finding.suggestion

    if not suggestion:
        raise HTTPException(400, "Finding has no suggestion to decide")

    if action not in ("accept", "edit", "reject", "reset"):
        raise HTTPException(422, "Unsupported suggestion action")

    content = row.current_content or ""

    all_other_suggestions = [
        item.suggestion
        for item in row.findings
        if (
            item.suggestion
            and item.id != finding.id
            and (
                item.suggestion.applied_start is not None
                or item.suggestion.applied_end is not None
                or item.suggestion.replaced_text is not None
            )
        )
    ]

    for other in all_other_suggestions:
        if (
            other.applied_start is None
            or other.applied_end is None
            or other.replaced_text is None
        ):
            raise HTTPException(
                409,
                "Another suggestion has incomplete applied-text tracking. Refresh the review.",
            )

        if (
            other.applied_start < 0
            or other.applied_end < other.applied_start
            or other.applied_end > len(content)
        ):
            raise HTTPException(
                409,
                "Another suggestion has invalid applied-text boundaries. Refresh the review.",
            )

    def check_overlap(start: int, end: int):
        for other in all_other_suggestions:
            if max(start, other.applied_start) < min(end, other.applied_end):
                raise HTTPException(
                    409,
                    detail=(
                        f"Cannot apply suggestion: the text span [{start}:{end}] "
                        f"overlaps an already-applied edit at "
                        f"[{other.applied_start}:{other.applied_end}]."
                    ),
                )

    def shift_subsequent(offset_threshold: int, delta: int):
        if delta == 0:
            return

        for other in all_other_suggestions:
            if other.applied_start >= offset_threshold:
                other.applied_start += delta
                other.applied_end += delta

    if action in ("accept", "edit"):
        if action == "edit":
            if custom_text is None or not custom_text.strip():
                raise HTTPException(
                    422,
                    "customText is required when editing a suggestion",
                )
            replacement_text = custom_text
        else:
            replacement_text = suggestion.suggested_text

        if replacement_text is None:
            raise HTTPException(422, "Suggestion has no replacement text")

        has_tracking = (
            suggestion.applied_start is not None
            or suggestion.applied_end is not None
            or suggestion.replaced_text is not None
        )

        if has_tracking:
            if (
                suggestion.applied_start is None
                or suggestion.applied_end is None
                or suggestion.replaced_text is None
            ):
                raise HTTPException(
                    409,
                    "Applied suggestion tracking is incomplete. Refresh the review before editing.",
                )

            curr_start = suggestion.applied_start
            curr_end = suggestion.applied_end

            if (
                curr_start < 0
                or curr_end < curr_start
                or curr_end > len(content)
            ):
                raise HTTPException(
                    409,
                    "Applied text boundaries are invalid. No changes were made.",
                )

            expected_text = (
                suggestion.custom_edited_text
                if suggestion.status == "edited"
                else suggestion.suggested_text
            )

            if content[curr_start:curr_end] != expected_text:
                raise HTTPException(
                    409,
                    "The applied text has changed since the suggestion was saved. "
                    "Refresh the review before editing.",
                )

            check_overlap(curr_start, curr_end)

            delta = len(replacement_text) - (curr_end - curr_start)

            row.current_content = (
                content[:curr_start]
                + replacement_text
                + content[curr_end:]
            )

            suggestion.applied_start = curr_start
            suggestion.applied_end = curr_start + len(replacement_text)

            shift_subsequent(curr_end, delta)

        else:
            target = finding.exact_text

            if not target:
                raise HTTPException(
                    400,
                    "Finding has no exactText to locate in document.",
                )

            matches = []
            pos = 0

            while True:
                idx = content.find(target, pos)

                if idx == -1:
                    break

                matches.append(idx)
                pos = idx + len(target)

            if not matches:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Text span could not be located in current content: "
                        f"'{target}'. It may have already been modified."
                    ),
                )

            chosen_start = None

            if target_index is not None:
                if target_index in matches:
                    chosen_start = target_index
                else:
                    raise HTTPException(
                        409,
                        f"targetIndex {target_index} does not match an occurrence.",
                    )

            elif occurrence_index is not None:
                if 0 <= occurrence_index < len(matches):
                    chosen_start = matches[occurrence_index]
                else:
                    raise HTTPException(
                        409,
                        f"occurrenceIndex {occurrence_index} is out of range. "
                        f"Found {len(matches)} occurrences.",
                    )

            elif len(matches) == 1:
                chosen_start = matches[0]

            else:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Ambiguous text match: '{target}' appears "
                        f"{len(matches)} times. Specify occurrenceIndex "
                        f"(0 to {len(matches) - 1})."
                    ),
                )

            chosen_end = chosen_start + len(target)
            check_overlap(chosen_start, chosen_end)

            replaced = content[chosen_start:chosen_end]
            delta = len(replacement_text) - len(replaced)

            row.current_content = (
                content[:chosen_start]
                + replacement_text
                + content[chosen_end:]
            )

            suggestion.applied_start = chosen_start
            suggestion.applied_end = chosen_start + len(replacement_text)
            suggestion.replaced_text = replaced

            shift_subsequent(chosen_end, delta)

        if action == "accept":
            suggestion.status = "accepted"
            suggestion.custom_edited_text = None
        else:
            suggestion.status = "edited"
            suggestion.custom_edited_text = custom_text

    elif action in ("reject", "reset"):
        has_tracking = (
            suggestion.applied_start is not None
            or suggestion.applied_end is not None
            or suggestion.replaced_text is not None
        )

        if has_tracking:
            if (
                suggestion.applied_start is None
                or suggestion.applied_end is None
                or suggestion.replaced_text is None
            ):
                raise HTTPException(
                    409,
                    "Applied suggestion tracking is incomplete. No changes were made.",
                )

            curr_start = suggestion.applied_start
            curr_end = suggestion.applied_end
            revert_text = suggestion.replaced_text

            if (
                curr_start < 0
                or curr_end < curr_start
                or curr_end > len(content)
            ):
                raise HTTPException(
                    409,
                    "Applied text boundaries are invalid. No changes were made.",
                )

            expected_text = (
                suggestion.custom_edited_text
                if suggestion.status == "edited"
                else suggestion.suggested_text
            )

            if content[curr_start:curr_end] != expected_text:
                raise HTTPException(
                    409,
                    "The applied text no longer matches the saved revision. "
                    "No changes were made. Refresh the review.",
                )

            check_overlap(curr_start, curr_end)

            delta = len(revert_text) - (curr_end - curr_start)

            row.current_content = (
                content[:curr_start]
                + revert_text
                + content[curr_end:]
            )

            shift_subsequent(curr_end, delta)

            suggestion.applied_start = None
            suggestion.applied_end = None
            suggestion.replaced_text = None

        if action == "reject":
            suggestion.status = "rejected"
        else:
            suggestion.status = "pending"
            suggestion.custom_edited_text = None


@router.post("", response_model=ReviewDocumentModel, status_code=201)
def submit_review(
    payload: ReviewDocumentCreate,
    db: Session = Depends(get_db),
):
    review_id = f"rev-{uuid4().hex}"

    guidelines = [
        guideline_model(item)
        for item in db.query(DBBrandGuideline).all()
    ]
    terminology = [
        terminology_model(item)
        for item in db.query(DBTerminology).all()
    ]
    facts = [
        fact_model(item)
        for item in db.query(DBApprovedFact).all()
    ]
    sources = [
        source_model(item)
        for item in db.query(DBKnowledgeSource).all()
    ]

    deterministic_status = "completed"
    deterministic_message = None

    try:
        deterministic = run_python_deterministic_checks(
            payload.content,
            terminology,
            guidelines,
            facts,
            review_id,
        )
    except Exception as error:
        deterministic = []
        deterministic_status = "failed"
        deterministic_message = (
            "Deterministic checks failed. Gemini contextual analysis "
            "was still attempted when configured."
        )
        logger.error(
            "Deterministic review analysis failed review_id=%s exception=%s.%s",
            review_id,
            type(error).__module__,
            type(error).__name__,
        )

    contextual_result = run_gemini_contextual_analysis(
        payload.content,
        payload.title,
        payload.contentType,
        guidelines,
        facts,
        review_id,
        deterministic,
        terminology,
        sources,
    )

    findings = deterministic + contextual_result.findings
    enrich_finding_evidence(findings, guidelines, facts, sources, db, terminology)

    summary = ReviewSummaryModel(
        totalFindings=len(findings),
        exactViolations=sum(f.category == "exact_violation" for f in findings),
        directContradictions=sum(
            f.category == "direct_contradiction" for f in findings
        ),
        contextualInconsistencies=sum(
            f.category == "contextual_inconsistency" for f in findings
        ),
        unsupportedClaims=sum(
            f.category == "unsupported_claim" for f in findings
        ),
        potentialIssues=sum(
            f.category == "potential_issue" for f in findings
        ),
        unresolvedFindings=count_unresolved_findings(findings),
    )

    now = datetime.utcnow().isoformat()

    document = ReviewDocumentModel(
        id=review_id,
        title=payload.title,
        contentType=payload.contentType,
        originalContent=payload.content,
        currentContent=payload.content,
        status="in_review",
        reviewer=(payload.reviewer or "").strip() or "Human Brand Reviewer",
        createdAt=now,
        updatedAt=now,
        findings=findings,
        decisionStatus="pending",
        aiAnalysisStatus=contextual_result.status,
        aiAnalysisMessage=contextual_result.message,
        deterministicAnalysisStatus=deterministic_status,
        deterministicAnalysisMessage=deterministic_message,
        summary=summary,
    )

    try:
        row = add_review(db, document)
        db.commit()
        db.refresh(row)
        return review_model(row)
    except Exception:
        db.rollback()
        raise


def _normalise_evidence_text(value):
    return " ".join(str(value or "").casefold().split())


def _uploaded_document_id(source_url):
    prefix = "internal://api/documents/"
    if not isinstance(source_url, str) or not source_url.startswith(prefix):
        return None
    remainder = source_url[len(prefix):]
    document_id = remainder.split("/", 1)[0].strip()
    return document_id or None


def enrich_finding_evidence(findings, guidelines, facts, sources=None, db=None, terminology=None):
    """Attach auditable source provenance and conservative claim/evidence statuses."""
    guideline_by_id = {item.id: item for item in guidelines}
    fact_by_id = {item.id: item for item in facts}
    source_by_id = {item.id: item for item in (sources or [])}
    terminology_by_id = {item.id: item for item in (terminology or [])}

    for finding in findings:
        record = None
        record_type = finding.evidenceRecordType
        record_id = finding.evidenceRecordId

        if record_type == "guideline" and record_id:
            record = guideline_by_id.get(record_id)
        elif record_type == "fact" and record_id:
            record = fact_by_id.get(record_id)
        elif record_type == "knowledge_source" and record_id:
            record = source_by_id.get(record_id)
        elif record_type == "terminology" and record_id:
            record = terminology_by_id.get(record_id)

        if record is not None:
            finding.sourceDocumentId = getattr(record, "sourceDocumentId", None)
            finding.sourcePageNumber = getattr(record, "sourcePageNumber", None)
            finding.sourceSectionLabel = getattr(record, "sourceSectionLabel", None)
            finding.sourceExcerpt = getattr(record, "sourceExcerpt", None)

            # Uploaded source documents are represented in the approved catalogue
            # by a KnowledgeSource record. Resolve its internal URL back to the
            # stored original and locate the exact cited passage on its source page.
            if record_type == "knowledge_source":
                document_id = _uploaded_document_id(getattr(record, "url", None))
                if document_id:
                    finding.sourceDocumentId = document_id
                    if db is not None and finding.evidenceQuote:
                        document = db.get(DBIngestedDocument, document_id)
                        quote = _normalise_evidence_text(finding.evidenceQuote)
                        for page in (getattr(document, "extracted_pages", None) or []):
                            page_text = _normalise_evidence_text(page.get("text", ""))
                            if quote and quote in page_text:
                                finding.sourcePageNumber = page.get("pageNumber")
                                finding.sourceSectionLabel = page.get("sectionLabel")
                                finding.sourceExcerpt = finding.evidenceQuote
                                break

        # A validated contradiction is conflicting. A policy citation is partial
        # support, not proof that a factual claim itself is true.
        if finding.category == "direct_contradiction" and record is not None and finding.evidenceQuote:
            finding.evidenceStatus = "conflicting"
        elif finding.category == "unsupported_claim" and not record_id:
            finding.evidenceStatus = "unsupported"
        elif record_type == "terminology" and record is not None:
            # A terminology match is traceable to an approved policy entry, but it is
            # not factual evidence for a product or performance claim.
            finding.evidenceStatus = "partially_supported"
        elif record is not None and finding.evidenceQuote:
            if record_type in ("guideline", "terminology") or finding.category in (
                "contextual_inconsistency", "potential_issue"
            ):
                finding.evidenceStatus = "partially_supported"
            else:
                finding.evidenceStatus = "supported"
        elif record_id and finding.evidenceQuote:
            finding.evidenceStatus = "partially_supported"
        elif finding.category == "unsupported_claim":
            finding.evidenceStatus = "unsupported"
        else:
            finding.evidenceStatus = "not_assessed"


def _finding_key(detection_method, category, exact_text):
    normalized = " ".join((exact_text or "").casefold().split())
    return detection_method, category, normalized


@router.post(
    "/{review_id}/rerun-analysis",
    response_model=ReviewDocumentModel,
)
def rerun_review_analysis(
    review_id: str,
    payload: AnalysisRerunRequest,
    db: Session = Depends(get_db),
):
    row = (
        db.query(DBReviewDocument)
        .filter(DBReviewDocument.id == review_id)
        .with_for_update()
        .first()
    )

    if not row:
        raise HTTPException(404, "Review document not found")

    now = datetime.utcnow()
    previous_ai_status = row.ai_analysis_status
    previous_deterministic_status = row.deterministic_analysis_status
    previous_finding_count = len(row.findings)
    content = row.current_content

    reviewer = (
        (payload.reviewer or "").strip()
        or (row.reviewer or "").strip()
        or "Human Brand Reviewer"
    )

    run_id = f"run-{uuid4().hex}"

    try:
        guidelines = [
            guideline_model(item)
            for item in db.query(DBBrandGuideline).all()
        ]
        terminology = [
            terminology_model(item)
            for item in db.query(DBTerminology).all()
        ]
        facts = [
            fact_model(item)
            for item in db.query(DBApprovedFact).all()
        ]
        sources = [
            source_model(item)
            for item in db.query(DBKnowledgeSource).all()
        ]

        existing_models = review_model(row).findings

        deterministic_status = "completed"
        deterministic_message = None

        try:
            deterministic = run_python_deterministic_checks(
                content,
                terminology,
                guidelines,
                facts,
                review_id,
            )
        except Exception as error:
            deterministic = []
            deterministic_status = "failed"
            deterministic_message = (
                "Deterministic checks failed. Gemini contextual analysis "
                "was still attempted when configured."
            )
            logger.error(
                "Deterministic rerun failed review_id=%s exception=%s.%s",
                review_id,
                type(error).__module__,
                type(error).__name__,
            )

        contextual_result = run_gemini_contextual_analysis(
            content,
            row.title,
            row.content_type,
            guidelines,
            facts,
            review_id,
            existing_models + deterministic,
            terminology,
            sources,
        )

        generated = deterministic + contextual_result.findings
        enrich_finding_evidence(generated, guidelines, facts, sources, db, terminology)

        # Build separate keys for each analysis engine.
        deterministic_keys = {
            _finding_key(
                item.detectionMethod,
                item.category,
                item.exactText,
            )
            for item in deterministic
        }

        gemini_keys = {
            _finding_key(
                item.detectionMethod,
                item.category,
                item.exactText,
            )
            for item in contextual_result.findings
        }

        # Resolve old findings only when their own engine completed successfully.
        resolved_count = 0

        for old in row.findings:
            old.lifecycle_status = old.lifecycle_status or "active"

            old_key = _finding_key(
                old.detection_method,
                old.category,
                old.exact_text,
            )

            is_deterministic = old.detection_method in (
                "deterministic_rule",
                "fact_check",
            )
            is_gemini = old.detection_method == "gemini_contextual"

            should_resolve = (
                is_deterministic
                and deterministic_status == "completed"
                and old_key not in deterministic_keys
            ) or (
                is_gemini
                and contextual_result.status == "completed"
                and old_key not in gemini_keys
            )

            if old.lifecycle_status == "active" and should_resolve:
                old.lifecycle_status = "resolved"
                resolved_count += 1

        # Only active findings prevent a new occurrence from being recorded.
        active_findings_by_key = {
            _finding_key(item.detection_method, item.category, item.exact_text): item
            for item in row.findings
            if (item.lifecycle_status or "active") == "active"
        }
        known_active = set(active_findings_by_key)

        added_count = 0

        for finding in generated:
            key = _finding_key(
                finding.detectionMethod,
                finding.category,
                finding.exactText,
            )

            if not key[2]:
                continue

            existing = active_findings_by_key.get(key)
            if existing is not None:
                # The same finding can gain stronger provenance after new
                # evidence is approved. Refresh its evidence fields rather
                # than skipping it and leaving stale "partially supported"
                # metadata on the review.
                existing.evidence_record_type = finding.evidenceRecordType
                existing.evidence_record_id = finding.evidenceRecordId
                existing.evidence_quote = finding.evidenceQuote
                existing.evidence_status = finding.evidenceStatus
                existing.source_document_id = finding.sourceDocumentId
                existing.source_page_number = finding.sourcePageNumber
                existing.source_section_label = finding.sourceSectionLabel
                existing.source_excerpt = finding.sourceExcerpt
                existing.source_reference = finding.sourceReference
                existing.analysis_run_id = run_id
                continue

            known_active.add(key)

            finding_id = f"finding-{uuid4().hex}"
            finding.id = finding_id
            finding.reviewId = review_id
            finding.analysisRunId = run_id

            finding_row = DBReviewFinding(
                id=finding_id,
                review_id=review_id,
                position=len(row.findings),
                title=finding.title,
                category=finding.category,
                severity=finding.severity,
                exact_text=finding.exactText,
                start_index=finding.startIndex,
                end_index=finding.endIndex,
                explanation=finding.explanation,
                source_rule_or_term=finding.sourceRuleOrTerm,
                source_reference=finding.sourceReference,
                detection_method=finding.detectionMethod,
                confidence=finding.confidence,
                evidence_record_type=finding.evidenceRecordType,
                evidence_record_id=finding.evidenceRecordId,
                evidence_quote=finding.evidenceQuote,
                evidence_status=finding.evidenceStatus,
                source_document_id=finding.sourceDocumentId,
                source_page_number=finding.sourcePageNumber,
                source_section_label=finding.sourceSectionLabel,
                source_excerpt=finding.sourceExcerpt,
                analysis_run_id=run_id,
                lifecycle_status="active",
            )

            if finding.suggestion:
                finding.suggestion.id = f"suggestion-{uuid4().hex}"

                finding_row.suggestion = DBReviewSuggestion(
                    id=finding.suggestion.id,
                    suggested_text=finding.suggestion.suggestedText,
                    rationale=finding.suggestion.rationale,
                    author_intent_preserved=finding.suggestion.authorIntentPreserved,
                    status="pending",
                )

            row.findings.append(finding_row)
            added_count += 1

        all_findings = row.findings
        current_findings = active_findings(all_findings)

        counts = {
            "totalFindings": len(current_findings),
            "exactViolations": sum(
                f.category == "exact_violation" for f in current_findings
            ),
            "directContradictions": sum(
                f.category == "direct_contradiction" for f in current_findings
            ),
            "contextualInconsistencies": sum(
                f.category == "contextual_inconsistency"
                for f in current_findings
            ),
            "unsupportedClaims": sum(
                f.category == "unsupported_claim" for f in current_findings
            ),
            "potentialIssues": sum(
                f.category == "potential_issue" for f in current_findings
            ),
            "acceptedSuggestions": sum(
                bool(f.suggestion and f.suggestion.status == "accepted")
                for f in all_findings
            ),
            "rejectedSuggestions": sum(
                bool(f.suggestion and f.suggestion.status == "rejected")
                for f in all_findings
            ),
            "editedSuggestions": sum(
                bool(f.suggestion and f.suggestion.status == "edited")
                for f in all_findings
            ),
            "unresolvedFindings": count_unresolved_findings(all_findings),
        }

        row.ai_analysis_status = contextual_result.status
        row.ai_analysis_message = contextual_result.message
        row.deterministic_analysis_status = deterministic_status
        row.deterministic_analysis_message = deterministic_message
        row.last_analysis_run_id = run_id
        row.reviewer = reviewer
        row.updated_at = now
        row.summary = counts

        if (
            added_count
            and row.status == "completed"
            and row.decision_status != "rejected"
        ):
            row.status = "in_review"
            row.decision_status = "pending"
            row.decided_at = None

        db.add(
            DBDecisionAudit(
                id=f"aud-{uuid4().hex}",
                review_id=review_id,
                action="analysis_rerun",
                reviewer=reviewer,
                previous_value={
                    "aiAnalysisStatus": previous_ai_status,
                    "deterministicAnalysisStatus": previous_deterministic_status,
                    "findingCount": previous_finding_count,
                },
                new_value={
                    "aiAnalysisStatus": contextual_result.status,
                    "aiAnalysisMessage": contextual_result.message,
                    "deterministicAnalysisStatus": deterministic_status,
                    "deterministicAnalysisMessage": deterministic_message,
                    "analysisRunId": run_id,
                    "newFindingCount": added_count,
                    "resolvedFindingCount": resolved_count,
                    "totalFindingCount": len(all_findings),
                    "activeFindingCount": len(current_findings),
                    "reviewStatus": row.status,
                },
                created_at=now,
            )
        )

        db.commit()
        db.refresh(row)
        return review_model(row)

    except Exception:
        db.rollback()
        raise


@router.post(
    "/{review_id}/decisions",
    response_model=ReviewDocumentModel,
)
def record_decision(
    review_id: str,
    payload: DecisionUpdateRequest,
    db: Session = Depends(get_db),
):
    row = (
        db.query(DBReviewDocument)
        .filter(DBReviewDocument.id == review_id)
        .with_for_update()
        .first()
    )

    if not row:
        raise HTTPException(404, "Review document not found")

    if row.status in ("completed", "archived"):
        raise HTTPException(409, "This review is locked and read-only")

    if payload.completeDecision == "pending":
        raise HTTPException(
            422,
            "A completed decision must be approved or rejected",
        )

    now = datetime.utcnow()

    before = {
        "content": row.current_content,
        "status": row.status,
        "decisionStatus": row.decision_status,
        "decisionNotes": row.decision_notes,
    }

    finding_id = payload.findingId

    actor = (
        (payload.reviewer or "").strip()
        or (row.reviewer or "").strip()
        or "Human Brand Reviewer"
    )

    if payload.findingId and payload.suggestionAction:
        finding = next(
            (item for item in row.findings if item.id == payload.findingId),
            None,
        )

        if not finding:
            raise HTTPException(404, "Finding not found")

        suggestion = finding.suggestion

        if not suggestion:
            raise HTTPException(400, "Finding has no suggestion to decide")

        previous = {
            "status": suggestion.status,
            "customEditedText": suggestion.custom_edited_text,
            "appliedStart": suggestion.applied_start,
            "appliedEnd": suggestion.applied_end,
            "replacedText": suggestion.replaced_text,
            "currentContent": row.current_content,
        }

        apply_suggestion_action(
            row=row,
            finding=finding,
            action=payload.suggestionAction,
            custom_text=payload.customText,
            occurrence_index=payload.occurrenceIndex,
            target_index=payload.targetIndex,
        )

        db.add(
            DBDecisionAudit(
                id=f"aud-{uuid4().hex}",
                review_id=review_id,
                finding_id=finding_id,
                action=payload.suggestionAction,
                reviewer=actor,
                previous_value=previous,
                new_value={
                    "status": suggestion.status,
                    "customEditedText": suggestion.custom_edited_text,
                    "appliedStart": suggestion.applied_start,
                    "appliedEnd": suggestion.applied_end,
                    "replacedText": suggestion.replaced_text,
                    "currentContent": row.current_content,
                },
                created_at=now,
            )
        )

    unresolved = count_unresolved_findings(row.findings)

    row.summary = dict(row.summary or {})
    row.summary.update(
        {
            "acceptedSuggestions": sum(
                1
                for f in row.findings
                if f.suggestion and f.suggestion.status == "accepted"
            ),
            "rejectedSuggestions": sum(
                1
                for f in row.findings
                if f.suggestion and f.suggestion.status == "rejected"
            ),
            "editedSuggestions": sum(
                1
                for f in row.findings
                if f.suggestion and f.suggestion.status == "edited"
            ),
            "unresolvedFindings": unresolved,
        }
    )

    if payload.completeDecision == "partially_approved":
        if unresolved <= 0:
            raise HTTPException(
                409,
                "There are no pending findings. Submit a final approval instead.",
            )

        row.decision_status = "partially_approved"
        row.status = "in_review"
        row.decision_notes = payload.decisionNotes or row.decision_notes
        row.decided_at = None
        row.reviewer = actor

        db.add(
            DBDecisionAudit(
                id=f"aud-{uuid4().hex}",
                review_id=review_id,
                action="partial_approval",
                reviewer=actor,
                previous_value=before,
                new_value={
                    "decisionStatus": row.decision_status,
                    "status": row.status,
                    "decisionNotes": row.decision_notes,
                    "acceptedCount": row.summary["acceptedSuggestions"],
                    "rejectedCount": row.summary["rejectedSuggestions"],
                    "editedCount": row.summary["editedSuggestions"],
                    "pendingCount": unresolved,
                    "totalFindings": len(active_findings(row.findings)),
                },
                created_at=now,
            )
        )

    elif payload.completeDecision:
        if unresolved > 0:
            # A reviewer checkpoint records the requested action without
            # closing the review. Unresolved findings remain explicitly pending.
            row.decision_status = "pending"
            row.status = "in_review"
            row.decision_notes = payload.decisionNotes or row.decision_notes
            row.decided_at = None
            row.reviewer = actor

            db.add(
                DBDecisionAudit(
                    id=f"aud-{uuid4().hex}",
                    review_id=review_id,
                    action="decision_checkpoint",
                    reviewer=actor,
                    previous_value=before,
                    new_value={
                        "checkpointDecision": payload.completeDecision,
                        "decisionStatus": row.decision_status,
                        "status": row.status,
                        "decisionNotes": row.decision_notes,
                        "acceptedCount": row.summary["acceptedSuggestions"],
                        "rejectedCount": row.summary["rejectedSuggestions"],
                        "editedCount": row.summary["editedSuggestions"],
                        "pendingCount": unresolved,
                        "totalFindings": len(active_findings(row.findings)),
                    },
                    created_at=now,
                )
            )
        else:
            row.decision_status = payload.completeDecision
            row.status = "completed"
            row.decision_notes = payload.decisionNotes or row.decision_notes
            row.decided_at = now.isoformat()

            if payload.reviewer:
                row.reviewer = actor

            db.add(
                DBDecisionAudit(
                    id=f"aud-{uuid4().hex}",
                    review_id=review_id,
                    action="complete",
                    reviewer=actor,
                    previous_value=before,
                    new_value={
                        "decisionStatus": row.decision_status,
                        "status": row.status,
                        "decisionNotes": row.decision_notes,
                        "acceptedCount": row.summary["acceptedSuggestions"],
                        "rejectedCount": row.summary["rejectedSuggestions"],
                        "editedCount": row.summary["editedSuggestions"],
                        "pendingCount": unresolved,
                        "totalFindings": len(active_findings(row.findings)),
                    },
                    created_at=now,
                )
            )

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


@router.post(
    "/{review_id}/findings/{finding_id}/decision",
    response_model=ReviewDocumentModel,
)
def decide_finding(
    review_id: str,
    finding_id: str,
    payload: FindingDecisionRequest,
    db: Session = Depends(get_db),
):
    row = (
        db.query(DBReviewDocument)
        .filter(DBReviewDocument.id == review_id)
        .with_for_update()
        .first()
    )

    if not row:
        raise HTTPException(404, "Review document not found")

    if row.status in ("completed", "archived"):
        raise HTTPException(409, "This review is locked and read-only")

    finding = next(
        (item for item in row.findings if item.id == finding_id),
        None,
    )

    if not finding:
        raise HTTPException(404, "Finding not found for this review")

    now = datetime.utcnow()

    actor = (
        (payload.reviewer or "").strip()
        or (row.reviewer or "").strip()
        or "Human Brand Reviewer"
    )

    previous = {
        "decision": finding.finding_decision,
        "note": finding.finding_decision_note,
        "reviewer": finding.finding_decision_reviewer,
        "at": finding.finding_decision_at,
    }

    finding.finding_decision = payload.decision
    finding.finding_decision_reviewer = actor
    finding.finding_decision_at = now.isoformat() + "Z"
    finding.finding_decision_note = payload.note

    unresolved = count_unresolved_findings(row.findings)

    row.summary = dict(row.summary or {})
    row.summary["unresolvedFindings"] = unresolved
    row.updated_at = now

    db.add(
        DBDecisionAudit(
            id=f"aud-{uuid4().hex}",
            review_id=review_id,
            finding_id=finding_id,
            action="finding_decision",
            reviewer=actor,
            previous_value=previous,
            new_value={
                "decision": finding.finding_decision,
                "note": finding.finding_decision_note,
                "reviewer": actor,
                "at": finding.finding_decision_at,
            },
            created_at=now,
        )
    )

    try:
        db.commit()
        db.refresh(row)
        return review_model(row)
    except Exception:
        db.rollback()
        raise



def apply_workflow_stage_decision(stages, stage, decision, note, now):
    if stage.status not in ("in_review", "returned"):
        raise HTTPException(409, "Only the active or returned stage can receive a decision")
    if any(item.stage_order < stage.stage_order and item.status != "approved" for item in stages):
        raise HTTPException(409, "Earlier review stages must be approved first")
    previous = {"status": stage.status, "decisionNote": stage.decision_note}
    stage.status = decision
    stage.decision_note = note
    stage.updated_at = now
    stage.completed_at = now if decision in ("approved", "rejected") else None
    if decision == "approved":
        next_stage = next((item for item in stages if item.stage_order > stage.stage_order and item.status == "pending"), None)
        if next_stage:
            next_stage.status = "in_review"
            next_stage.updated_at = now
    return previous


def workflow_stage_model(row):
    return ReviewWorkflowStageModel(
        id=row.id, reviewId=row.review_id, order=row.stage_order,
        name=row.name, assignedReviewer=row.assigned_reviewer,
        status=row.status, decisionNote=row.decision_note,
        createdBy=row.created_by, createdAt=row.created_at.isoformat() + "Z",
        updatedAt=row.updated_at.isoformat() + "Z",
        completedAt=row.completed_at.isoformat() + "Z" if row.completed_at else None,
    )


def next_workflow_stage_status(stages):
    """Activate a newly appended stage only when no stage is currently in progress."""
    if not stages:
        return "in_review"
    if any(item.status in ("pending", "in_review", "returned") for item in stages):
        return "pending"
    if all(item.status == "approved" for item in stages):
        return "in_review"
    return "pending"


@router.get("/{review_id}/workflow", response_model=list[ReviewWorkflowStageModel])
def get_review_workflow(review_id: str, db: Session = Depends(get_db)):
    review = db.get(DBReviewDocument, review_id)
    if not review:
        raise HTTPException(404, "Review document not found")
    rows = db.query(DBReviewStage).filter_by(review_id=review_id).order_by(DBReviewStage.stage_order.asc()).all()
    return [workflow_stage_model(item) for item in rows]


@router.post("/{review_id}/workflow/stages", response_model=ReviewWorkflowStageModel, status_code=201)
def add_review_workflow_stage(review_id: str, payload: ReviewWorkflowStageCreateRequest, db: Session = Depends(get_db)):
    review = db.get(DBReviewDocument, review_id)
    if not review:
        raise HTTPException(404, "Review document not found")
    if review.status in ("completed", "archived"):
        raise HTTPException(409, "Completed reviews cannot be reassigned")
    name, assigned = payload.name.strip(), payload.assignedReviewer.strip()
    if not name or not assigned:
        raise HTTPException(422, "A stage name and assigned reviewer are required")
    rows = db.query(DBReviewStage).filter_by(review_id=review_id).order_by(DBReviewStage.stage_order.asc()).all()
    now = datetime.utcnow()
    actor = (payload.reviewer or review.reviewer or "Human Brand Reviewer").strip()
    row = DBReviewStage(
        id=f"stage-{uuid4().hex}", review_id=review_id,
        stage_order=(rows[-1].stage_order + 1) if rows else 1,
        name=name, assigned_reviewer=assigned,
        status=next_workflow_stage_status(rows),
        created_by=actor, created_at=now, updated_at=now,
    )
    db.add(row)
    db.add(DBDecisionAudit(
        id=f"aud-{uuid4().hex}", review_id=review_id,
        action="workflow_stage_assigned", reviewer=actor,
        previous_value=None,
        new_value={"stageId": row.id, "order": row.stage_order, "name": name,
                   "assignedReviewer": assigned, "status": row.status},
        created_at=now,
    ))
    try:
        db.commit()
        db.refresh(row)
        return workflow_stage_model(row)
    except Exception:
        db.rollback()
        raise


@router.post("/{review_id}/workflow/stages/{stage_id}/decision", response_model=list[ReviewWorkflowStageModel])
def decide_review_workflow_stage(review_id: str, stage_id: str, payload: ReviewWorkflowStageDecisionRequest, db: Session = Depends(get_db)):
    review = db.query(DBReviewDocument).filter(DBReviewDocument.id == review_id).with_for_update().first()
    if not review:
        raise HTTPException(404, "Review document not found")
    if review.status in ("completed", "archived"):
        raise HTTPException(409, "Completed reviews cannot be changed")
    stages = db.query(DBReviewStage).filter_by(review_id=review_id).order_by(DBReviewStage.stage_order.asc()).all()
    stage = next((item for item in stages if item.id == stage_id), None)
    if not stage:
        raise HTTPException(404, "Workflow stage not found")
    actor = (payload.reviewer or "").strip()
    now = datetime.utcnow()

    if payload.decision == "resubmitted":
        if stage.status != "returned":
            raise HTTPException(409, "Only a returned stage can be resubmitted")
        if not actor or actor.casefold() != stage.created_by.casefold():
            raise HTTPException(403, "Only the stage creator can resubmit returned work")
        previous = {"status": stage.status, "decisionNote": stage.decision_note}
        stage.status = "in_review"
        if payload.note:
            stage.decision_note = payload.note
        stage.updated_at = now
        stage.completed_at = None
    else:
        actor = actor or stage.assigned_reviewer
        if actor.casefold() != stage.assigned_reviewer.casefold():
            raise HTTPException(403, "Only the assigned reviewer can decide this stage")
        previous = apply_workflow_stage_decision(stages, stage, payload.decision, payload.note, now)

    db.add(DBDecisionAudit(
        id=f"aud-{uuid4().hex}", review_id=review_id,
        action="workflow_stage_" + payload.decision, reviewer=actor,
        previous_value=previous,
        new_value={"stageId": stage.id, "stageName": stage.name,
                   "assignedReviewer": stage.assigned_reviewer,
                   "createdBy": stage.created_by,
                   "status": stage.status, "note": stage.decision_note},
        created_at=now,
    ))
    try:
        db.commit()
        return [workflow_stage_model(item) for item in stages]
    except Exception:
        db.rollback()
        raise


@router.get("/{review_id}/workflow/export")
def export_review_workflow(review_id: str, db: Session = Depends(get_db)):
    review = db.get(DBReviewDocument, review_id)
    if not review:
        raise HTTPException(404, "Review document not found")
    stages = db.query(DBReviewStage).filter_by(review_id=review_id).order_by(DBReviewStage.stage_order.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Review ID", "Review title", "Stage order", "Stage", "Assigned reviewer",
                     "Status", "Decision note", "Created by", "Created at", "Updated at", "Completed at"])
    for stage in stages:
        writer.writerow([review.id, review.title, stage.stage_order, stage.name, stage.assigned_reviewer,
                         stage.status, stage.decision_note or "", stage.created_by,
                         stage.created_at.isoformat(), stage.updated_at.isoformat(),
                         stage.completed_at.isoformat() if stage.completed_at else ""])
    from fastapi.responses import StreamingResponse
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="review-{review_id}-workflow.csv"'})

