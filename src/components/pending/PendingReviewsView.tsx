import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  ArrowRight, 
  AlertTriangle, 
  FileText, 
  Play, 
  CheckCircle2, 
  ChevronRight,
  Filter,
  ShieldAlert
} from 'lucide-react';
import { ReviewDocument } from '../../types';

interface PendingReviewsViewProps {
  reviews: ReviewDocument[];
  onOpenReview: (review: ReviewDocument) => void;
  onStartNewReview: () => void;
}

export const PendingReviewsView: React.FC<PendingReviewsViewProps> = ({
  reviews,
  onOpenReview,
  onStartNewReview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contentFilter, setContentFilter] = useState('all');

  // Includes new reviews and saved partial approvals with unresolved findings.
  const pendingReviews = reviews.filter(r =>
    ['pending', 'partially_approved'].includes(r.decisionStatus)
  );

  const filteredPending = pendingReviews.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      r.reviewer.toLowerCase().includes(q) ||
      r.contentType.toLowerCase().includes(q)
    ) && (contentFilter === 'all' || r.contentType === contentFilter);
  });

  const totalUnresolvedAcrossPending = pendingReviews.reduce(
    (sum, r) => sum + (r.summary?.unresolvedFindings || 0), 
    0
  );

  return (
    <div className="page-content mx-auto w-full max-w-[1440px] space-y-6 p-5 md:p-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 lg:p-7 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Human Review Queue</span>
          </div>
          <h1 className="text-2xl lg:text-[28px] font-bold text-slate-950 tracking-tight">
            Pending Communication Reviews
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Reviews awaiting decisions, including saved partial approvals. Unresolved findings remain available for the reviewer to continue.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-xs">
            <div className="text-center px-2">
              <div className="font-mono font-bold text-amber-900">{pendingReviews.length}</div>
              <div className="text-[10px] text-amber-700 uppercase">Pending Audits</div>
            </div>
            <div className="h-6 w-px bg-amber-200" />
            <div className="text-center px-2">
              <div className="font-mono font-bold text-amber-900">{totalUnresolvedAcrossPending}</div>
              <div className="text-[10px] text-amber-700 uppercase">Unresolved Pins</div>
            </div>
          </div>

          <button
            onClick={onStartNewReview}
            className="px-3.5 py-2 bg-[#2457D6] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>New Submission</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">Filter Queue:</span>
          <span className="font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
            {pendingReviews.length} Active in Queue
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
        <select aria-label="Filter pending reviews by content type" value={contentFilter} onChange={event => setContentFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
          <option value="all">All content types</option>
          {Array.from(new Set(pendingReviews.map(review => review.contentType))).map(type => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
        </select>
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, ID, or reviewer..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:border-[#2457D6] focus:ring-1 focus:ring-[#2457D6] focus:outline-none bg-slate-50/50"
          />
        </div>
        </div>
      </div>

      {/* Responsive review cards for laptop, tablet and mobile widths */}
      <div className="grid grid-cols-1 gap-3 xl:hidden">
        {filteredPending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">Your review queue is clear</h2>
            <p className="mt-1 text-sm text-slate-500">No pending reviews match the current filters.</p>
          </div>
        ) : filteredPending.map((review) => {
          const unresolved = review.summary?.unresolvedFindings ?? review.findings.filter(f => !f.suggestion || f.suggestion.status === 'pending').length;
          return (
            <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold leading-5 text-slate-900">{review.title}</h2>
                  <p className="mt-1 truncate font-mono text-[11px] text-blue-700">{review.id}</p>
                </div>
                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                  {review.decisionStatus === 'partially_approved' ? 'In progress' : 'Awaiting review'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                <div><span className="block text-slate-400">Content type</span><span className="mt-1 block font-medium capitalize text-slate-700">{review.contentType.replace(/_/g, ' ')}</span></div>
                <div><span className="block text-slate-400">Assigned reviewer</span><span className="mt-1 block font-medium text-slate-700">{review.reviewer || 'Unassigned'}</span></div>
                <div><span className="block text-slate-400">Last updated</span><span className="mt-1 block font-medium text-slate-700">{(review.updatedAt || review.createdAt).split('T')[0]}</span></div>
                <div><span className="block text-slate-400">Unresolved findings</span><span className={`mt-1 inline-flex rounded-full px-2 py-1 font-semibold ${unresolved > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{unresolved} open</span></div>
              </div>
              <button type="button" onClick={() => onOpenReview(review)} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                Continue review <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="app-table min-w-[960px] w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Review ID</th>
                <th className="py-3 px-4">Content Type</th>
                <th className="py-3 px-4">Assigned Reviewer</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4">Unresolved Findings</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPending.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <div className="font-bold text-slate-800">Review Queue Cleared</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      No pending reviews require human decision right now.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPending.map((r) => {
                  const unresolved = r.summary?.unresolvedFindings ?? r.findings.filter(f => !f.suggestion || f.suggestion.status === 'pending').length;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-amber-50/30 transition-colors group cursor-pointer"
                      onClick={() => onOpenReview(r)}
                    >
                      {/* Document Title */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-[#2457D6] transition-colors max-w-xs truncate">
                        {r.title}
                      </td>

                      {/* Review ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#2457D6] font-medium whitespace-nowrap">
                        {r.id}
                      </td>

                      {/* Content Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="capitalize text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {r.contentType.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Assigned Reviewer */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {r.reviewer}
                      </td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {r.updatedAt ? r.updatedAt.split('T')[0] : r.createdAt.split('T')[0]}
                      </td>

                      {/* Review Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          r.decisionStatus === 'partially_approved'
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}>
                          {r.decisionStatus === 'partially_approved' ? 'Pending · continue review' : 'Awaiting review'}
                        </span>
                      </td>

                      {/* Unresolved Findings */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
                          unresolved > 0 
                            ? 'bg-amber-50 text-amber-800 border-amber-300' 
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}>
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>{unresolved} unresolved / {r.findings.length} total</span>
                        </span>
                      </td>

                      {/* Action: Continue Review */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReview(r);
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <span>Continue Review</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
