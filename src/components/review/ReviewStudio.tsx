import React, { useState, useEffect, useRef } from 'react';
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
  FindingSeverity 
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
}

export const ReviewStudio: React.FC<ReviewStudioProps> = ({
  activeReview,
  onReviewCreated,
  onDecisionUpdated,
  initialDraftToLoad,
  onNavigateToLedger,
  onNavigateToPending,
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
  const [showOriginalDiff, setShowOriginalDiff] = useState(false);
  
  // Custom edit state for finding suggestion
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [customEditText, setCustomEditText] = useState('');
  const [selectedOccurrences, setSelectedOccurrences] = useState<Record<string, number>>({});

  // Human Final Decision State
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRerunningAnalysis, setIsRerunningAnalysis] = useState(false);
  const [rerunFeedback, setRerunFeedback] = useState<{
    kind: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const rerunInFlight = useRef(false);

  // DOM Refs for bidirectional synchronisation
  const findingCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const documentPinRefs = useRef<{ [key: string]: HTMLSpanElement | null }>({});

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

  // Load sample draft when provided
  useEffect(() => {
    if (initialDraftToLoad) {
      setTitle(initialDraftToLoad.title);
      setContentType(initialDraftToLoad.contentType);
      setContent(initialDraftToLoad.draft);
      setViewMode('submission');
      setCompletionRecord(null);
    }
  }, [initialDraftToLoad]);

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
      setSubmitError(err.message || 'Error executing review analysis. Please try again.');
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

  const handleFinalDecision = async (decision: 'approved_with_changes' | 'approved_as_is' | 'rejected') => {
    if (!activeReview) return;

    const unresolvedCount = activeReview.summary.unresolvedFindings;
    
    // Strict block: do not allow reviewer to finalise with unresolved findings
    if (unresolvedCount > 0) {
      setValidationError(
        `Finalization blocked: ${unresolvedCount} finding(s) remain unresolved. Every finding must receive an explicit human decision (accept, edit, or reject) before final sign-off.`
      );
      return;
    }

    setIsCompleting(true);
    setValidationError(null);

    try {
      const updated = await api.recordDecision(activeReview.id, {
        completeDecision: decision,
        decisionNotes,
        reviewer: currentUser.name || reviewer,
      });
      onDecisionUpdated(updated);
      
      // Navigate to dedicated completion view
      setCompletionRecord({
        verdict: decision,
        document: updated,
      });
    } catch (err: any) {
      console.error('Failed to complete review:', err);
      setValidationError(err.message || 'Failed to persist review decision.');
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
    const unresolved = activeReview.findings.find(
      f => !f.suggestion || f.suggestion.status === 'pending'
    );
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

            parts.push(
              <span
                key={`pin-${mIdx}`}
                ref={(el) => { documentPinRefs.current[match.finding.id] = el; }}
                onClick={() => handleSelectFindingFromText(match.finding.id)}
                className={`inline-flex items-center gap-1 cursor-pointer transition-all px-1.5 py-0.5 rounded mx-0.5 ${
  isAccepted
    ? `bg-emerald-50 text-emerald-950 border border-emerald-300 ${isSelected ? 'ring-2 ring-emerald-500 shadow-xs' : ''}`
    : isRejected
    ? `bg-slate-100 text-slate-400 line-through ${isSelected ? 'ring-2 ring-[#2457D6]' : ''}`
    : isSelected
    ? 'ring-2 ring-[#2457D6] bg-blue-50 font-medium text-slate-900 shadow-xs'
    : match.finding.severity === 'critical'
    ? 'bg-rose-50 text-rose-950 border-b-2 border-rose-500 hover:bg-rose-100/70'
    : match.finding.severity === 'high'
    ? 'bg-amber-50 text-amber-950 border-b-2 border-amber-500 hover:bg-amber-100/70'
    : 'bg-blue-50 text-blue-950 border-b-2 border-blue-500 hover:bg-blue-100/70'
}`}
                title={`[Pin ${match.pinIndex}] ${match.finding.title} — Click to inspect evidence`}
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

  // ==================================================================
  // DEDICATED COMPLETION SCREEN (Requirement 1)
  // ==================================================================
  if (completionRecord) {
    const { verdict, document: doc } = completionRecord;
    const isApprovedWithChanges = verdict === 'approved_with_changes';
    const isApprovedAsIs = verdict === 'approved_as_is';
    const isRejected = verdict === 'rejected';

    return (
      <div className="h-[calc(100vh-3rem)] overflow-y-auto p-8 max-w-3xl mx-auto flex flex-col justify-center animate-in fade-in duration-200">
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
      <div className="h-[calc(100vh-3rem)] overflow-y-auto p-8 max-w-4xl mx-auto space-y-6">
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
  const acceptedCount = activeReview.summary.acceptedSuggestions;
  const rejectedCount = activeReview.summary.rejectedSuggestions;
  const isCompleted = activeReview.decisionStatus !== 'pending';

  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)] h-auto overflow-y-auto md:h-[calc(100vh-3rem)] md:min-h-0 md:overflow-hidden">
      {/* 1. Subheader Strip with Prominent Finding Counts (Requirement 11) */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono text-[#2457D6] font-semibold">{activeReview.id}</span>
              <span>·</span>
              <span className="capitalize">{activeReview.contentType.replace(/_/g, ' ')}</span>
              <span>·</span>
              <span>Reviewer: <strong className="text-slate-700">{activeReview.reviewer}</strong></span>
            </div>
            <h1 className="text-sm font-bold text-slate-900 truncate mt-0.5">
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
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {activeReview.decisionStatus.replace(/_/g, ' ')}
          </span>

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

      <div className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
        ['failed', 'timeout', 'service_failure', 'evidence_validation_failure'].includes(activeReview.aiAnalysisStatus || '') || activeReview.deterministicAnalysisStatus === 'failed'
          ? 'border-rose-200 bg-rose-50 text-rose-900'
          : activeReview.aiAnalysisStatus === 'not_configured' || activeReview.aiAnalysisStatus === 'partial'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : activeReview.aiAnalysisStatus === 'completed'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      }`}>
        <div role="status" className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="space-y-1">
            <div><strong>Deterministic analysis: </strong>{activeReview.deterministicAnalysisStatus === 'completed'
              ? 'Completed.'
              : activeReview.deterministicAnalysisStatus === 'failed'
              ? activeReview.deterministicAnalysisMessage || 'Failed.'
              : 'Status unavailable for this earlier review.'}</div>
            <div><strong>Gemini contextual analysis: </strong>{activeReview.aiAnalysisStatus === 'completed'
            ? 'Completed.'
            : ['failed', 'timeout', 'service_failure', 'evidence_validation_failure'].includes(activeReview.aiAnalysisStatus || '')
            ? activeReview.aiAnalysisMessage || 'Gemini analysis did not complete successfully. Deterministic analysis status is shown separately; retry when appropriate.'
            : activeReview.aiAnalysisStatus === 'not_configured'
            ? activeReview.aiAnalysisMessage || 'Not configured. Deterministic analysis status is shown separately.'
            : activeReview.aiAnalysisStatus === 'partial'
            ? activeReview.aiAnalysisMessage || 'Analysis completed with some findings withheld by evidence validation.'
            : 'Status unavailable for this earlier review. Finding and decision records remain available.'}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRerunAnalysis}
          disabled={isRerunningAnalysis}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-[#2457D6]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#2457D6] shadow-xs transition-colors hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
        >
          {isRerunningAnalysis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          {isRerunningAnalysis ? 'Re-running…' : 'Re-run Analysis'}
        </button>
      </div>
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
      <div className="flex-1 flex flex-col md:flex-row overflow-visible md:overflow-hidden">
        {/* LEFT PANEL: Document Workspace (56% width) */}
        <div className="w-full md:w-[56%] min-h-[55vh] md:min-h-0 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-white overflow-hidden">
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
            <div className="max-w-2xl mx-auto space-y-4">
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
                      <strong>{unresolvedCount} finding(s) unresolved:</strong> Every finding requires an explicit human decision (accept, edit, or reject) before final sign-off.
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
                  onClick={() => handleFinalDecision('approved_with_changes')}
                  disabled={isCompleting || unresolvedCount > 0}
                  title={unresolvedCount > 0 ? 'Resolve all findings before final approval' : 'Approve with Changes'}
                  className={`px-3 py-1.5 text-white font-medium text-xs rounded-lg flex items-center gap-1 whitespace-nowrap shadow-xs transition-colors ${
                    unresolvedCount > 0
                      ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                      : 'bg-emerald-700 hover:bg-emerald-800 cursor-pointer'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve w/ Changes</span>
                </button>

                <button
                  onClick={() => handleFinalDecision('approved_as_is')}
                  disabled={isCompleting || unresolvedCount > 0}
                  title={unresolvedCount > 0 ? 'Resolve all findings before final approval' : 'Approve As-Is'}
                  className={`px-3 py-1.5 text-white font-medium text-xs rounded-lg flex items-center gap-1 whitespace-nowrap shadow-xs transition-colors ${
                    unresolvedCount > 0
                      ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                      : 'bg-slate-800 hover:bg-slate-900 cursor-pointer'
                  }`}
                >
                  <span>Approve As-Is</span>
                </button>

                <button
                  onClick={() => handleFinalDecision('rejected')}
                  disabled={isCompleting || unresolvedCount > 0}
                  title={unresolvedCount > 0 ? 'Resolve all findings before rejecting review' : 'Reject Review'}
                  className={`px-3 py-1.5 text-white font-medium text-xs rounded-lg flex items-center gap-1 whitespace-nowrap shadow-xs transition-colors ${
                    unresolvedCount > 0
                      ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                      : 'bg-rose-700 hover:bg-rose-800 cursor-pointer'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Findings List & Evidence Actions (44% width) */}
        <div className="w-full md:w-[44%] min-h-[55vh] md:min-h-0 flex flex-col bg-slate-50/50 overflow-hidden">
          {/* Findings Filter Bar */}
          <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Filter className="w-3.5 h-3.5 text-[#2457D6]" />
              <span>Evidence Filter:</span>
            </div>
            <div className="flex items-center gap-1">
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
                const isPending = suggestionStatus === 'pending';
                
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
const hasValidOccurrence =
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
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${catMeta.pinColor}`}>
                          PIN {pinNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <CatIcon className="w-3.5 h-3.5 text-[#2457D6]" />
                          <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                            {catMeta.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getSeverityStyle(finding.severity)}`}>
                          {finding.severity.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {finding.detectionMethod === 'deterministic_rule' ? 'RULE' : 'GEMINI'}
                        </span>
                        {finding.analysisRunId && finding.analysisRunId === activeReview.lastAnalysisRunId && (
                          <span className="text-[10px] rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">NEW THIS RERUN</span>
                        )}
                      </div>
                    </div>

                    {/* Finding Title */}
                    <h3 className="font-bold text-xs text-slate-900 mb-1">
                      {finding.title}
                    </h3>

                    {/* Flagged Exact Text Box */}
                    <div className="my-2 p-2 bg-rose-50/70 rounded-lg border border-rose-200 text-xs font-mono text-rose-900">
                      &ldquo;{finding.exactText}&rdquo;
                    </div>


{finding.suggestion && (
  <div className="mt-2 mb-3">
    {occurrenceMatches.length === 0 ? (
      <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
        The exact flagged text is no longer present in the current draft.
        Rerun the analysis before applying this suggestion.
      </p>
    ) : needsOccurrenceChoice ? (
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-amber-800">
          This text appears {occurrenceMatches.length} times. Choose which
          occurrence to change:
        </label>
        <select
          value={selectedOccurrence ?? ''}
          onChange={(e) =>
            setSelectedOccurrences(prev => ({
              ...prev,
              [finding.id]: Number(e.target.value),
            }))
          }
          onClick={(e) => e.stopPropagation()}
          className="w-full text-xs p-2 rounded-lg border border-amber-300 bg-amber-50 text-slate-800"
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
  </div>
)}


                    {/* Detailed Explanation */}
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {finding.explanation}
                    </p>

                    {/* Grounding Source Reference Block */}
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1 mb-3">
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span>Grounded Standard:</span>
                        <span className="font-mono text-[10px] text-[#2457D6]">
                          Confidence: {finding.confidence.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-700 font-medium">
                        {finding.sourceRuleOrTerm}
                      </div>
                      <div className="text-slate-400 text-[10px] font-mono">
                        Ref: {finding.sourceReference}
                      </div>
                      {finding.evidenceQuote && (
                        <blockquote className="mt-2 border-l-2 border-[#2457D6]/40 pl-2 text-slate-700">
                          Approved evidence: “{finding.evidenceQuote}”
                        </blockquote>
                      )}
                    </div>

                    
<div className="pt-3 border-t border-slate-100 space-y-2">
  <div className="flex items-center justify-between gap-2 text-xs">
    <span className="font-semibold text-slate-800">Finding decision</span>
    {finding.findingDecision && (
      <span className={`rounded-full px-2 py-0.5 font-medium ${
        finding.findingDecision === 'accepted'
          ? 'bg-emerald-100 text-emerald-800'
          : finding.findingDecision === 'dismissed'
            ? 'bg-slate-100 text-slate-700'
            : 'bg-amber-100 text-amber-800'
      }`}>
        {finding.findingDecision === 'accepted'
          ? 'Accepted'
          : finding.findingDecision === 'dismissed'
            ? 'Dismissed'
            : 'Verification Requested'}
      </span>
    )}
  </div>

  {finding.findingDecisionReviewer && (
    <p className="text-[10px] text-slate-500">
      Recorded by {finding.findingDecisionReviewer}
      {finding.findingDecisionAt
        ? ` · ${new Date(finding.findingDecisionAt).toLocaleString()}`
        : ''}
    </p>
  )}

  {finding.findingDecisionNote && (
    <p className="text-[11px] text-slate-600">
      Reviewer note: {finding.findingDecisionNote}
    </p>
  )}

  {!isCompleted && (
    <>
      <input
        aria-label={`Optional note for ${finding.title}`}
        value={findingDecisionNotes[finding.id] || ''}
        onChange={e => setNoteForFinding(finding.id, e.target.value)}
        placeholder="Optional reviewer note"
        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200"
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleFindingDecision(finding.id, 'accepted')}
          disabled={finding.findingDecision === 'accepted'}
          className="px-2.5 py-1 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {finding.findingDecision === 'accepted' ? '✓ Finding Accepted' : 'Accept Finding'}
        </button>

        <button
          onClick={() => handleFindingDecision(finding.id, 'dismissed')}
          disabled={finding.findingDecision === 'dismissed'}
          className="px-2.5 py-1 text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {finding.findingDecision === 'dismissed' ? '✓ Finding Dismissed' : 'Dismiss Finding'}
        </button>

        <button
          onClick={() => handleFindingDecision(finding.id, 'verification_required')}
          disabled={finding.findingDecision === 'verification_required'}
          className="px-2.5 py-1 text-xs font-medium border border-amber-200 hover:bg-amber-50 text-amber-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {finding.findingDecision === 'verification_required'
            ? '✓ Verification Requested'
            : 'Mark for Verification'}
        </button>
      </div>
    </>
  )}
</div>


                    {/* Intent-Preserving Suggestion & Decision Controls */}
                    {finding.suggestion && (
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-[#2457D6]" />
                            Suggested Intent-Preserving Correction
                          </span>
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
                        </div>

                        {/* Inline Custom Edit Mode */}
                        {editingFindingId === finding.id ? (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={customEditText}
                              onChange={(e) => setCustomEditText(e.target.value)}
                              className="w-full text-xs p-2 rounded-lg border border-[#2457D6] focus:outline-none"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => setEditingFindingId(null)}
                                className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
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
                                className="px-3 py-1 bg-[#2457D6] text-white text-xs rounded font-medium cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Save Custom Revision
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 text-xs font-mono text-emerald-950">
                              {suggestionStatus === 'edited'
                                ? finding.suggestion.customEditedText
                                : finding.suggestion.suggestedText}
                            </div>

                           
<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
      Why this correction?
    </p>
    <p className="text-xs leading-relaxed text-slate-700">
      {finding.suggestion.rationale}
    </p>
  </div>

  {finding.suggestion.authorIntentPreserved && (
    <div className="pt-2 border-t border-slate-200">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
        Original author intent
      </p>
      <p className="text-xs leading-relaxed text-slate-700">
        {finding.suggestion.authorIntentPreserved}
      </p>
    </div>
  )}
</div>

                          </>
                        )}

                        {/* Action Buttons: Only active if review is not already completed */}
                        {!isCompleted && editingFindingId !== finding.id && (
                          <div className="flex items-center gap-2 pt-1">
                            
{suggestionStatus === 'accepted' ? (
  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded flex items-center gap-1">
    <Check className="w-3 h-3" />
    Change Applied
  </span>
) : suggestionStatus === 'edited' ? (
  <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded flex items-center gap-1">
    <Check className="w-3 h-3" />
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
    className="px-2.5 py-1 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded flex items-center gap-1 transition-colors shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <Check className="w-3 h-3" />
    <span>Accept Change</span>
  </button>
)}


                            <button
                              onClick={() => {
                                setEditingFindingId(finding.id);
                                setCustomEditText(finding.suggestion?.suggestedText || '');
                              }}
                              className="px-2.5 py-1 text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 rounded flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3 text-slate-400" />
                              <span>Edit</span>
                            </button>

                            {suggestionStatus !== 'rejected' && (
                              <button
                                onClick={() => handleSuggestionAction(finding.id, 'reject')}
                                className="px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            )}

                            {suggestionStatus !== 'pending' && (
                              <button
                                onClick={() => handleSuggestionAction(finding.id, 'reset')}
                                title="Revert to pending decision"
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
