from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime

FindingCategory = Literal[
    'exact_violation',
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
DecisionStatus = Literal['pending', 'approved_with_changes', 'approved_as_is', 'rejected']

class SuggestionModel(BaseModel):
    id: str
    suggestedText: str
    rationale: str
    authorIntentPreserved: str
    status: SuggestionStatus = 'pending'
    customEditedText: Optional[str] = None

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
    suggestion: Optional[SuggestionModel] = None

class ReviewSummaryModel(BaseModel):
    totalFindings: int = 0
    exactViolations: int = 0
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
    findings: List[ReviewFindingModel] = []
    decisionStatus: DecisionStatus = 'pending'
    decisionNotes: Optional[str] = None
    decidedAt: Optional[str] = None
    summary: ReviewSummaryModel = Field(default_factory=ReviewSummaryModel)

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

class TerminologyEntryModel(BaseModel):
    id: str
    preferredTerm: str
    restrictedTerm: str
    explanation: str
    approvedAlternative: str
    category: str
    status: Literal['active', 'deprecated'] = 'active'
    createdAt: str

class ApprovedFactModel(BaseModel):
    id: str
    title: str
    statement: str
    category: str
    source: str
    verificationStatus: Literal['verified', 'provisional', 'needs_revalidation'] = 'verified'
    lastUpdated: str

class DecisionUpdateRequest(BaseModel):
    findingId: Optional[str] = None
    suggestionAction: Optional[Literal['accept', 'reject', 'edit', 'reset']] = None
    customText: Optional[str] = None
    completeDecision: Optional[DecisionStatus] = None
    decisionNotes: Optional[str] = None
    reviewer: Optional[str] = None
