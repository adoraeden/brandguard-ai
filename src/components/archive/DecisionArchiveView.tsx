import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink,
  X,
  FileCheck,
  Check,
  Sparkles,
  SplitSquareVertical,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  History,
  ArrowRight
} from 'lucide-react';
import { ReviewDocument, DecisionStatus } from '../../types';

interface DecisionArchiveViewProps {
  reviews: ReviewDocument[];
  onOpenReview: (review: ReviewDocument) => void;
}

export const DecisionArchiveView: React.FC<DecisionArchiveViewProps> = ({
  reviews,
  onOpenReview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDecision, setFilterDecision] = useState<string>('all');
  const [inspectReview, setInspectReview] = useState<ReviewDocument | null>(null);
  const [modalDiffMode, setModalDiffMode] = useState<'current' | 'original'>('current');
  const [notice, setNotice] = useState<string | null>(null);

  const pendingCount = reviews.filter(r => ['pending', 'partially_approved'].includes(r.decisionStatus)).length;
  const approvedWithChangesCount = reviews.filter(r => r.decisionStatus === 'approved_with_changes').length;
  const approvedAsIsCount = reviews.filter(r => r.decisionStatus === 'approved_as_is').length;
  const rejectedCount = reviews.filter(r => r.decisionStatus === 'rejected').length;

  const filteredReviews = reviews.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      r.title.toLowerCase().includes(q) ||
      r.reviewer.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      r.contentType.toLowerCase().includes(q);

    const matchesDecision = filterDecision === 'all' ||
      (filterDecision === 'pending' && ['pending', 'partially_approved'].includes(r.decisionStatus)) ||
      r.decisionStatus === filterDecision;

    return matchesSearch && matchesDecision;
  });

  // Consistent decision color system (Requirement 13)
  const getStatusBadge = (status: DecisionStatus) => {
    switch (status) {
      case 'approved_with_changes':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
            Approved w/ Changes
          </span>
        );
      case 'approved_as_is':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
            Approved As-Is
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
            Rejected
          </span>
        );
      case 'partially_approved':
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            Pending Action
          </span>
        );
    }
  };

  return (
    <div className="h-full min-h-0 p-6 max-w-7xl mx-auto flex flex-col gap-5">
      {/* Title & Concise Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Decision Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit record of marketing reviews and recorded human governance decisions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200 text-xs font-mono text-slate-600">
            <span className="font-semibold text-slate-900">{reviews.length}</span> total reviews
          </div>
          {pendingCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-mono text-amber-800 font-semibold">
              {pendingCount} active reviews awaiting remaining decisions
            </div>
          )}
        </div>
      </div>
      {notice && <div role="status" className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex justify-between">{notice}<button onClick={() => setNotice(null)} aria-label="Dismiss notification">×</button></div>}

      {/* Top Toolbar: Search & Clean Status Filter Tabs with Counts (Requirement 13) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-50 rounded-lg border border-slate-100">
          {[
            { id: 'all', label: 'All Reviews', count: reviews.length, activeColor: 'text-[#2457D6]' },
            { id: 'pending', label: 'Pending', count: reviews.filter(r => r.decisionStatus === 'pending').length, activeColor: 'text-amber-800 font-bold', highlight: pendingCount > 0 },
            { id: 'approved_with_changes', label: 'Approved w/ Changes', count: approvedWithChangesCount, activeColor: 'text-emerald-700' },
            { id: 'approved_as_is', label: 'Approved As-Is', count: approvedAsIsCount, activeColor: 'text-teal-800' },
            { id: 'rejected', label: 'Rejected', count: rejectedCount, activeColor: 'text-rose-700' },
          ].map(tab => {
            const isActive = filterDecision === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterDecision(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? `bg-white ${tab.activeColor} shadow-xs font-semibold`
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  tab.highlight ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, title, or reviewer..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:border-[#2457D6] focus:ring-1 focus:ring-[#2457D6] focus:outline-none bg-slate-50/50"
          />
        </div>
      </div>

      {/* Clean Audit Table with Exact Columns */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto workspace-scrollbar">
          <table className="app-table min-w-[960px] w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Document / Review Title</th>
                <th className="py-3 px-4">Review ID</th>
                <th className="py-3 px-4">Content Type</th>
                <th className="py-3 px-4">Reviewer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Decision Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No decision records matched your query.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((r) => {
                  const isPending = ['pending', 'partially_approved'].includes(r.decisionStatus);
                  return (
                    <tr 
                      key={r.id} 
                      className={`hover:bg-slate-50/70 transition-colors group cursor-pointer ${
                        isPending ? 'bg-amber-50/20' : ''
                      }`}
                      onClick={() => setInspectReview(r)}
                    >
                      {/* 1. Document / Review Title */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-[#2457D6] transition-colors max-w-xs truncate">
                        {r.title}
                      </td>

                      {/* 2. Review ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#2457D6] font-medium whitespace-nowrap">
                        {r.id}
                      </td>

                      {/* 3. Content Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="capitalize text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {r.contentType.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* 4. Reviewer */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {r.reviewer}
                      </td>

                      {/* 5. Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {r.decidedAt ? r.decidedAt.split('T')[0] : r.createdAt.split('T')[0]}
                      </td>

                      {/* 6. Decision Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(r.decisionStatus)}
                      </td>

                      {/* 7. Actions: Prominent Continue Review for Pending (Requirement 13) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setInspectReview(r)}
                            className="px-2.5 py-1 text-xs border border-slate-200 hover:bg-slate-100 rounded text-slate-700 font-medium transition-colors cursor-pointer"
                          >
                            View Details
                          </button>
                          
                          {isPending ? (
                            <button
                              onClick={() => onOpenReview(r)}
                              className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <span>Continue Review</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenReview(r)}
                              className="px-2.5 py-1 text-xs bg-[#2457D6] hover:bg-[#1D4ED8] text-white rounded font-medium transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <span>Audit View</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Inspection Modal */}
      {inspectReview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="modal-content bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[#2457D6]">{inspectReview.id}</span>
                  <span className="text-slate-300">·</span>
                  <span className="capitalize text-xs text-slate-600">{inspectReview.contentType.replace(/_/g, ' ')}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-400 font-mono">
                    {inspectReview.decidedAt ? new Date(inspectReview.decidedAt).toLocaleString() : new Date(inspectReview.createdAt).toLocaleString()}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {inspectReview.title}
                </h2>
              </div>
              <button 
                onClick={() => setInspectReview(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Decision Verdict Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Decision Verdict</div>
                  <div className="mt-1">{getStatusBadge(inspectReview.decisionStatus)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Selected Demo Reviewer</div>
                  <div className="font-medium text-slate-900 mt-1 truncate">{inspectReview.reviewer}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Total Findings</div>
                  <div className="font-mono font-bold text-slate-900 mt-1">{inspectReview.summary?.totalFindings || inspectReview.findings.length}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Accepted Revisions</div>
                  <div className="font-mono font-bold text-emerald-700 mt-1">{inspectReview.summary?.acceptedSuggestions || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Gemini Context</div>
                  <div className="font-semibold text-slate-800 mt-1 capitalize">{inspectReview.aiAnalysisStatus?.replace(/_/g, ' ') || 'status unavailable'}</div>
                </div>
              </div>

              {/* Reviewer Sign-Off Note */}
              {inspectReview.decisionNotes && (
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-amber-900">
                  <div className="font-semibold text-xs mb-0.5">Reviewer Audit Sign-off Note:</div>
                  <p className="text-xs leading-relaxed italic">&ldquo;{inspectReview.decisionNotes}&rdquo;</p>
                </div>
              )}

              {/* Document Content with Toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-700">
                    Draft Content Comparison
                  </h3>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setModalDiffMode('current')}
                      className={`px-2.5 py-1 text-[11px] rounded font-medium cursor-pointer transition-all ${
                        modalDiffMode === 'current'
                          ? 'bg-white text-[#2457D6] shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Revised Draft (Active)
                    </button>
                    <button
                      onClick={() => setModalDiffMode('original')}
                      className={`px-2.5 py-1 text-[11px] rounded font-medium cursor-pointer transition-all ${
                        modalDiffMode === 'original'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Original Submitted Draft
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 text-slate-800 text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-sans">
                  {modalDiffMode === 'current' ? inspectReview.currentContent : inspectReview.originalContent}
                </div>
              </div>

              {/* Findings Audit List */}
              <div>
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-700 mb-2.5">
                  Audit Findings & Decision Actions ({inspectReview.findings.length})
                </h3>
                <div className="space-y-3">
                  {inspectReview.findings.map((f) => (
                    <div key={f.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900">{f.title}</div>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {f.category.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-rose-800 bg-rose-50/70 p-2 rounded-lg border border-rose-200">
                        &ldquo;{f.exactText}&rdquo;
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed">{f.explanation}</p>
                      {f.suggestion && (
                        <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 text-[11px] text-emerald-950 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-emerald-800">Action: </span>
                            <span className="font-mono font-bold uppercase text-emerald-700">[{f.suggestion.status}]</span> &ldquo;{f.suggestion.status === 'edited' ? f.suggestion.customEditedText : f.suggestion.suggestedText}&rdquo;
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex justify-end gap-2.5 bg-slate-50">
              <button
                onClick={() => setInspectReview(null)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-white cursor-pointer transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const doc = inspectReview;
                  setInspectReview(null);
                  onOpenReview(doc);
                }}
                className={`px-4 py-1.5 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
                  inspectReview.decisionStatus === 'pending'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#2457D6] hover:bg-[#1D4ED8]'
                }`}
              >
                <span>{inspectReview.decisionStatus === 'pending' ? 'Continue Review' : 'Open in Studio'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
