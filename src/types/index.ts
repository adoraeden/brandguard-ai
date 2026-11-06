export type FindingCategory = 
  | 'exact_violation' 
  | 'contextual_inconsistency' 
  | 'unsupported_claim' 
  | 'potential_issue';

export type FindingSeverity = 
  | 'critical' 
  | 'high' 
  | 'medium' 
  | 'low' 
  | 'informational';

export type ContentType = 
  | 'social_media' 
  | 'website_copy' 
  | 'marketing_email' 
  | 'advertisement' 
  | 'product_announcement' 
  | 'general_communication';

export type SuggestionStatus = 'pending' | 'accepted' | 'edited' | 'rejected';

export type ReviewStatus = 'pending_review' | 'in_review' | 'completed' | 'archived';

export type DecisionStatus = 'pending' | 'approved_with_changes' | 'approved_as_is' | 'rejected';

export type UserRole = 'admin' | 'reviewer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatarInitials: string;
  department: string;
}

export interface Suggestion {
  id: string;
  suggestedText: string;
  rationale: string;
  authorIntentPreserved: string;
  status: SuggestionStatus;
  customEditedText?: string;
}

export interface ReviewFinding {
  id: string;
  reviewId: string;
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
  exactText: string;
  startIndex?: number;
  endIndex?: number;
  explanation: string;
  sourceRuleOrTerm: string;
  sourceReference: string;
  detectionMethod: 'deterministic_rule' | 'gemini_contextual' | 'fact_check';
  confidence: 'high' | 'medium' | 'low';
  suggestion?: Suggestion;
}

export interface ReviewDocument {
  id: string;
  title: string;
  contentType: ContentType;
  originalContent: string;
  currentContent: string;
  status: ReviewStatus;
  reviewer: string;
  createdAt: string;
  updatedAt: string;
  findings: ReviewFinding[];
  decisionStatus: DecisionStatus;
  decisionNotes?: string;
  decidedAt?: string;
  summary: {
    totalFindings: number;
    exactViolations: number;
    contextualInconsistencies: number;
    unsupportedClaims: number;
    potentialIssues: number;
    acceptedSuggestions: number;
    rejectedSuggestions: number;
    editedSuggestions: number;
    unresolvedFindings: number;
  };
}

export interface BrandGuideline {
  id: string;
  title: string;
  category: 'tone_of_voice' | 'messaging_principles' | 'product_positioning' | 'restricted_language' | 'writing_standards';
  description: string;
  severity: FindingSeverity;
  sourceReference: string;
  status: 'active' | 'under_review' | 'archived';
  lastUpdated: string;
  examples?: {
    approved: string;
    prohibited: string;
  };
}

export interface TerminologyEntry {
  id: string;
  preferredTerm: string;
  restrictedTerm: string;
  explanation: string;
  approvedAlternative: string;
  category: 'product_naming' | 'capability_claim' | 'architecture' | 'legal_compliance' | 'security';
  status: 'active' | 'deprecated';
  matchCaseSensitive?: boolean;
  createdAt: string;
}

export interface ApprovedFact {
  id: string;
  title: string;
  statement: string;
  category: 'compliance_security' | 'product_specs' | 'company_history' | 'pricing_licensing' | 'uptime_performance';
  source: string;
  verificationStatus: 'verified' | 'provisional' | 'needs_revalidation';
  lastUpdated: string;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  type: 'document' | 'manual_entry' | 'factsheet';
  description: string;
  version: string;
  effectiveDate: string;
  ruleCount: number;
}

export interface GovernanceInsights {
  topViolatedTerms: { term: string; count: number; category: string }[];
  findingsByCategory: { category: string; count: number; percentage: number }[];
  severityDistribution: { severity: FindingSeverity; count: number }[];
  unresolvedTrends: { month: string; rate: number }[];
  clarificationRecommendations: string[];
}
