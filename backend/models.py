from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime

FindingCategory = Literal[
    'exact_violation',
    'direct_contradiction',
    'contextual_inconsistency',
    'unsupported_claim',
    'potential_issue'
]

FindingSeverity = Literal[
    'critical',
    'high',
    'medium',
    'low',
    'informational'
]

ContentType = Literal[
    'social_media',
    'website_copy',
    'marketing_email',
    'advertisement',
    'product_announcement',
    'general_communication'
]

SuggestionStatus = Literal['pending', 'accepted', 'edited', 'rejected']
ReviewStatus = Literal['pending_review', 'in_review', 'completed', 'archived']
DecisionStatus = Literal['pending', 'partially_approved', 'approved_with_changes', 'approved_as_is', 'rejected']
AIAnalysisStatus = Literal['completed', 'partial', 'not_configured', 'failed', 'timeout', 'service_failure', 'evidence_validation_failure', 'legacy_unknown']
DeterministicAnalysisStatus = Literal['completed', 'failed', 'legacy_unknown']

class SuggestionModel(BaseModel):
    id: str
    suggestedText: str
    rationale: str
    authorIntentPreserved: str
    status: SuggestionStatus = 'pending'
    customEditedText: Optional[str] = None
    appliedStart: Optional[int] = None
    appliedEnd: Optional[int] = None
    replacedText: Optional[str] = None

class ReviewFindingModel(BaseModel):
    id: str
    reviewId: str
    title: str
    category: FindingCategory
    severity: FindingSeverity
    exactText: str
    startIndex: Optional[int] = None
    endIndex: Optional[int] = None
    explanation: str
    sourceRuleOrTerm: str
    sourceReference: str
    detectionMethod: Literal['deterministic_rule', 'gemini_contextual', 'fact_check']
    confidence: Literal['high', 'medium', 'low']
    lifecycleStatus: Optional[Literal['active', 'resolved']] = None
    suggestion: Optional[SuggestionModel] = None
    evidenceRecordType: Optional[Literal['guideline', 'terminology', 'fact', 'knowledge_source']] = None
    evidenceRecordId: Optional[str] = None
    evidenceQuote: Optional[str] = None
    evidenceStatus: Optional[Literal['supported', 'partially_supported', 'unsupported', 'conflicting', 'not_assessed']] = None
    sourceDocumentId: Optional[str] = None
    sourcePageNumber: Optional[int] = None
    sourceSectionLabel: Optional[str] = None
    sourceExcerpt: Optional[str] = None
    analysisRunId: Optional[str] = None
    findingDecision: Optional[Literal['accepted', 'dismissed', 'verification_required']] = None
    findingDecisionReviewer: Optional[str] = None
    findingDecisionAt: Optional[str] = None
    findingDecisionNote: Optional[str] = None

class ReviewSummaryModel(BaseModel):
    totalFindings: int = 0
    exactViolations: int = 0
    directContradictions: int = 0
    contextualInconsistencies: int = 0
    unsupportedClaims: int = 0
    potentialIssues: int = 0
    acceptedSuggestions: int = 0
    rejectedSuggestions: int = 0
    editedSuggestions: int = 0
    unresolvedFindings: int = 0

class ReviewDocumentCreate(BaseModel):
    title: str
    contentType: ContentType = 'general_communication'
    content: str
    reviewer: Optional[str] = 'Human Brand Reviewer'

class ReviewDocumentModel(BaseModel):
    id: str
    title: str
    contentType: ContentType
    originalContent: str
    currentContent: str
    status: ReviewStatus = 'in_review'
    reviewer: str
    createdAt: str
    updatedAt: str
    findings: List[ReviewFindingModel] = Field(default_factory=list)
    decisionStatus: DecisionStatus = 'pending'
    decisionNotes: Optional[str] = None
    decidedAt: Optional[str] = None
    summary: ReviewSummaryModel = Field(default_factory=ReviewSummaryModel)
    aiAnalysisStatus: AIAnalysisStatus = 'legacy_unknown'
    aiAnalysisMessage: Optional[str] = None
    deterministicAnalysisStatus: DeterministicAnalysisStatus = 'legacy_unknown'
    deterministicAnalysisMessage: Optional[str] = None
    lastAnalysisRunId: Optional[str] = None


class AnalysisRerunRequest(BaseModel):
    reviewer: Optional[str] = None


class FindingDecisionRequest(BaseModel):
    decision: Literal['accepted', 'dismissed', 'verification_required']
    note: Optional[str] = Field(default=None, max_length=2000)
    reviewer: Optional[str] = None

class BrandGuidelineModel(BaseModel):
    id: str
    title: str
    category: str
    description: str
    severity: FindingSeverity
    sourceReference: str
    status: Literal['active', 'under_review', 'archived'] = 'active'
    lastUpdated: str
    examples: Optional[dict] = None
    sourceDocumentId: Optional[str] = None
    sourcePageNumber: Optional[int] = None
    sourceSectionLabel: Optional[str] = None
    sourceExcerpt: Optional[str] = None


class TerminologyEntryModel(BaseModel):
    id: str
    preferredTerm: str
    restrictedTerm: str
    explanation: str
    approvedAlternative: str
    category: str
    priority: Literal['critical', 'high', 'medium', 'low'] = 'medium'
    status: Literal['active', 'deprecated'] = 'active'
    createdAt: str

class ApprovedFactModel(BaseModel):
    id: str
    title: str
    statement: str
    category: str
    source: str
    verificationStatus: Literal['verified', 'provisional', 'needs_revalidation', 'approved', 'pending_review', 'under_review', 'rejected'] = 'verified'
    lastUpdated: str
    sourceDocumentId: Optional[str] = None
    sourcePageNumber: Optional[int] = None
    sourceSectionLabel: Optional[str] = None
    sourceExcerpt: Optional[str] = None


class KnowledgeSourceModel(BaseModel):
    id: str
    title: str
    type: Literal['document', 'manual_entry', 'factsheet']
    description: str
    version: str = '1.0'
    effectiveDate: str = Field(default_factory=lambda: datetime.utcnow().date().isoformat())
    ruleCount: int = 0
    url: Optional[str] = None
    status: Literal['active', 'under_review', 'archived'] = 'active'

class EvidenceCandidateModel(BaseModel):
    id: str
    documentId: str
    candidateType: Literal["fact", "guideline"]
    title: str
    excerpt: str
    pageNumber: Optional[int] = None
    sectionLabel: Optional[str] = None
    confidence: Literal["low", "medium"]
    status: Literal["pending", "approved", "rejected"] = "pending"
    approvedRecordType: Optional[str] = None
    approvedRecordId: Optional[str] = None
    reviewedBy: Optional[str] = None
    reviewedAt: Optional[str] = None


class IngestedDocumentModel(BaseModel):
    id: str
    filename: str
    mimeType: str
    sizeBytes: int
    sha256: str
    extractionStatus: Literal["extracted", "extraction_failed"]
    uploadedBy: str
    uploadedAt: str
    pageCount: int
    candidateCount: int
    pendingCandidateCount: int
    candidates: List[EvidenceCandidateModel] = Field(default_factory=list)


class IngestedDocumentDetailModel(IngestedDocumentModel):
    pages: List[dict] = Field(default_factory=list)


class EvidenceCandidateDecisionRequest(BaseModel):
    decision: Literal["approve", "reject"]
    recordType: Optional[Literal["fact", "guideline"]] = None
    title: Optional[str] = Field(default=None, max_length=180)
    approvedText: Optional[str] = Field(default=None, max_length=5000)
    category: Optional[str] = None
    severity: Optional[FindingSeverity] = "medium"
    reviewer: Optional[str] = None


class ReviewWorkflowStageCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    assignedReviewer: str = Field(min_length=2, max_length=160)
    reviewer: Optional[str] = None


class ReviewContentUpdateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=200000)
    reviewer: str = Field(min_length=2, max_length=160)


class ReviewWorkflowStageDecisionRequest(BaseModel):
    decision: Literal['approved', 'returned', 'rejected', 'resubmitted']
    note: Optional[str] = Field(default=None, max_length=2000)
    reviewer: Optional[str] = None


class ReviewWorkflowStageModel(BaseModel):
    id: str
    reviewId: str
    order: int
    name: str
    assignedReviewer: str
    status: Literal['pending', 'in_review', 'approved', 'returned', 'rejected']
    decisionNote: Optional[str] = None
    createdBy: str
    createdAt: str
    updatedAt: str
    completedAt: Optional[str] = None


class DecisionUpdateRequest(BaseModel):
    findingId: Optional[str] = None
    suggestionAction: Optional[Literal['accept', 'reject', 'edit', 'reset']] = None
    customText: Optional[str] = None
    occurrenceIndex: Optional[int] = None
    targetIndex: Optional[int] = None
    completeDecision: Optional[DecisionStatus] = None
    decisionNotes: Optional[str] = None
    reviewer: Optional[str] = None
