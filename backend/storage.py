from models import (
    ApprovedFactModel, BrandGuidelineModel, ReviewDocumentModel,
    KnowledgeSourceModel, ReviewFindingModel, ReviewSummaryModel, SuggestionModel,
    TerminologyEntryModel,
)
from database import (
    DBApprovedFact, DBBrandGuideline, DBKnowledgeSource, DBReviewDocument,
    DBReviewFinding, DBReviewSuggestion, DBTerminology,
)


def guideline_model(row):
    return BrandGuidelineModel(id=row.id, title=row.title, category=row.category,
        description=row.description, severity=row.severity,
        sourceReference=row.source_reference, status=row.status,
        lastUpdated=row.last_updated,
        examples={"approved": row.approved_example, "prohibited": row.prohibited_example}
        if row.approved_example or row.prohibited_example else None)


def guideline_row(model):
    return DBBrandGuideline(id=model.id, title=model.title, category=model.category,
        description=model.description, severity=model.severity,
        source_reference=model.sourceReference, status=model.status,
        last_updated=model.lastUpdated,
        approved_example=(model.examples or {}).get("approved"),
        prohibited_example=(model.examples or {}).get("prohibited"))


def terminology_model(row):
    return TerminologyEntryModel(id=row.id, preferredTerm=row.preferred_term,
        restrictedTerm=row.restricted_term, explanation=row.explanation,
        approvedAlternative=row.approved_alternative, category=row.category,
        priority=row.priority or 'medium',
        status=row.status, createdAt=row.created_at)


def terminology_row(model):
    return DBTerminology(id=model.id, preferred_term=model.preferredTerm,
        restricted_term=model.restrictedTerm, explanation=model.explanation,
        approved_alternative=model.approvedAlternative, category=model.category,
        priority=model.priority,
        status=model.status, created_at=model.createdAt)


def fact_model(row):
    return ApprovedFactModel(id=row.id, title=row.title, statement=row.statement,
        category=row.category, source=row.source,
        verificationStatus=row.verification_status, lastUpdated=row.last_updated)


def fact_row(model):
    return DBApprovedFact(id=model.id, title=model.title, statement=model.statement,
        category=model.category, source=model.source,
        verification_status=model.verificationStatus, last_updated=model.lastUpdated)


def source_model(row):
    return KnowledgeSourceModel(id=row.id, title=row.title, type=row.source_type,
        description=row.description, version=row.version,
        effectiveDate=row.effective_date, ruleCount=row.rule_count,
        url=row.source_url, status=row.status)


def source_row(model):
    return DBKnowledgeSource(id=model.id, title=model.title, source_type=model.type,
        description=model.description, version=model.version,
        effective_date=model.effectiveDate, rule_count=model.ruleCount,
        source_url=model.url, status=model.status)


def review_model(row):
    findings = []
    for item in row.findings:
        suggestion = item.suggestion
        findings.append(ReviewFindingModel(
            lifecycleStatus=item.lifecycle_status or "active",
            id=item.id, reviewId=item.review_id, title=item.title,
            category=item.category, severity=item.severity, exactText=item.exact_text,
            startIndex=item.start_index, endIndex=item.end_index,
            explanation=item.explanation, sourceRuleOrTerm=item.source_rule_or_term,
            sourceReference=item.source_reference, detectionMethod=item.detection_method,
            confidence=item.confidence, evidenceRecordType=item.evidence_record_type,
            evidenceRecordId=item.evidence_record_id, evidenceQuote=item.evidence_quote,
            analysisRunId=item.analysis_run_id,
            findingDecision=item.finding_decision,
            findingDecisionReviewer=item.finding_decision_reviewer,
            findingDecisionAt=item.finding_decision_at,
            findingDecisionNote=item.finding_decision_note,
            suggestion=SuggestionModel(id=suggestion.id, suggestedText=suggestion.suggested_text,
                rationale=suggestion.rationale, authorIntentPreserved=suggestion.author_intent_preserved,
                status=suggestion.status, customEditedText=suggestion.custom_edited_text,
                appliedStart=getattr(suggestion, 'applied_start', None),
                appliedEnd=getattr(suggestion, 'applied_end', None),
                replacedText=getattr(suggestion, 'replaced_text', None))
            if suggestion else None))
    created = row.created_at.isoformat() + ("Z" if row.created_at.tzinfo is None else "")
    updated = row.updated_at.isoformat() + ("Z" if row.updated_at.tzinfo is None else "")
    return ReviewDocumentModel(
        id=row.id, title=row.title, contentType=row.content_type,
        originalContent=row.original_content, currentContent=row.current_content,
        status=row.status, reviewer=row.reviewer, createdAt=created, updatedAt=updated,
        findings=findings, decisionStatus=row.decision_status,
        decisionNotes=row.decision_notes, decidedAt=row.decided_at,
        aiAnalysisStatus=row.ai_analysis_status or 'legacy_unknown',
        aiAnalysisMessage=row.ai_analysis_message,
        deterministicAnalysisStatus=row.deterministic_analysis_status or 'legacy_unknown',
        deterministicAnalysisMessage=row.deterministic_analysis_message,
        lastAnalysisRunId=row.last_analysis_run_id,
        summary=ReviewSummaryModel(**(row.summary or {})))


def add_review(session, document):
    from datetime import datetime
    row = DBReviewDocument(
        id=document.id, title=document.title, content_type=document.contentType,
        original_content=document.originalContent, current_content=document.currentContent,
        status=document.status, reviewer=document.reviewer,
        decision_status=document.decisionStatus, decision_notes=document.decisionNotes,
        ai_analysis_status=document.aiAnalysisStatus,
        ai_analysis_message=document.aiAnalysisMessage,
        deterministic_analysis_status=document.deterministicAnalysisStatus,
        deterministic_analysis_message=document.deterministicAnalysisMessage,
        decided_at=document.decidedAt, summary=document.summary.model_dump(),
        created_at=datetime.fromisoformat(document.createdAt.replace("Z", "+00:00")).replace(tzinfo=None),
        updated_at=datetime.fromisoformat(document.updatedAt.replace("Z", "+00:00")).replace(tzinfo=None))
    for position, finding in enumerate(document.findings):
        finding_row = DBReviewFinding(
            lifecycle_status=finding.lifecycleStatus or "active",
            id=finding.id, review_id=document.id, position=position,
            title=finding.title, category=finding.category, severity=finding.severity,
            exact_text=finding.exactText, start_index=finding.startIndex, end_index=finding.endIndex,
            explanation=finding.explanation, source_rule_or_term=finding.sourceRuleOrTerm,
            source_reference=finding.sourceReference, detection_method=finding.detectionMethod,
            confidence=finding.confidence, evidence_record_type=finding.evidenceRecordType,
            evidence_record_id=finding.evidenceRecordId, evidence_quote=finding.evidenceQuote,
            analysis_run_id=finding.analysisRunId, finding_decision=finding.findingDecision,
            finding_decision_reviewer=finding.findingDecisionReviewer,
            finding_decision_at=finding.findingDecisionAt,
            finding_decision_note=finding.findingDecisionNote)
        if finding.suggestion:
            finding_row.suggestion = DBReviewSuggestion(
                id=finding.suggestion.id, suggested_text=finding.suggestion.suggestedText,
                rationale=finding.suggestion.rationale,
                author_intent_preserved=finding.suggestion.authorIntentPreserved,
                status=finding.suggestion.status,
                custom_edited_text=finding.suggestion.customEditedText,
                applied_start=finding.suggestion.appliedStart,
                applied_end=finding.suggestion.appliedEnd,
                replaced_text=finding.suggestion.replacedText)
        row.findings.append(finding_row)
    session.add(row)
    return row
