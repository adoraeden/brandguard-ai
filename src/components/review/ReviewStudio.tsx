import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileSearch, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  RotateCcw, 
  AlertTriangle, 
  Check, 
  ShieldAlert, 
  HelpCircle, 
  Sparkles, 
  SplitSquareVertical, 
  Plus, 
  Filter, 
  UserCheck, 
  Pin, 
  Link2, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Cpu, 
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ClipboardList,
  Calendar,
  Lock,
  Eye,
  FileCheck2,
  Loader2
} from 'lucide-react';
import { 
  ReviewDocument, 
  ReviewFinding, 
  ContentType, 
  FindingCategory, 
  FindingSeverity,
  ReviewWorkflowStage
} from '../../types';
import { SAMPLE_DOCUMENTS } from '../../data/mockData';
import { api } from '../../services/apiClient';
import { useDemoProfile } from '../../context/DemoProfileContext';

interface ReviewStudioProps {
  activeReview: ReviewDocument | null;
  onReviewCreated: (doc: ReviewDocument) => void;
  onDecisionUpdated: (doc: ReviewDocument) => void;
  initialDraftToLoad?: typeof SAMPLE_DOCUMENTS[0] | null;
  onNavigateToLedger?: () => void;
  onNavigateToPending?: () => void;
  onNavigateHome?: () => void;
}

type AnalysisTone = 'success' | 'warning' | 'error' | 'neutral';

interface AnalysisStatusView {
  tone: AnalysisTone;
  badge: string;
  headline: string;
  message: string;
}

const ANALYSIS_PANEL_TONE_STYLES: Record<AnalysisTone, string> = {
  success: 'border-emerald-200 bg-emerald-50',
  warning: 'border-amber-200 bg-amber-50',
  error: 'border-rose-200 bg-rose-50',
  neutral: 'border-slate-200 bg-slate-50',
};

const ANALYSIS_BADGE_TONE_STYLES: Record<AnalysisTone, string> = {
  success: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  warning: 'border-amber-300 bg-amber-100 text-amber-900',
  error: 'border-rose-300 bg-rose-100 text-rose-900',
  neutral: 'border-slate-300 bg-slate-100 text-slate-700',
};

const ANALYSIS_ICON_TONE_STYLES: Record<AnalysisTone, string> = {
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  error: 'text-rose-700',
  neutral: 'text-slate-500',
};

const ANALYSIS_TONE_PRIORITY: Record<AnalysisTone, number> = {
  success: 0,
  neutral: 1,
  warning: 2,
  error: 3,
};

const getHighestAnalysisTone = (...tones: AnalysisTone[]): AnalysisTone =>
  tones.reduce((highest, tone) =>
    ANALYSIS_TONE_PRIORITY[tone] > ANALYSIS_TONE_PRIORITY[highest] ? tone : highest
  , 'success');

const isInsufficientEvidenceFinding = (finding: ReviewFinding) =>
  finding.sourceRuleOrTerm === 'Insufficient Evidence' ||
  (finding.category === 'unsupported_claim' &&
    !finding.evidenceRecordType &&
    !finding.evidenceRecordId &&
    /no directly relevant approved source/i.test(finding.sourceReference));

const getWordingPresentation = (finding: ReviewFinding) => {
  const isTerminology =
    finding.evidenceRecordType === 'terminology' ||
    finding.sourceRuleOrTerm.startsWith('Terminology:') ||
    /restricted (term|product name)/i.test(finding.title);
  const isEvidenceGap = isInsufficientEvidenceFinding(finding);
  const hasGroundedReplacement =
    Boolean(finding.suggestion?.suggestedText) &&
    finding.category === 'exact_violation' &&
    !isEvidenceGap;

  return {
    isEvidenceGap,
    hasGroundedReplacement,
    restrictedLabel: isTerminology
      ? 'Restricted term'
      : finding.category === 'exact_violation'
      ? 'Restricted wording'
      : 'Flagged wording',
    replacementLabel: isTerminology
      ? 'Approved replacement'
      : finding.detectionMethod === 'deterministic_rule'
      ? 'Approved wording'
      : 'Grounded replacement',
    replacementHint: isTerminology
      ? 'Exact catalog-approved wording'
      : finding.detectionMethod === 'deterministic_rule'
      ? 'Approved guideline wording'
      : 'Replacement grounded in approved evidence',
  };
};

const getRecommendedAction = (finding: ReviewFinding) => {
  if (isInsufficientEvidenceFinding(finding)) {
    return 'Obtain the appropriate approved documentation before publishing, or revise or remove the unverified claim.';
  }

  switch (finding.category) {
    case 'exact_violation':
      return finding.suggestion?.suggestedText
        ? 'Use the replacement wording shown below, or revise the wording to comply with the cited standard.'
        : 'Revise the flagged wording to comply with the cited standard.';
    case 'direct_contradiction':
      return 'Correct or remove the claim, or replace it with wording directly supported by the cited approved evidence.';
    case 'contextual_inconsistency':
      return 'Revise the wording so it is consistent with the cited approved guidance.';
    case 'unsupported_claim':
      return 'Revise the claim so it is directly supported by approved evidence, or remove the unsupported claim.';
    case 'potential_issue':
      return 'Review the wording and revise it to address the cited concern without overstating the claim.';
    default:
      return 'Review the finding and revise the wording as appropriate.';
  }
};

const getDeterministicStatusView = (review: ReviewDocument): AnalysisStatusView => {
  switch (review.deterministicAnalysisStatus) {
    case 'completed':
      return {
        tone: 'success',
        badge: 'Completed',
        headline: 'Deterministic checks completed.',
        message: 'Rule, terminology, and factsheet checks completed.',
      };
    case 'failed':
      return {
        tone: 'error',
        badge: 'Failed',
        headline: 'Deterministic checks failed.',
        message: 'Rule, terminology, and factsheet checks could not be completed. AI contextual review was still attempted when configured.',
      };
    default:
      return {
        tone: 'neutral',
        badge: 'Status unavailable',
        headline: 'Deterministic status unavailable.',
        message: 'This earlier review does not include a separate deterministic status history.',
      };
  }
};

const getAiStatusView = (review: ReviewDocument): AnalysisStatusView => {
  const aiFindings = review.findings.filter(
    finding => finding.detectionMethod === 'gemini_contextual' && finding.lifecycleStatus !== 'resolved'
  );
  const evidenceGapCount = aiFindings.filter(isInsufficientEvidenceFinding).length;

  switch (review.aiAnalysisStatus) {
    case 'completed':
      if (evidenceGapCount > 0) {
        return {
          tone: 'warning',
          badge: 'Completed with evidence gaps',
          headline: 'AI contextual review completed.',
          message: `AI review found ${evidenceGapCount} claim${evidenceGapCount === 1 ? '' : 's'} that could not be verified using the available approved evidence. Review the evidence-gap guidance before publication.`,
        };
      }
      return {
        tone: 'success',
        badge: 'Completed',
        headline: 'AI contextual review completed.',
        message: aiFindings.length > 0
          ? `${aiFindings.length} AI finding${aiFindings.length === 1 ? '' : 's'} passed evidence validation.`
          : 'No additional AI findings were returned.',
      };
    case 'partial':
      return {
        tone: 'warning',
        badge: 'Partially completed',
        headline: 'AI contextual review partially completed.',
        message: 'Validated AI findings are available, but some potential findings were withheld because their supporting evidence could not be validated.',
      };
    case 'evidence_validation_failure':
      return {
        tone: 'warning',
        badge: 'Evidence validation failed',
        headline: 'No AI findings passed evidence validation.',
        message: 'Potential AI findings were withheld rather than presented as validated findings. Deterministic checks remain available.',
      };
    case 'failed':
      return {
        tone: 'error',
        badge: 'Failed',
        headline: 'AI contextual review could not be completed.',
        message: 'Deterministic checks remain available. Review the technical details and retry when appropriate.',
      };
    case 'timeout':
      return {
        tone: 'error',
        badge: 'Timed out',
        headline: 'AI contextual review timed out.',
        message: 'Deterministic checks remain available. Retry later or review the technical details.',
      };
    case 'service_failure':
      return {
        tone: 'error',
        badge: 'Service unavailable',
        headline: 'AI contextual review is temporarily unavailable.',
        message: 'Deterministic checks remain available. Retry later or review the technical details.',
      };
    case 'not_configured':
      return {
        tone: 'warning',
        badge: 'Not configured',
        headline: 'AI contextual review is not configured.',
        message: 'Deterministic checks remain available. Configure the AI service to enable contextual review.',
      };
    default:
      return {
        tone: 'neutral',
        badge: 'Status unavailable',
        headline: 'AI contextual review status unavailable.',
        message: 'This earlier review does not include AI analysis status history. Existing findings and audit records remain available.',
      };
  }
};

export const ReviewStudio: React.FC<ReviewStudioProps> = ({
  activeReview,
  onReviewCreated,
  onDecisionUpdated,
  initialDraftToLoad,
  onNavigateToLedger,
  onNavigateToPending,
  onNavigateHome,
}) => {
  const { currentUser } = useDemoProfile();

  // View Mode: 'submission' (State A) | 'results' (State B)
  const [viewMode, setViewMode] = useState<'submission' | 'results'>(
    activeReview ? 'results' : 'submission'
  );

  // Dedicated Completion View State (Item 1)
  const [completionRecord, setCompletionRecord] = useState<{
    verdict: 'approved_with_changes' | 'approved_as_is' | 'rejected';
    document: ReviewDocument;
  } | null>(null);
  const [checkpointRecord, setCheckpointRecord] = useState<{
    decision: 'approved_as_is' | 'rejected';
    unresolvedCount: number;
    document: ReviewDocument;
  } | null>(null);

  // Form State (State A)
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<ContentType>('product_announcement');
  const [content, setContent] = useState('');
  const [reviewer, setReviewer] = useState(currentUser.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [findingDecisionNotes, setFindingDecisionNotes] = useState<Record<string, string>>({});
  const submissionInFlight = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Review Results State (State B)
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [documentPanePercent, setDocumentPanePercent] = useState(52);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const resizingWorkspace = useRef(false);
  const [analysisPanelHeight, setAnalysisPanelHeight] = useState(122);
  const [analysisPanelCollapsed, setAnalysisPanelCollapsed] = useState(true);
  const analysisPanelRef = useRef<HTMLDivElement | null>(null);
  const resizingAnalysisPanel = useRef(false);
  const [showOriginalDiff, setShowOriginalDiff] = useState(false);
  
  // Custom edit state for finding suggestion
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [customEditText, setCustomEditText] = useState('');
  const [selectedOccurrences, setSelectedOccurrences] = useState<Record<string, number>>({});

  const [workflowPanelCollapsed, setWorkflowPanelCollapsed] = useState(true);
  const [workflowStages, setWorkflowStages] = useState<ReviewWorkflowStage[]>([]);
  const [workflowStageName, setWorkflowStageName] = useState('');
  const [workflowAssignee, setWorkflowAssignee] = useState('');
  const [workflowNote, setWorkflowNote] = useState('');
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);

  // Human Final Decision State
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);
  const [isRerunningAnalysis, setIsRerunningAnalysis] = useState(false);
  const [rerunFeedback, setRerunFeedback] = useState<{
    kind: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const rerunInFlight = useRef(false);

  // DOM Refs for bidirectional synchronisation
  const findingCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const documentPinRefs = useRef<{ [key: string]: HTMLSpanElement | null }>({});
  const pinPreviewRef = useRef<HTMLDivElement | null>(null);
  const [pinPreview, setPinPreview] = useState<{
    finding: ReviewFinding;
    pinNumber: number;
    left: number;
    top: number;
    placement: 'above' | 'below';
  } | null>(null);

  useEffect(() => {
    if (!pinPreview) return;

    const dismiss = () => setPinPreview(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };

    window.addEventListener('wheel', dismiss, { passive: true });
    window.addEventListener('touchmove', dismiss, { passive: true });
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', dismiss);
      window.removeEventListener('touchmove', dismiss);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pinPreview]);

  useLayoutEffect(() => {
    const preview = pinPreviewRef.current;
    if (!pinPreview || !preview) return;

    const padding = 16;
    const rect = preview.getBoundingClientRect();
    let nextTop = pinPreview.top;

    if (rect.bottom > window.innerHeight - padding) {
      nextTop = pinPreview.placement === 'above'
        ? Math.max(padding + rect.height, pinPreview.top)
        : Math.max(padding, window.innerHeight - rect.height - padding);
    }
    if (rect.top < padding) {
      nextTop = pinPreview.placement === 'above'
        ? Math.min(window.innerHeight - padding, pinPreview.top + (padding - rect.top))
        : padding;
    }

    if (Math.abs(nextTop - pinPreview.top) > 1) {
      setPinPreview(current => current ? { ...current, top: nextTop } : current);
    }
  }, [pinPreview]);

  // Sync reviewer with active profile
  useEffect(() => {
    if (currentUser?.name) {
      setReviewer(currentUser.name);
    }
  }, [currentUser]);

  // Synchronise when activeReview changes
  useEffect(() => {
    if (activeReview) {
      setViewMode('results');
      if (activeReview.findings.length > 0) {
        setSelectedFindingId(activeReview.findings[0].id);
      }
      setValidationError(null);
    }
  }, [activeReview?.id]);

  useEffect(() => {
    if (!activeReview?.id) { setWorkflowStages([]); return; }
    let cancelled = false;
    api.getReviewWorkflow(activeReview.id)
      .then(stages => { if (!cancelled) { setWorkflowStages(stages); setWorkflowError(null); } })
      .catch(error => { if (!cancelled) setWorkflowError(error?.message || 'Could not load the staged review workflow.'); });
    return () => { cancelled = true; };
  }, [activeReview?.id]);

  const handleAddWorkflowStage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeReview || !workflowStageName.trim() || !workflowAssignee.trim()) return;
    setWorkflowBusy(true); setWorkflowError(null);
    try {
      const created = await api.addReviewWorkflowStage(activeReview.id, {
        name: workflowStageName.trim(), assignedReviewer: workflowAssignee.trim(), reviewer: currentUser.name,
      });
      setWorkflowStages(previous => [...previous, created]);
      setWorkflowStageName(''); setWorkflowAssignee('');
    } catch (error: any) {
      setWorkflowError(error?.message || 'Could not assign this review stage.');
    } finally { setWorkflowBusy(false); }
  };

  const handleWorkflowDecision = async (stage: ReviewWorkflowStage, decision: 'approved' | 'returned' | 'rejected') => {
    if (!activeReview) return;
    setWorkflowBusy(true); setWorkflowError(null);
    try {
      const updated = await api.decideReviewWorkflowStage(activeReview.id, stage.id, {
        decision, note: workflowNote.trim() || undefined, reviewer: currentUser.name,
      });
      setWorkflowStages(updated); setWorkflowNote('');
    } catch (error: any) {
      setWorkflowError(error?.message || 'Could not save the stage decision.');
    } finally { setWorkflowBusy(false); }
  };

  // Load sample draft when provided, unless an existing review is active.
  useEffect(() => {
    if (initialDraftToLoad && !activeReview) {
      setTitle(initialDraftToLoad.title);
      setContentType(initialDraftToLoad.contentType);
      setContent(initialDraftToLoad.draft);
      setViewMode('submission');
      setCompletionRecord(null);
    }
  }, [initialDraftToLoad, activeReview]);

  const handleQuickLoadDraft = (sample: typeof SAMPLE_DOCUMENTS[0]) => {
    setTitle(sample.title);
    setContentType(sample.contentType);
    setContent(sample.draft);
    setSubmitError(null);
  };

  const handleSubmitDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionInFlight.current) return;
    if (!title.trim() || !content.trim()) {
      setSubmitError('Please provide both a document title and the draft text.');
      return;
    }

    submissionInFlight.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setCompletionRecord(null);

    try {
      const newReview = await api.submitReview({
        title,
        contentType,
        content,
        reviewer: reviewer || currentUser.name,
      });
      onReviewCreated(newReview);
      setViewMode('results');
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setSubmitError(
        err?.message === 'Failed to fetch' || err?.message === 'Load failed'
          ? 'Unable to reach the review service. Check the FastAPI connection and try again.'
          : err?.message || 'Error executing review analysis. Please try again.'
      );
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  
  const handleSuggestionAction = async (
    findingId: string,
    action: 'accept' | 'reject' | 'edit' | 'reset',
    customText?: string,
    occurrenceIndex?: number
  ) => {
    if (!activeReview) return;
    setValidationError(null);
    setDecisionFeedback(null);

    try {
      const updated = await api.recordDecision(activeReview.id, {
        findingId,
        suggestionAction: action,
        customText,
        occurrenceIndex,
      });

      onDecisionUpdated(updated);
      setEditingFindingId(null);
      setValidationError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update suggestion.';
      setValidationError(message);
      console.error('Failed to update suggestion:', err);
    }
  };


  const setNoteForFinding = (findingId: string, note: string) => {
    setFindingDecisionNotes(prev => ({ ...prev, [findingId]: note }));
  };

  const handleFindingDecision = async (findingId: string, decision: 'accepted' | 'dismissed' | 'verification_required') => {
    if (!activeReview) return;
    setValidationError(null);
    setDecisionFeedback(null);
    try {
      const note = findingDecisionNotes[findingId]?.trim() || undefined;
      const updated = await api.decideFinding(activeReview.id, findingId, decision, note, currentUser.name);
      onDecisionUpdated(updated);
      setFindingDecisionNotes(prev => {
        const next = { ...prev };
        delete next[findingId];
        return next;
      });
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save finding decision.');
    }
  };

  const handleFinalDecision = async (decision: 'approved_as_is' | 'rejected') => {
    if (!activeReview) return;

    const unresolvedCount = activeReview.summary.unresolvedFindings;
    const isCheckpoint = unresolvedCount > 0;

    setIsCompleting(true);
    setValidationError(null);
    setDecisionFeedback(null);

    try {
      const updated = await api.recordDecision(activeReview.id, {
        completeDecision: decision,
        decisionNotes,
        reviewer: currentUser.name || reviewer,
      });
      onDecisionUpdated(updated);

      if (isCheckpoint) {
        setCompletionRecord(null);
        setViewMode('results');
        setDecisionNotes('');
        setDecisionFeedback(null);
        setCheckpointRecord({ decision, unresolvedCount, document: updated });
        return;
      }

      setCompletionRecord({ verdict: decision, document: updated });
    } catch (err: any) {
      console.error('Failed to complete review:', err);
      const message = err instanceof Error ? err.message : '';
      setValidationError(message || 'Failed to persist review decision.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleRerunAnalysis = async () => {
    if (!activeReview || rerunInFlight.current) return;
    rerunInFlight.current = true;
    setIsRerunningAnalysis(true);
    setRerunFeedback(null);
    try {
      const updated = await api.rerunReviewAnalysis(
        activeReview.id,
        currentUser.name,
      );
      const newFindings = updated.findings.filter(
        finding => finding.analysisRunId === updated.lastAnalysisRunId,
      );
      onDecisionUpdated(updated);
      if (newFindings.length) setSelectedFindingId(newFindings[0].id);
      const deterministicFailed = updated.deterministicAnalysisStatus === 'failed';
      const geminiFailed = ['failed', 'timeout', 'service_failure', 'evidence_validation_failure'].includes(updated.aiAnalysisStatus || '');
      if (deterministicFailed && geminiFailed) {
        setRerunFeedback({ kind: 'error', message: 'Both deterministic analysis and Gemini contextual analysis failed. No analysis result is available; check the service logs and retry.' });
      } else if (geminiFailed) {
        const deterministicOutcome = updated.deterministicAnalysisStatus === 'completed'
          ? 'Deterministic analysis completed'
          : 'Deterministic analysis status is unavailable';
        setRerunFeedback({ kind: 'error', message: `${deterministicOutcome}; Gemini did not produce a validated result. See the analysis status above for details, then retry if appropriate.` });
      } else if (deterministicFailed) {
        const geminiOutcome = updated.aiAnalysisStatus === 'completed'
          ? 'Gemini contextual analysis completed'
          : updated.aiAnalysisStatus === 'not_configured'
          ? 'Gemini contextual analysis was not configured'
          : 'Gemini contextual analysis status is unavailable';
        setRerunFeedback({ kind: 'error', message: `${geminiOutcome}, but deterministic analysis failed. ${updated.deterministicAnalysisMessage || 'Retry the analysis.'}` });
      } else if (updated.aiAnalysisStatus === 'not_configured') {
        setRerunFeedback({ kind: 'warning', message: 'Analysis status updated. Gemini configuration details are shown above.' });
      } else if (updated.aiAnalysisStatus === 'partial') {
        setRerunFeedback({ kind: 'warning', message: `Gemini completed with validated results; ${newFindings.length} finding(s) added. See the status above for withheld evidence details.` });
      } else if (updated.aiAnalysisStatus === 'completed') {
        setRerunFeedback({
          kind: 'success',
          message: updated.findings.length
            ? `Analysis completed with findings. ${newFindings.length} new finding(s) added; existing findings and decisions were preserved.`
            : 'Analysis completed with no findings. This is not a safety approval.',
        });
      } else {
        setRerunFeedback({ kind: 'warning', message: 'Analysis returned an unavailable status. Check the review status and retry.' });
      }
    } catch (error) {
      setRerunFeedback({ kind: 'error', message: error instanceof Error ? error.message : 'Could not rerun analysis. Please try again.' });
    } finally {
      rerunInFlight.current = false;
      setIsRerunningAnalysis(false);
    }
  };

  // Jump to first unresolved finding
  const handleJumpToFirstUnresolved = () => {
    if (!activeReview) return;
    const unresolved = activeReview.findings.find(f => {
      if (f.lifecycleStatus === 'resolved') return false;
      if (f.suggestion) return f.suggestion.status === 'pending';
      return !['accepted', 'dismissed'].includes(f.findingDecision || '');
    });
    if (unresolved) {
      setSelectedFindingId(unresolved.id);
      if (findingCardRefs.current[unresolved.id]) {
        findingCardRefs.current[unresolved.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (documentPinRefs.current[unresolved.id]) {
        documentPinRefs.current[unresolved.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const getCategoryMeta = (cat: FindingCategory) => {
    switch (cat) {
      case 'exact_violation':
        return {
          label: 'Exact Rule Violation',
          color: 'text-rose-700 bg-rose-50 border-rose-200',
          badge: 'DETERMINISTIC RULE',
          icon: XCircle,
          pinColor: 'bg-rose-500 text-white',
        };
      case 'contextual_inconsistency':
        return {
          label: 'Contextual Inconsistency',
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          badge: 'GEMINI CONTEXTUAL',
          icon: AlertTriangle,
          pinColor: 'bg-amber-500 text-white',
        };
      case 'direct_contradiction':
        return {
          label: 'Direct Evidence Contradiction',
          color: 'text-rose-800 bg-rose-50 border-rose-300',
          badge: 'VERIFIED EVIDENCE CONTRADICTION',
          icon: ShieldAlert,
          pinColor: 'bg-rose-700 text-white',
        };
      case 'unsupported_claim':
        return {
          label: 'Unsupported Claim',
          color: 'text-blue-700 bg-blue-50 border-blue-200',
          badge: 'FACTSHEET MISMATCH',
          icon: ShieldAlert,
          pinColor: 'bg-[#2457D6] text-white',
        };
      case 'potential_issue':
        return {
          label: 'Potential Issue',
          color: 'text-teal-700 bg-teal-50 border-teal-200',
          badge: 'UNCERTAIN INTERPRETATION',
          icon: HelpCircle,
          pinColor: 'bg-teal-600 text-white',
        };
      default:
        return {
          label: 'Governance Notice',
          color: 'text-slate-700 bg-slate-50 border-slate-200',
          badge: 'POLICY NOTICE',
          icon: HelpCircle,
          pinColor: 'bg-slate-500 text-white',
        };
    }
  };

  const getSeverityStyle = (sev: FindingSeverity) => {
    switch (sev) {
      case 'critical':
        return 'text-rose-700 bg-rose-50 border-rose-200 font-semibold';
      case 'high':
        return 'text-orange-800 bg-orange-50 border-orange-200 font-semibold';
      case 'medium':
        return 'text-amber-800 bg-amber-50 border-amber-200 font-medium';
      case 'low':
        return 'text-emerald-800 bg-emerald-50 border-emerald-200';
      case 'informational':
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const filteredFindings = (activeReview?.findings || []).filter(f => {
    if (filterCategory === 'all') return true;
    return f.category === filterCategory;
  });

  // Synchronised selection handlers
  const handleSelectFindingFromRight = (findingId: string) => {
    setSelectedFindingId(findingId);
    if (documentPinRefs.current[findingId]) {
      documentPinRefs.current[findingId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSelectFindingFromText = (findingId: string) => {
    setSelectedFindingId(findingId);
    if (findingCardRefs.current[findingId]) {
      findingCardRefs.current[findingId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const showPinPreview = (
    finding: ReviewFinding,
    pinNumber: number,
    target: HTMLElement | null
  ) => {
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const width = 320;
    const left = Math.min(
      Math.max(16, rect.left),
      Math.max(16, window.innerWidth - width - 16)
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceBelow >= 300 || spaceBelow >= rect.top ? 'below' : 'above';

    setPinPreview({
      finding,
      pinNumber,
      left,
      top: placement === 'below' ? rect.bottom + 10 : rect.top - 10,
      placement,
    });
  };

  // Render text with interactive inline highlight pins
  const renderHighlightedDocument = () => {
    if (!activeReview) return null;

    const textToRender = showOriginalDiff ? activeReview.originalContent : activeReview.currentContent;
    const findingsToHighlight = activeReview.findings;

    if (showOriginalDiff || findingsToHighlight.length === 0) {
      return (
        <div className="space-y-4">
          {textToRender.split('\n\n').map((paragraph, pIdx) => (
            <p key={pIdx} className="leading-relaxed text-slate-800">
              {paragraph}
            </p>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {textToRender.split('\n\n').map((paragraph, pIdx) => {
          const matchedInParagraph: {
  finding: ReviewFinding;
  matchStart: number;
  matchEnd: number;
  pinIndex: number;
}[] = [];

const paragraphStart =
  textToRender.split('\n\n').slice(0, pIdx).join('\n\n').length +
  (pIdx > 0 ? 2 : 0);

findingsToHighlight.forEach((f, fIdx) => {
  const isAccepted = f.suggestion?.status === 'accepted';

  // For accepted changes, use the exact saved replacement position.
  const appliedStart = f.suggestion?.appliedStart;
const appliedEnd = f.suggestion?.appliedEnd;

if (
  isAccepted &&
  appliedStart != null &&
  appliedEnd != null
) {
  const localStart = appliedStart - paragraphStart;
  const localEnd = appliedEnd - paragraphStart;
    if (
      localStart >= 0 &&
      localEnd <= paragraph.length &&
      localEnd > localStart
    ) {
      matchedInParagraph.push({
        finding: f,
        matchStart: localStart,
        matchEnd: localEnd,
        pinIndex: fIdx + 1,
      });
    }

    return;
  }

  // For findings without an applied position, retain text matching.
  const searchText = f.exactText;
  if (!searchText) return;

  const idx = paragraph.indexOf(searchText);

  if (idx !== -1) {
    matchedInParagraph.push({
      finding: f,
      matchStart: idx,
      matchEnd: idx + searchText.length,
      pinIndex: fIdx + 1,
    });
  }
});

          matchedInParagraph.sort((a, b) => a.matchStart - b.matchStart);

          if (matchedInParagraph.length === 0) {
            return (
              <p key={pIdx} className="leading-relaxed text-slate-800">
                {paragraph}
              </p>
            );
          }

          const parts: React.ReactNode[] = [];
          let lastIndex = 0;

          matchedInParagraph.forEach((match, mIdx) => {
            if (match.matchStart > lastIndex) {
              parts.push(paragraph.substring(lastIndex, match.matchStart));
            }

            const isSelected = match.finding.id === selectedFindingId;
            const isAccepted = match.finding.suggestion?.status === 'accepted';
            const isRejected = match.finding.suggestion?.status === 'rejected';
            const meta = getCategoryMeta(match.finding.category);
            const wording = getWordingPresentation(match.finding);
            const replacementText = match.finding.suggestion?.suggestedText;

            parts.push(
              <span
                key={`pin-${mIdx}`}
                ref={(el) => { documentPinRefs.current[match.finding.id] = el; }}
                onClick={() => handleSelectFindingFromText(match.finding.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelectFindingFromText(match.finding.id);
                  }
                }}
                onMouseEnter={(event) => showPinPreview(match.finding, match.pinIndex, event.currentTarget)}
                onMouseLeave={() => setPinPreview(null)}
                onFocus={(event) => showPinPreview(match.finding, match.pinIndex, event.currentTarget)}
                onBlur={() => setPinPreview(null)}
                role="button"
                tabIndex={0}
                aria-label={`Pin ${match.pinIndex}: ${match.finding.title}. ${wording.restrictedLabel}: ${match.finding.exactText}${replacementText ? `. ${wording.replacementLabel}: ${replacementText}` : ''}`}
                aria-describedby={pinPreview?.finding.id === match.finding.id ? `pin-preview-${match.finding.id}` : undefined}
                className={`inline-flex items-center gap-1 cursor-pointer transition-all px-1.5 py-0.5 rounded mx-0.5 ${
  isAccepted
    ? `bg-emerald-50 text-emerald-950 border border-emerald-300 ${isSelected ? 'ring-2 ring-emerald-500 shadow-xs' : ''}`
    : isRejected
  ? `bg-rose-50 text-rose-700 border border-rose-300 line-through ${isSelected ? 'ring-2 ring-rose-500' : ''}`
    : isSelected
    ? 'ring-2 ring-[#2457D6] bg-blue-50 font-medium text-slate-900 shadow-xs'
    : match.finding.severity === 'critical'
    ? 'bg-rose-50 text-rose-950 border-b-2 border-rose-500 hover:bg-rose-100/70'
    : match.finding.severity === 'high'
    ? 'bg-amber-50 text-amber-950 border-b-2 border-amber-500 hover:bg-amber-100/70'
    : 'bg-blue-50 text-blue-950 border-b-2 border-blue-500 hover:bg-blue-100/70'
}`}
              >

                <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                  isSelected ? 'bg-[#2457D6] text-white' : isAccepted ? 'bg-emerald-600 text-white' : meta.pinColor
                }`}>
                  P{match.pinIndex}
                </span>

                <span>{paragraph.substring(match.matchStart, match.matchEnd)}</span>

                {isAccepted && (
                  <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                )}
              </span>
            );

            lastIndex = match.matchEnd;
          });

          if (lastIndex < paragraph.length) {
            parts.push(paragraph.substring(lastIndex));
          }

          return (
            <p key={pIdx} className="leading-relaxed text-slate-800">
              {parts}
            </p>
          );
        })}
      </div>
    );
  };

  const renderPinPreview = () => {
    if (!pinPreview) return null;

    const finding = pinPreview.finding;
    const wording = getWordingPresentation(finding);
    const suggestion = finding.suggestion;
    const isEdited = suggestion?.status === 'edited';
    const appliedText = isEdited
      ? suggestion?.customEditedText || suggestion?.suggestedText
      : suggestion?.suggestedText;
    const hasCustomRevision =
      isEdited &&
      Boolean(suggestion?.customEditedText) &&
      suggestion?.customEditedText !== suggestion?.suggestedText;
    const recommendedAction = getRecommendedAction(finding);
    const showSuggestedRevision =
      Boolean(suggestion?.suggestedText) &&
      !wording.hasGroundedReplacement &&
      !wording.isEvidenceGap;

    return createPortal(
      <div
        id={`pin-preview-${finding.id}`}
        ref={pinPreviewRef}
        role="tooltip"
        style={{
          left: pinPreview.left,
          top: pinPreview.top,
          width: '20rem',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
          transform: pinPreview.placement === 'above' ? 'translateY(-100%)' : undefined,
        }}
        className="pointer-events-none fixed z-[100] rounded-xl border border-slate-300 bg-white p-3 text-left shadow-2xl"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
            PIN {pinPreview.pinNumber}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {getCategoryMeta(finding.category).label}
          </span>
        </div>

        <p className="mb-2 break-words text-xs font-bold leading-snug text-slate-900">
          {finding.title}
        </p>

        <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-2">
          <div className="text-[9px] font-bold uppercase tracking-wide text-rose-700">
            {wording.restrictedLabel}
          </div>
          <div className="mt-0.5 break-words font-mono text-xs font-semibold leading-relaxed text-rose-950">
            &ldquo;{finding.exactText}&rdquo;
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <div className="text-[9px] font-bold uppercase tracking-wide text-slate-700">
            Why this was flagged
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-700">
            {finding.explanation}
          </p>
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">Recommended: </span>
          {recommendedAction}
        </p>

        {suggestion && wording.hasGroundedReplacement && (
          <div className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2">
            <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-800">
              {hasCustomRevision ? 'Applied custom revision' : wording.replacementLabel}
            </div>
            <div className="mt-0.5 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-emerald-950">
              {appliedText}
            </div>
            {hasCustomRevision && suggestion.suggestedText && (
              <div className="mt-1.5 border-t border-emerald-200 pt-1.5 text-[10px] leading-relaxed text-emerald-900">
                <span className="font-bold">{wording.replacementLabel}: </span>
                <span className="break-words font-mono">{suggestion.suggestedText}</span>
              </div>
            )}
          </div>
        )}

        {suggestion && showSuggestedRevision && (
          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
            <div className="text-[9px] font-bold uppercase tracking-wide text-blue-800">
              {finding.category === 'direct_contradiction' ? 'Suggested correction' : 'Suggested revision'}
            </div>
            <div className="mt-0.5 whitespace-pre-wrap break-words text-xs font-semibold leading-relaxed text-slate-900">
              {appliedText}
            </div>
          </div>
        )}

        {wording.isEvidenceGap && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-relaxed text-amber-900">
            No directly relevant approved source was found for this claim.
          </div>
        )}
      </div>,
      document.body
    );
  };

  // ==================================================================
  // DEDICATED COMPLETION SCREEN (Requirement 1)
  // ==================================================================
  if (completionRecord) {
    const { verdict, document: doc } = completionRecord;
    const isApprovedWithChanges = verdict === 'approved_with_changes';
    const isApprovedAsIs = verdict === 'approved_as_is';
    const isRejected = verdict === 'rejected';

    return (
      <div className="h-full min-h-0 overflow-y-auto p-6 lg:p-8 max-w-4xl mx-auto flex flex-col justify-center animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          {/* Status Icon & Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xs ${
              isApprovedWithChanges
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : isApprovedAsIs
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}>
              {isApprovedWithChanges && <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />}
              {isApprovedAsIs && <FileCheck2 className="w-8 h-8 stroke-[2.2]" />}
              {isRejected && <XCircle className="w-8 h-8 stroke-[2.2]" />}
            </div>

            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border mb-2 ${
                isApprovedWithChanges
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : isApprovedAsIs
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {isApprovedWithChanges && 'Approved With Revisions'}
                {isApprovedAsIs && 'Approved Without Modification'}
                {isRejected && 'Governance Approval Denied'}
              </span>

              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isApprovedWithChanges && 'Review Approved with Changes'}
                {isApprovedAsIs && 'Review Approved As-Is'}
                {isRejected && 'Review Rejected'}
              </h1>

              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                {isApprovedWithChanges && 'The marketing communication has been reviewed and revised with brand-approved terminology.'}
                {isApprovedAsIs && 'The submitted draft satisfied all brand rules and verified factsheet claims without requiring textual modifications.'}
                {isRejected && 'The document did not meet approved governance standards and was not approved. The original text and all recorded audit evidence have been preserved in the Decision Ledger.'}
              </p>
            </div>
          </div>

          {/* Audit Verification Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Review ID</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">{doc.id}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Selected Demo Reviewer</div>
                <div className="font-medium text-slate-900 mt-0.5 truncate">{doc.reviewer}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Decision Timestamp</div>
                <div className="font-mono text-slate-700 mt-0.5">
                  {doc.decidedAt ? new Date(doc.decidedAt).toLocaleString() : 'Just now'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Review Outcome</div>
                <div className={`font-bold mt-0.5 uppercase ${
                  isRejected ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {isRejected ? 'REJECTED' : 'APPROVED'}
                </div>
              </div>
            </div>

            {/* Finding Verdict Summary */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Document: <strong>{doc.title}</strong></span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-700 font-semibold">{doc.summary.acceptedSuggestions} accepted</span>
                <span className="text-slate-300">·</span>
                <span className="text-rose-700 font-semibold">{doc.summary.rejectedSuggestions} rejected</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-700">{doc.summary.totalFindings} findings audited</span>
              </div>
            </div>

            {doc.decisionNotes && (
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-700 italic">
                &ldquo;{doc.decisionNotes}&rdquo;
              </div>
            )}
          </div>

          {/* Mandatory 3 Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setCompletionRecord(null);
                setViewMode('results');
              }}
              className="w-full sm:w-auto px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>1. View Completed Review</span>
            </button>

            <button
              onClick={() => {
                setCompletionRecord(null);
                if (onNavigateToLedger) onNavigateToLedger();
              }}
              className="w-full sm:w-auto px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#2457D6]" />
              <span>2. Return to Decision Ledger</span>
            </button>

            <button
              onClick={() => {
                setCompletionRecord(null);
                setTitle('');
                setContent('');
                setViewMode('submission');
              }}
              className="w-full sm:w-auto px-5 py-2 bg-[#2457D6] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>3. Start New Review</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================================================================
  // STATE A: IMPROVED NEW REVIEW SUBMISSION SCREEN (Requirement 14)
  // ==================================================================
  if (viewMode === 'submission' || !activeReview) {
    return (
      <div className="h-full min-h-0 overflow-y-auto p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Submit Communication Draft for Brand Review
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Evaluates submitted copy against verified brand guidelines, terminology rules, and audited factsheets using deterministic rules and explainable Gemini contextual analysis.
            </p>
          </div>
          {activeReview && (
            <button
              onClick={() => setViewMode('results')}
              className="px-3 py-1.5 text-xs border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Active Review</span>
            </button>
          )}
        </div>

        {/* 1-Click Demo Scenarios */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#2457D6]" />
            <span>Load Realistic AuraCloud Test Scenarios:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SAMPLE_DOCUMENTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickLoadDraft(sample)}
                className="p-3 text-left bg-slate-50 hover:bg-blue-50/50 hover:border-[#2457D6] transition-all rounded-lg border border-slate-200 text-xs cursor-pointer group"
              >
                <div className="font-semibold text-slate-900 group-hover:text-[#2457D6] transition-colors truncate">
                  {sample.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 capitalize font-mono">
                  {sample.contentType.replace(/_/g, ' ')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {submitError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Submission Form Organised into 3 Clear Distinguishable Sections */}
        <form onSubmit={handleSubmitDraft} className="space-y-4">
          {/* SECTION A: DOCUMENT DETAILS */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-5 h-5 rounded bg-blue-50 text-[#2457D6] font-mono font-bold text-[11px] flex items-center justify-center">
                A
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Document Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q4 Enterprise Launch Announcement Email"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:border-[#2457D6] focus:ring-1 focus:ring-[#2457D6] focus:outline-none bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Communication Content Type *
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as ContentType)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:border-[#2457D6] focus:ring-1 focus:ring-[#2457D6] focus:outline-none bg-slate-50/50"
                >
                  <option value="product_announcement">Product Announcement</option>
                  <option value="website_copy">Website Copy</option>
                  <option value="marketing_email">Marketing Email</option>
                  <option value="social_media">Social Media Post</option>
                  <option value="advertisement">Advertisement</option>
                  <option value="general_communication">General Communication</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION B: DRAFT CONTENT */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-50 text-[#2457D6] font-mono font-bold text-[11px] flex items-center justify-center">
                  B
                </span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Draft Content to Analyze
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                {content.split(/\s+/).filter(Boolean).length} words · {content.length} characters
              </span>
            </div>

            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or write the communication text here for governance evaluation..."
              className="w-full text-xs p-3.5 font-sans leading-relaxed rounded-lg border border-slate-200 focus:border-[#2457D6] focus:ring-1 focus:ring-[#2457D6] focus:outline-none bg-slate-50/50"
              required
            />
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2457D6]" />
              <span>Deterministic rules flag exact requirements; Gemini adds contextual analysis and suggestions. A human reviewer makes every final decision. Nothing is published automatically.</span>
            </div>
          </div>

          {/* SECTION C: REVIEW ASSIGNMENT */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-5 h-5 rounded bg-blue-50 text-[#2457D6] font-mono font-bold text-[11px] flex items-center justify-center">
                C
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Review Assignment & Human Sign-Off Authority
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Human Reviewer
                </label>
                <input
                  type="text"
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:border-[#2457D6] focus:ring-1 focus:ring-[#2457D6] focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selected Demo Profile
                </label>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{currentUser.name}</span>
                    <span className="text-slate-400 font-mono text-[10px] ml-2">({currentUser.role.toUpperCase()})</span>
                  </div>
                  <span className="text-[10px] text-[#2457D6] font-medium">{currentUser.department}</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Final approval authority and decision sign-off timestamp will be immutably recorded under this reviewer identity.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#2457D6] hover:bg-[#1D4ED8] text-white transition-all rounded-lg font-semibold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Cpu className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Deterministic & Gemini Analysis...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute Brand Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==================================================================
  // STATE B: FULL-HEIGHT SIDE-BY-SIDE REVIEW RESULTS WORKSPACE
  // ==================================================================
  const unresolvedCount = activeReview.summary.unresolvedFindings;
  const acceptedCount = activeReview.summary.acceptedSuggestions +
    activeReview.findings.filter(f => !f.suggestion && f.findingDecision === 'accepted').length;
  const rejectedCount = activeReview.summary.rejectedSuggestions +
    activeReview.findings.filter(f => !f.suggestion && f.findingDecision === 'dismissed').length;
  const pendingCount = unresolvedCount;
  const isCompleted = ['approved_with_changes', 'approved_as_is', 'rejected'].includes(activeReview.decisionStatus);
  const deterministicStatus = getDeterministicStatusView(activeReview);
  const aiStatus = getAiStatusView(activeReview);
  const analysisTone = getHighestAnalysisTone(deterministicStatus.tone, aiStatus.tone);

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* 1. Subheader Strip with Prominent Finding Counts (Requirement 11) */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono text-[#2457D6] font-semibold">{activeReview.id}</span>
              <span>·</span>
              <span className="capitalize">{activeReview.contentType.replace(/_/g, ' ')}</span>
              <span>·</span>
              <span>Reviewer: <strong className="text-slate-700">{activeReview.reviewer}</strong></span>
            </div>
            <h1 className="text-base lg:text-lg font-bold text-slate-950 truncate mt-1">
              {activeReview.title}
            </h1>
          </div>
        </div>

        {/* Status Counters & Prominent Unresolved Display */}
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-mono text-slate-600">
            <span>Total:</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
              {activeReview.findings.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-emerald-700">
            <span>Accepted:</span>
            <span className="font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {acceptedCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-rose-700">
            <span>Rejected:</span>
            <span className="font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {rejectedCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-amber-700">
            <span>Pending:</span>
            <span className="font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {pendingCount}
            </span>
          </div>

          {/* Prominent Unresolved Counter */}
          <div className={`flex items-center gap-1.5 font-mono px-2.5 py-0.5 rounded-full border ${
            unresolvedCount > 0
              ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            <span>Unresolved:</span>
            <span className="underline">{unresolvedCount}</span>
          </div>

          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase ${
            activeReview.decisionStatus === 'approved_with_changes'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : activeReview.decisionStatus === 'approved_as_is'
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : activeReview.decisionStatus === 'rejected'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : activeReview.decisionStatus === 'partially_approved'
              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {activeReview.decisionStatus === 'partially_approved' ? 'pending · more findings' : activeReview.decisionStatus.replace(/_/g, ' ')}
          </span>

          <button
            type="button"
            onClick={() => setAnalysisPanelCollapsed(value => !value)}
            aria-expanded={!analysisPanelCollapsed}
            aria-controls="analysis-checks-panel"
            title={analysisPanelCollapsed ? 'Show deterministic and AI analysis checks' : 'Hide analysis checks to expand both review panes'}
            className="ml-1 px-2.5 py-1 text-xs border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            {analysisPanelCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span>{analysisPanelCollapsed ? 'Show Checks' : 'Hide Checks'}</span>
          </button>
          <button
            onClick={() => setViewMode('submission')}
            className="ml-2 px-2.5 py-1 text-xs border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Review</span>
          </button>
        </div>
      </div>

      {/* Completed Notice Banner if in read-only completed state */}
      {isCompleted && (
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span><strong>Completed Review Record:</strong> This document has received human sign-off ({activeReview.decisionStatus.replace(/_/g, ' ')} by {activeReview.reviewer}). Review is in read-only audit mode.</span>
          </div>
          <button
            onClick={() => {
              setCompletionRecord({
                verdict: activeReview.decisionStatus as any,
                document: activeReview,
              });
            }}
            className="text-[11px] text-[#2457D6] hover:underline font-semibold cursor-pointer"
          >
            View Completion Record
          </button>
        </div>
      )}

      {!analysisPanelCollapsed && (
        <>
          <div
            id="analysis-checks-panel"
            ref={analysisPanelRef}
            style={{ height: analysisPanelHeight }}
            className={`mx-4 mt-2 shrink-0 rounded-lg border px-3 py-2 text-[11px] shadow-2xs overflow-hidden transition-[height] duration-150 ${ANALYSIS_PANEL_TONE_STYLES[analysisTone]}`}
          >
        <div className="flex h-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div role="status" aria-live="polite" className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-1">
              {[
                {
                  title: 'Deterministic checks',
                  view: deterministicStatus,
                  Icon: ShieldCheck,
                  status: activeReview.deterministicAnalysisStatus || 'legacy_unknown',
                  diagnostic: activeReview.deterministicAnalysisMessage,
                },
                {
                  title: 'AI contextual review',
                  view: aiStatus,
                  Icon: Sparkles,
                  status: activeReview.aiAnalysisStatus || 'legacy_unknown',
                  diagnostic: activeReview.aiAnalysisMessage,
                },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-2.5">
                  <item.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ANALYSIS_ICON_TONE_STYLES[item.view.tone]}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{item.title}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${ANALYSIS_BADGE_TONE_STYLES[item.view.tone]}`}>
                        {item.view.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 leading-relaxed text-slate-700">
                      <strong className="font-semibold text-slate-900">{item.view.headline}</strong>{' '}
                      {item.view.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <details className="rounded-lg border border-slate-200/80 bg-white/75 px-2.5 py-1.5">
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-700">
                Technical details
              </summary>
              <div className="mt-2 space-y-2 border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-600">
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-slate-800">Deterministic checks:</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {activeReview.deterministicAnalysisStatus || 'legacy_unknown'}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words">
                    {activeReview.deterministicAnalysisMessage || 'No diagnostic message was recorded.'}
                  </p>
                </div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-slate-800">AI contextual review:</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {activeReview.aiAnalysisStatus || 'legacy_unknown'}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words">
                    {activeReview.aiAnalysisMessage || 'No diagnostic message was recorded.'}
                  </p>
                </div>
              </div>
            </details>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <button
              type="button"
              onClick={handleRerunAnalysis}
              disabled={isRerunningAnalysis}
              aria-busy={isRerunningAnalysis}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#2457D6] bg-[#2457D6] px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1946B8] disabled:cursor-wait disabled:opacity-70"
            >
              {isRerunningAnalysis ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {isRerunningAnalysis ? 'Re-running...' : 'Re-run Analysis'}
            </button>
          </div>
        </div>
          </div>
        <div
          role="separator"
          aria-label="Resize analysis checks panel vertically"
          aria-orientation="horizontal"
          aria-valuemin={76}
          aria-valuemax={240}
          aria-valuenow={analysisPanelHeight}
          tabIndex={0}
          onPointerDown={(event) => {
            resizingAnalysisPanel.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!resizingAnalysisPanel.current || !analysisPanelRef.current) return;
            const top = analysisPanelRef.current.getBoundingClientRect().top;
            setAnalysisPanelHeight(Math.max(76, Math.min(240, event.clientY - top)));
          }}
          onPointerUp={() => { resizingAnalysisPanel.current = false; }}
          onPointerCancel={() => { resizingAnalysisPanel.current = false; }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') setAnalysisPanelHeight(value => Math.max(76, value - 8));
            if (event.key === 'ArrowDown') setAnalysisPanelHeight(value => Math.min(240, value + 8));
          }}
          className="mx-4 flex h-2 shrink-0 touch-none cursor-row-resize items-center justify-center rounded-b-md bg-slate-200/70 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <span className="h-0.5 w-12 rounded-full bg-slate-400" />
        </div>
        </>
      )}
      {rerunFeedback && <div
        role={rerunFeedback.kind === 'error' ? 'alert' : 'status'}
        className={`mx-4 mt-2 rounded-lg border px-3 py-2 text-xs ${
          rerunFeedback.kind === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : rerunFeedback.kind === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}
      >{rerunFeedback.message}</div>}

      {/* 2. Side-by-Side Review Panels: Left Document vs Right Findings */}
      <div
        ref={workspaceRef}
        className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden"
      >
        {/* LEFT PANEL: Document Workspace (user-resizable width) */}
        <div
          style={{ width: window.innerWidth >= 768 ? `calc(${documentPanePercent}% - 4px)` : '100%' }}
          className="w-full md:w-auto min-w-0 min-h-[42vh] md:min-h-0 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-white overflow-hidden"
        >
          {/* Document Top Bar */}
          <div className="px-6 py-2 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Pin className="w-3.5 h-3.5 text-[#2457D6]" />
              <span className="font-semibold text-slate-800">Document Review Surface</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500 font-mono text-[11px]">Click pins to jump to findings</span>
            </div>
            <button
              onClick={() => setShowOriginalDiff(!showOriginalDiff)}
              className={`px-2.5 py-1 text-xs rounded-md border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                showOriginalDiff
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>{showOriginalDiff ? 'Showing Original Submitted' : 'Showing Current Revised Draft'}</span>
            </button>
          </div>

          {/* Document Text (Independent Scroll) */}
          <div className="flex-1 p-6 overflow-y-auto font-sans text-sm leading-relaxed bg-white">
            <div className="max-w-4xl mx-auto w-full space-y-4">
              <div className="text-xs font-mono text-slate-400 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Content Type: {activeReview.contentType.replace(/_/g, ' ')}</span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Link2 className="w-3 h-3 text-[#2457D6]" />
                  <span>{activeReview.findings.length} Evidence Pins Linked</span>
                </span>
              </div>

              {/* Render document with highlighted findings */}
              <div className="text-slate-800 text-sm">
                {renderHighlightedDocument()}
              </div>

              {/* Active revision banner */}
              {activeReview.summary.acceptedSuggestions > 0 && !showOriginalDiff && (
                <div className="mt-6 p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Revisions Active:</strong> {activeReview.summary.acceptedSuggestions} approved corrections applied to current draft.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Human Governance Sign-Off Bar (Requirement 2: Blocks final approval with unresolved findings) */}
          {!isCompleted && (
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5 shadow-xs">
              {/* Unresolved findings warning banner */}
              {unresolvedCount > 0 && (
                <div className="p-2.5 bg-amber-50/90 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>{unresolvedCount} finding(s) pending:</strong> The remaining findings have not been approved or rejected. This review will stay in the Pending queue until they are addressed.
                    </span>
                  </div>
                  <button
                    onClick={handleJumpToFirstUnresolved}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[11px] whitespace-nowrap cursor-pointer"
                  >
                    Jump to Unresolved
                  </button>
                </div>
              )}

              {decisionFeedback && (
                <div role="status" className="p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                  {decisionFeedback}
                </div>
              )}

              {validationError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#2457D6]" />
                  <span>Human Governance Sign-Off Authority</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Reviewer: {currentUser.name} ({currentUser.role.toUpperCase()})
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <input
                  type="text"
                  placeholder="Reviewer rationale or audit sign-off note (e.g. Approved with corrections for release)..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full sm:flex-1 text-xs p-2 rounded-lg border border-slate-200 focus:border-[#2457D6] focus:ring-1 focus:ring-[#2457D6] focus:outline-none bg-white"
                />

                <button
                  onClick={() => handleFinalDecision('approved_as_is')}
                  disabled={isCompleting}
                  title={unresolvedCount > 0 ? 'Save this checkpoint; the remaining findings will stay pending' : 'Approve As-Is'}
                  className="px-3 py-1.5 text-white font-medium text-xs rounded-lg flex items-center gap-1 whitespace-nowrap shadow-xs transition-colors bg-slate-800 hover:bg-slate-900 cursor-pointer disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve As-Is</span>
                </button>

                <button
                  onClick={() => handleFinalDecision('rejected')}
                  disabled={isCompleting}
                  title={unresolvedCount > 0 ? 'Save this checkpoint; the remaining findings will stay pending' : 'Reject Review'}
                  className="px-3 py-1.5 text-white font-medium text-xs rounded-lg flex items-center gap-1 whitespace-nowrap shadow-xs transition-colors bg-rose-700 hover:bg-rose-800 cursor-pointer disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          role="separator"
          aria-label="Resize document and findings panels"
          aria-orientation="vertical"
          aria-valuemin={35}
          aria-valuemax={70}
          aria-valuenow={documentPanePercent}
          tabIndex={0}
          onPointerDown={(event) => {
            if (window.innerWidth < 768) return;
            resizingWorkspace.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!resizingWorkspace.current || !workspaceRef.current) return;
            const bounds = workspaceRef.current.getBoundingClientRect();
            const next = Math.round(((event.clientX - bounds.left) / bounds.width) * 100);
            setDocumentPanePercent(Math.max(35, Math.min(70, next)));
          }}
          onPointerUp={() => { resizingWorkspace.current = false; }}
          onPointerCancel={() => { resizingWorkspace.current = false; }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') setDocumentPanePercent(value => Math.max(35, value - 2));
            if (event.key === 'ArrowRight') setDocumentPanePercent(value => Math.min(70, value + 2));
          }}
          className="hidden md:flex w-2 shrink-0 cursor-col-resize touch-none items-center justify-center bg-slate-100 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <span className="h-10 w-0.5 rounded-full bg-slate-400" />
        </div>
        {/* RIGHT PANEL: Findings List & Evidence Actions */}
        <div
          style={{ width: window.innerWidth >= 768 ? `calc(${100 - documentPanePercent}% - 4px)` : '100%' }}
          className="w-full md:w-auto min-w-0 min-h-[55vh] md:min-h-0 flex flex-col bg-slate-50/50 overflow-hidden"
        >
          {/* Findings Filter Bar */}
          <div className="px-4 py-2 bg-white border-b border-slate-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 shrink-0">
              <Filter className="w-3.5 h-3.5 text-[#2457D6]" />
              <span>Evidence Filter:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'exact_violation', label: 'Exact Rules' },
                { id: 'direct_contradiction', label: 'Contradictions' },
                { id: 'contextual_inconsistency', label: 'Context' },
                { id: 'unsupported_claim', label: 'Claims' },
                { id: 'potential_issue', label: 'Issues' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterCategory(f.id)}
                  className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    filterCategory === f.id
                      ? 'bg-[#2457D6] text-white shadow-xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white px-4 py-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-sm font-bold text-slate-900">Collaborative review stages</h3><p className="text-xs text-slate-500">Assign sequential reviewers and record hand-offs.</p></div>
              <div className="flex items-center gap-3"><a href={api.getReviewWorkflowExportUrl(activeReview.id)} className="text-xs font-semibold text-[#2457D6] underline" target="_blank" rel="noreferrer">Export workflow CSV</a><button type="button" onClick={() => setWorkflowPanelCollapsed(value => !value)} aria-expanded={!workflowPanelCollapsed} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{workflowPanelCollapsed ? "Show stages" : "Hide stages"}</button></div>
            </div>
            {!workflowPanelCollapsed && <>
            {workflowError && <p role="alert" className="rounded-md bg-rose-50 p-2 text-[10px] text-rose-700">{workflowError}</p>}
            {workflowStages.length > 0 && <div className="space-y-2">{workflowStages.map(stage => (
              <div key={stage.id} className="rounded-lg border border-slate-200 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold text-slate-800">{stage.order}. {stage.name}</div>
                  <span className={"rounded-full px-2 py-0.5 text-[9px] font-semibold " + (stage.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : stage.status === 'rejected' ? 'bg-rose-50 text-rose-700' : stage.status === 'in_review' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')}>{stage.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Assigned to {stage.assignedReviewer}</p>
                {stage.decisionNote && <p className="mt-1 text-[10px] text-slate-600">Note: {stage.decisionNote}</p>}
                {stage.assignedReviewer.toLowerCase() === currentUser.name.toLowerCase() && (stage.status === 'in_review' || stage.status === 'returned') && (
                  <div className="mt-2 space-y-2">
                    <input value={workflowNote} onChange={event => setWorkflowNote(event.target.value)} placeholder="Decision note (optional)" className="w-full rounded border border-slate-200 px-2 py-1.5 text-[10px]" />
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" disabled={workflowBusy} onClick={() => void handleWorkflowDecision(stage, 'approved')} className="rounded bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50">Approve stage &amp; hand off</button>
                      <button type="button" disabled={workflowBusy} onClick={() => void handleWorkflowDecision(stage, 'returned')} className="rounded border border-amber-300 px-2 py-1 text-[10px] font-semibold text-amber-800 disabled:opacity-50">Return for changes</button>
                      <button type="button" disabled={workflowBusy} onClick={() => void handleWorkflowDecision(stage, 'rejected')} className="rounded border border-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-700 disabled:opacity-50">Reject stage</button>
                    </div>
                  </div>
                )}
              </div>
            ))}</div>}
            <form onSubmit={handleAddWorkflowStage} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <input value={workflowStageName} onChange={event => setWorkflowStageName(event.target.value)} placeholder="Stage name (e.g. Legal review)" className="min-w-0 rounded border border-slate-200 px-2 py-1.5 text-[10px]" />
              <input value={workflowAssignee} onChange={event => setWorkflowAssignee(event.target.value)} placeholder="Assign reviewer name" className="min-w-0 rounded border border-slate-200 px-2 py-1.5 text-[10px]" />
              <button type="submit" disabled={workflowBusy || !workflowStageName.trim() || !workflowAssignee.trim() || isCompleted} className="rounded bg-[#2457D6] px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50">Add stage</button>
            </form>
            <p className="text-[9px] text-slate-400">Demo assignments are workflow records, not production authentication or access control.</p>
            </>}
          </div>

          {/* Findings List (Independent Scroll) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {filteredFindings.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <div className="font-bold text-slate-800">No Findings in this Category</div>
                <div className="mt-1">No additional issue was identified in this analysis. This is not a safety approval.</div>
              </div>
            ) : (
              filteredFindings.map((finding, idx) => {
                const isSelected = finding.id === selectedFindingId;
                const catMeta = getCategoryMeta(finding.category);
                const CatIcon = catMeta.icon;
                const suggestionStatus = finding.suggestion?.status || 'pending';
                const pinNumber = idx + 1;
                const isPending = finding.lifecycleStatus !== 'resolved' && (
                  finding.suggestion
                    ? finding.suggestion.status === 'pending'
                    : !['accepted', 'dismissed'].includes(finding.findingDecision || '')
                );
                const wording = getWordingPresentation(finding);
                const suggestedReplacement = finding.suggestion?.suggestedText;
                const appliedReplacement =
                  suggestionStatus === 'edited'
                    ? finding.suggestion?.customEditedText || suggestedReplacement
                    : suggestedReplacement;
                const showsAppliedReplacement =
                  suggestionStatus === 'accepted' || suggestionStatus === 'edited';
                const comparisonReplacement = showsAppliedReplacement
                  ? appliedReplacement
                  : suggestedReplacement;
                const hasCustomRevision =
                  suggestionStatus === 'edited' &&
                  Boolean(finding.suggestion?.customEditedText) &&
                  finding.suggestion?.customEditedText !== suggestedReplacement;
                const comparisonLabel = hasCustomRevision
                  ? 'Applied custom revision'
                  : wording.replacementLabel;
                const recommendedAction = getRecommendedAction(finding);
                const normalizedSource = finding.sourceRuleOrTerm
                  .replace(/^Terminology:\s*/i, '')
                  .trim()
                  .toLowerCase();
                const sourceDuplicatesReplacement =
                  Boolean(suggestedReplacement) &&
                  normalizedSource === suggestedReplacement?.toLowerCase();
                const showSuggestedRevision =
                  Boolean(finding.suggestion?.suggestedText) &&
                  !wording.hasGroundedReplacement &&
                  !wording.isEvidenceGap;
                const findingDecisionLabel =
                  finding.findingDecision === 'accepted'
                    ? 'Accepted'
                    : finding.findingDecision === 'dismissed'
                    ? 'Dismissed'
                    : finding.findingDecision === 'verification_required'
                    ? 'Verification requested'
                    : 'Pending';
                const findingDecisionStyle =
                  finding.findingDecision === 'accepted'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : finding.findingDecision === 'dismissed'
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200';
                
const occurrenceMatches: number[] = [];
const searchText = finding.exactText;
const documentText = activeReview.currentContent || '';

if (searchText.trim().length > 0) {
  let searchFrom = 0;

  while (searchFrom <= documentText.length - searchText.length) {
    const matchAt = documentText.indexOf(searchText, searchFrom);

    if (matchAt === -1) break;

    occurrenceMatches.push(matchAt);
    searchFrom = matchAt + searchText.length;
  }
}

const selectedOccurrence = selectedOccurrences[finding.id];
const needsOccurrenceChoice = occurrenceMatches.length > 1;

const appliedStart = finding.suggestion?.appliedStart;
const appliedEnd = finding.suggestion?.appliedEnd;

const appliedText =
  suggestionStatus === 'edited'
    ? finding.suggestion?.customEditedText
    : finding.suggestion?.suggestedText;

const hasAppliedOccurrence =
  (suggestionStatus === 'accepted' || suggestionStatus === 'edited') &&
  appliedStart != null &&
  appliedEnd != null &&
  appliedStart >= 0 &&
  appliedEnd <= documentText.length &&
  appliedEnd > appliedStart &&
  documentText.slice(appliedStart, appliedEnd) === appliedText;

const hasValidOccurrence =
  hasAppliedOccurrence ||
  occurrenceMatches.length === 1 ||
  (needsOccurrenceChoice &&
    selectedOccurrence !== undefined &&
    selectedOccurrence >= 0 &&
    selectedOccurrence < occurrenceMatches.length);

const occurrencePreview = (start: number) => {
  const before = documentText.slice(Math.max(0, start - 35), start);
  const after = documentText.slice(
    start + searchText.length,
    start + searchText.length + 35
  );

  return `…${before}${searchText}${after}…`;
};

                return (
                  <div

                    key={finding.id}
                    ref={(el) => { findingCardRefs.current[finding.id] = el; }}
                    onClick={() => handleSelectFindingFromRight(finding.id)}
                    className={`border rounded-xl transition-all duration-150 bg-white p-4 cursor-pointer shadow-xs ${
                      isSelected
                        ? 'border-[#2457D6] ring-2 ring-[#2457D6]/20'
                        : isPending
                        ? 'border-amber-200 hover:border-amber-300'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header: Pin Badge + Category & Severity */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${catMeta.pinColor}`}>
                          PIN {pinNumber}
                        </span>
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <CatIcon className="w-3.5 h-3.5 shrink-0 text-[#2457D6]" />
                          <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                            {catMeta.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getSeverityStyle(finding.severity)}`}>
                          {finding.severity.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {finding.detectionMethod === 'deterministic_rule'
                            ? 'RULE'
                            : finding.detectionMethod === 'fact_check'
                            ? 'FACT CHECK'
                            : 'GEMINI'}
                        </span>
                        {finding.analysisRunId && finding.analysisRunId === activeReview.lastAnalysisRunId && (
                          <span className="text-[10px] rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">NEW THIS RERUN</span>
                        )}
                      </div>
                    </div>

                    {/* Finding Title */}
                    <h3 className="font-bold text-sm text-slate-900 mb-2">
                      {finding.title}
                    </h3>

                    <div className="my-3 rounded-lg border border-rose-200 bg-rose-50/70 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                        <XCircle className="h-3 w-3" />
                        <span>{wording.restrictedLabel}</span>
                      </div>
                      <div className="mt-1 break-words font-mono text-sm font-semibold leading-relaxed text-rose-950">
                        &ldquo;{finding.exactText}&rdquo;
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                        Why this was flagged
                      </h4>
                      <p className="mt-1.5 text-sm leading-6 text-slate-700">
                        {finding.explanation}
                      </p>
                    </div>

                    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-800">
                          <Sparkles className="h-3.5 w-3.5" />
                          Recommended action
                        </div>
                        {finding.suggestion && !wording.isEvidenceGap && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                            suggestionStatus === 'accepted'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : suggestionStatus === 'rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : suggestionStatus === 'edited'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {suggestionStatus.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-sm leading-6 text-slate-700">
                        {recommendedAction}
                      </p>

                      {showSuggestedRevision && finding.suggestion && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              {finding.category === 'direct_contradiction' ? 'Suggested correction' : 'Suggested revision'}
                            </div>
                            {hasCustomRevision && (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[9px] font-bold text-blue-800">
                                CUSTOM REVISION
                              </span>
                            )}
                          </div>
                          <div className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-slate-900">
                            {comparisonReplacement}
                          </div>
                        </div>
                      )}

                      {finding.suggestion?.rationale && !wording.isEvidenceGap && (
                        <p className="mt-3 text-xs leading-relaxed text-slate-600">
                          <span className="font-semibold text-slate-800">Rationale: </span>
                          {finding.suggestion.rationale}
                        </p>
                      )}

                      {finding.suggestion?.authorIntentPreserved && !wording.isEvidenceGap && (
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                          <span className="font-semibold text-slate-800">Author intent preserved: </span>
                          {finding.suggestion.authorIntentPreserved}
                        </p>
                      )}

                      {finding.suggestion && !wording.isEvidenceGap && (
                        <div className="mt-3 space-y-2">
                          {occurrenceMatches.length === 0 && !hasAppliedOccurrence ? (
                            <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs leading-relaxed text-rose-700">
                              The exact flagged text is no longer present in the current draft. Rerun the analysis before applying this suggestion.
                            </p>
                          ) : needsOccurrenceChoice ? (
                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-amber-800">
                                This text appears {occurrenceMatches.length} times. Choose which occurrence to change:
                              </label>
                              <select
                                value={selectedOccurrence ?? ''}
                                onChange={(event) =>
                                  setSelectedOccurrences(prev => ({
                                    ...prev,
                                    [finding.id]: Number(event.target.value),
                                  }))
                                }
                                onClick={(event) => event.stopPropagation()}
                                className="w-full rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-slate-800"
                              >
                                <option value="" disabled>
                                  Select an occurrence
                                </option>
                                {occurrenceMatches.map((start, occurrenceIdx) => (
                                  <option key={start} value={occurrenceIdx}>
                                    Occurrence {occurrenceIdx + 1}: {occurrencePreview(start)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}

                          {editingFindingId === finding.id ? (
                            <div className="space-y-2 rounded-lg border border-[#2457D6]/30 bg-white p-2.5">
                              <textarea
                                rows={2}
                                value={customEditText}
                                onChange={(event) => setCustomEditText(event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                className="w-full rounded-lg border border-[#2457D6] p-2 text-sm focus:outline-none"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setEditingFindingId(null)}
                                  className="cursor-pointer px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() =>
                                    handleSuggestionAction(
                                      finding.id,
                                      'edit',
                                      customEditText,
                                      needsOccurrenceChoice ? selectedOccurrence : undefined
                                    )
                                  }
                                  disabled={!hasValidOccurrence}
                                  className="cursor-pointer rounded bg-[#2457D6] px-3 py-1 text-xs font-medium text-white shadow-xs disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Save Custom Revision
                                </button>
                              </div>
                            </div>
                          ) : !isCompleted && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {suggestionStatus === 'accepted' ? (
                                <span className="flex items-center gap-1 rounded bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                                  <Check className="h-3 w-3" />
                                  Change Applied
                                </span>
                              ) : suggestionStatus === 'edited' ? (
                                <span className="flex items-center gap-1 rounded bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                                  <Check className="h-3 w-3" />
                                  Custom Revision Applied
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleSuggestionAction(
                                      finding.id,
                                      'accept',
                                      undefined,
                                      needsOccurrenceChoice ? selectedOccurrence : undefined
                                    )
                                  }
                                  disabled={!hasValidOccurrence}
                                  className="flex cursor-pointer items-center gap-1 rounded bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white shadow-2xs transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Accept Change</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setEditingFindingId(finding.id);
                                  setCustomEditText(
                                    finding.suggestion?.customEditedText ||
                                    finding.suggestion?.suggestedText ||
                                    ''
                                  );
                                }}
                                className="flex cursor-pointer items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                              >
                                <Edit3 className="h-3 w-3 text-slate-400" />
                                <span>Edit</span>
                              </button>

                              {suggestionStatus !== 'rejected' && (
                                <button
                                  onClick={() => handleSuggestionAction(finding.id, 'reject')}
                                  className="flex cursor-pointer items-center gap-1 rounded border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                                >
                                  <XCircle className="h-3 w-3" />
                                  <span>Reject</span>
                                </button>
                              )}

                              {suggestionStatus !== 'pending' && (
                                <button
                                  onClick={() => handleSuggestionAction(finding.id, 'reset')}
                                  title="Revert to pending decision"
                                  className="cursor-pointer p-1 text-slate-400 hover:text-slate-700"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {wording.hasGroundedReplacement && finding.suggestion && (
                      <div className="mb-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{comparisonLabel}</span>
                          </div>
                          {hasCustomRevision && (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[9px] font-bold text-blue-800">
                              EDITED
                            </span>
                          )}
                        </div>
                        <div className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-emerald-950 sm:text-base">
                          {comparisonReplacement}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-emerald-800">
                          {hasCustomRevision ? 'Custom revision applied to the document' : wording.replacementHint}
                        </div>
                        {hasCustomRevision && suggestedReplacement && (
                          <div className="mt-2 border-t border-emerald-200 pt-2 text-[11px] leading-relaxed text-emerald-900">
                            <span className="font-bold uppercase tracking-wide">{wording.replacementLabel}: </span>
                            <span className="break-words font-mono">{suggestedReplacement}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                          Supporting evidence &amp; references
                        </h4>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600">
                          Confidence: {finding.confidence.toUpperCase()}
                        </span>
                      </div>

                      {wording.isEvidenceGap ? (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900">
                          No directly relevant approved source was found for this claim.
                        </div>
                      ) : (
                        <div className="mt-2 space-y-1.5">
                          {!sourceDuplicatesReplacement && (
                            <p className="text-xs font-medium leading-relaxed text-slate-700">
                              {finding.sourceRuleOrTerm}
                            </p>
                          )}
                          <p className="break-words font-mono text-[10px] text-slate-500">
                            Reference: {finding.sourceReference}
                          </p>
                          {finding.evidenceQuote && (
                            <blockquote className="mt-2 border-l-2 border-[#2457D6]/40 pl-2 text-xs leading-relaxed text-slate-700">
                              Approved evidence: &ldquo;{finding.evidenceQuote}&rdquo;
                            </blockquote>
                          )}
                          {finding.evidenceStatus && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${finding.evidenceStatus === 'supported' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : (finding.evidenceStatus === 'unsupported' || finding.evidenceStatus === 'conflicting') ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                                Evidence: {finding.evidenceStatus.replace(/_/g, ' ')}
                              </span>
                              {finding.sourcePageNumber != null && <span className="text-[10px] text-slate-500">Page {finding.sourcePageNumber}</span>}
                              {finding.sourceSectionLabel && <span className="text-[10px] text-slate-500">Section: {finding.sourceSectionLabel}</span>}
                            </div>
                          )}
                          {finding.sourceExcerpt && (
                            <blockquote className="mt-2 rounded-md border border-slate-200 bg-white p-2 text-[11px] leading-relaxed text-slate-600">
                              Source passage: &ldquo;{finding.sourceExcerpt}&rdquo;
                            </blockquote>
                          )}
                          {finding.sourceDocumentId && (
                            <a href={api.getDocumentDownloadUrl(finding.sourceDocumentId)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="mt-2 inline-flex text-[10px] font-semibold text-[#2457D6] underline">
                              Open original evidence document
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-800">
                            Finding decision
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            Finding-level review record
                          </div>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${findingDecisionStyle}`}>
                          {findingDecisionLabel}
                        </span>
                      </div>

                      {(finding.findingDecisionReviewer || finding.findingDecisionAt) && (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                          {finding.findingDecisionReviewer && (
                            <span>
                              Recorded by <strong className="font-semibold text-slate-700">{finding.findingDecisionReviewer}</strong>
                            </span>
                          )}
                          {finding.findingDecisionAt && (
                            <span>{new Date(finding.findingDecisionAt).toLocaleString()}</span>
                          )}
                        </div>
                      )}

                      {!finding.findingDecisionReviewer && !finding.findingDecisionAt && (
                        <p className="mt-2 text-xs text-slate-500">
                          No finding-level decision has been recorded.
                        </p>
                      )}

                      {finding.findingDecisionNote && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                          <span className="font-semibold text-slate-800">Note: </span>
                          {finding.findingDecisionNote}
                        </p>
                      )}

                      {!isCompleted && (
                        <div className="mt-3 space-y-2">
                          <input
                            aria-label={`Optional note for ${finding.title}`}
                            value={findingDecisionNotes[finding.id] || ''}
                            onChange={event => setNoteForFinding(finding.id, event.target.value)}
                            placeholder="Optional reviewer note"
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                          />

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleFindingDecision(finding.id, 'accepted')}
                              disabled={finding.findingDecision === 'accepted'}
                              className="rounded bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {finding.findingDecision === 'accepted' ? 'Finding Accepted' : 'Accept Finding'}
                            </button>

                            <button
                              onClick={() => handleFindingDecision(finding.id, 'dismissed')}
                              disabled={finding.findingDecision === 'dismissed'}
                              className="rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {finding.findingDecision === 'dismissed' ? 'Finding Dismissed' : 'Dismiss Finding'}
                            </button>

                            <button
                              onClick={() => handleFindingDecision(finding.id, 'verification_required')}
                              disabled={finding.findingDecision === 'verification_required'}
                              className="rounded border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {finding.findingDecision === 'verification_required'
                                ? 'Verification Requested'
                                : 'Mark for Verification'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {renderPinPreview()}
      {checkpointRecord && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkpoint-dialog-title"
            aria-describedby="checkpoint-dialog-description"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">Review checkpoint saved</p>
                <h2 id="checkpoint-dialog-title" className="mt-1 text-lg font-bold text-slate-900">
                  This review is still pending
                </h2>
                <p id="checkpoint-dialog-description" className="mt-2 text-sm leading-relaxed text-slate-600">
                  {checkpointRecord.unresolvedCount} finding{checkpointRecord.unresolvedCount === 1 ? '' : 's'} remain unresolved and have not been {checkpointRecord.decision === 'approved_as_is' ? 'approved' : 'rejected'}. The decisions already recorded are saved, but the overall review has not received final approval and remains in the Pending queue.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {checkpointRecord.document.title}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setCheckpointRecord(null);
                  setViewMode('results');
                  onNavigateHome?.();
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Go to Command Center
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setCheckpointRecord(null);
                  setViewMode('results');
                }}
                className="rounded-lg bg-[#2457D6] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
              >
                Continue Reviewing
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
};
