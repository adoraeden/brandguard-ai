import React from 'react';
import { 
  ShieldCheck, 
  FileText, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowRight,
  Play, 
  CheckCircle2, 
  Clock, 
  Check, 
  XCircle,
  Activity,
  Target,
  Sparkles,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { SAMPLE_DOCUMENTS } from '../../data/mockData';

interface OverviewViewProps {
  overviewData: any;
  onStartReview: () => void;
  onOpenSampleDraft: (sample: typeof SAMPLE_DOCUMENTS[0]) => void;
  onSelectReview: (reviewId: string) => void;
  onNavigateToPending?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  overviewData,
  onStartReview,
  onOpenSampleDraft,
  onSelectReview,
  onNavigateToPending,
}) => {
  const counts = overviewData?.counts || {
    rules: 6,
    terminology: 6,
    facts: 4,
    reviewedDocuments: 2,
    unresolvedFindings: 0,
    totalFindings: 5,
  };

  const recentReviews = overviewData?.recentReviews || [];

  // Calculate actual Brand Integrity from real review records
  const totalFindings = counts.totalFindings || 0;
  const unresolvedFindings = counts.unresolvedFindings || 0;
  const resolvedFindings = Math.max(0, totalFindings - unresolvedFindings);
  const integrityScore = totalFindings > 0 
    ? Math.round((resolvedFindings / totalFindings) * 100) 
    : 100;

  // Calculate review decision breakdown from actual reviews
  const approvedCount = recentReviews.filter((r: any) => 
    r.decisionStatus === 'approved_with_changes' || r.decisionStatus === 'approved_as_is'
  ).length;
  const pendingCount = recentReviews.filter((r: any) => 
    !r.decisionStatus || r.decisionStatus === 'pending'
  ).length;
  const rejectedCount = recentReviews.filter((r: any) => 
    r.decisionStatus === 'rejected'
  ).length;

  const pendingReviews = overviewData?.pendingReviews || recentReviews.filter((r: any) => 
    !r.decisionStatus || r.decisionStatus === 'pending'
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* 1. Compact Governance Status Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#2457D6] uppercase tracking-wider font-mono">
              Workspace Overview
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-medium">AuraCloud Technologies</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Brand Governance Command Centre
          </h1>
          <p className="text-xs text-slate-500">
            Real-time compliance monitoring across brand guidelines, terminology rules, and factsheets.
          </p>
        </div>

        {/* Compact Key Stats & Action */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
            <div className="text-center px-2">
              <div className="font-mono font-bold text-slate-900">{counts.reviewedDocuments}</div>
              <div className="text-[10px] text-slate-400 uppercase">Audits</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-center px-2">
              <div className="font-mono font-bold text-[#2457D6]">{integrityScore}%</div>
              <div className="text-[10px] text-slate-400 uppercase">Integrity</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div 
              onClick={onNavigateToPending}
              className={`text-center px-2 ${onNavigateToPending ? 'cursor-pointer hover:bg-slate-100 rounded transition-colors' : ''}`}
              title="View Pending Reviews Queue"
            >
              <div className={`font-mono font-bold ${unresolvedFindings > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {pendingReviews.length}
              </div>
              <div className="text-[10px] text-slate-400 uppercase">Pending</div>
            </div>
          </div>

          <button
            onClick={onStartReview}
            className="px-3.5 py-2 bg-[#2457D6] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Review</span>
          </button>
        </div>
      </div>

      {/* Prominent Pending Human Reviews Queue Banner & Shortcut */}
      {pendingReviews.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-200">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <Clock className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Human Review Action Queue
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold border border-amber-300">
                    {pendingReviews.length} pending · {unresolvedFindings} unresolved pins
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 mt-0.5">
                  Submissions require human sign-off on policy findings before content can be approved for publication.
                </p>
              </div>
            </div>

            {onNavigateToPending && (
              <button
                onClick={onNavigateToPending}
                className="text-xs text-amber-900 hover:text-amber-950 font-semibold flex items-center gap-1 self-start sm:self-center cursor-pointer underline underline-offset-2 shrink-0"
              >
                <span>Open Full Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Compact pending reviews grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingReviews.map((rev: any) => (
              <div
                key={rev.id}
                className="bg-white rounded-lg border border-amber-200/90 p-3 hover:border-amber-400 hover:shadow-xs transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#2457D6] font-semibold">{rev.id}</span>
                    <span className="text-slate-300">·</span>
                    <span className="capitalize text-[11px] text-slate-500">{rev.contentType?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {rev.title}
                  </div>
                  <div className="text-[10px] text-amber-800 font-mono flex items-center gap-2">
                    <span className="font-semibold">{rev.unresolvedFindings ?? 0} unresolved pins</span>
                    <span>·</span>
                    <span className="text-slate-500">Reviewer: {rev.reviewer}</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectReview(rev.id)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Main Dashboard Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Review Activity & Recent Reviews */}
        <div className="lg:col-span-7 space-y-5">
          {/* Review Activity Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#2457D6]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Review Activity & Verdict Status
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {recentReviews.length} total review sessions
              </span>
            </div>

            {/* Visual Progress Stack */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-600 h-full transition-all duration-500" 
                  style={{ width: `${recentReviews.length > 0 ? (approvedCount / recentReviews.length) * 100 : 0}%` }}
                  title={`Approved: ${approvedCount}`}
                />
                <div 
                  className="bg-amber-500 h-full transition-all duration-500" 
                  style={{ width: `${recentReviews.length > 0 ? (pendingCount / recentReviews.length) * 100 : 0}%` }}
                  title={`Pending: ${pendingCount}`}
                />
                <div 
                  className="bg-rose-500 h-full transition-all duration-500" 
                  style={{ width: `${recentReviews.length > 0 ? (rejectedCount / recentReviews.length) * 100 : 0}%` }}
                  title={`Rejected: ${rejectedCount}`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  {approvedCount} Approved
                </span>
                <span className="flex items-center gap-1.5 text-amber-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {pendingCount} Pending Action
                </span>
                <span className="flex items-center gap-1.5 text-rose-800">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {rejectedCount} Rejected
                </span>
              </div>
            </div>
          </div>

          {/* Recent Reviews Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Recent Reviews
              </h2>
              <button
                onClick={onStartReview}
                className="text-xs text-[#2457D6] hover:text-[#1D4ED8] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>New Review</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {recentReviews.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  No review records found. Launch your first review above.
                </div>
              ) : (
                recentReviews.map((rev: any) => (
                  <div
                    key={rev.id}
                    onClick={() => onSelectReview(rev.id)}
                    className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="space-y-0.5 min-w-0 pr-4">
                      <div className="font-semibold text-slate-900 truncate group-hover:text-[#2457D6] transition-colors">
                        {rev.title}
                      </div>
                      <div className="text-slate-500 flex items-center gap-2 text-[11px]">
                        <span className="font-mono text-[#2457D6] font-medium">{rev.id}</span>
                        <span>·</span>
                        <span className="capitalize">{rev.contentType?.replace(/_/g, ' ')}</span>
                        <span>·</span>
                        <span>{rev.reviewer}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full border ${
                        rev.decisionStatus === 'approved_with_changes'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : rev.decisionStatus === 'approved_as_is'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : rev.decisionStatus === 'rejected'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {rev.decisionStatus ? rev.decisionStatus.replace(/_/g, ' ').toUpperCase() : 'PENDING'}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        {rev.findingsCount} findings
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Severity Distribution & Quick Test Draft Launcher */}
        <div className="lg:col-span-5 space-y-5">
          {/* Finding Severity Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
                <BarChart3 className="w-4 h-4 text-[#2457D6]" />
                <span>Finding Severity Distribution</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {totalFindings} findings audited
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium text-rose-700">Critical (Exact Rule Violations)</span>
                  <span className="font-mono font-semibold text-slate-800">2</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: '40%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium text-amber-700">High (Contextual Inconsistencies)</span>
                  <span className="font-mono font-semibold text-slate-800">2</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '40%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium text-blue-700">Medium (Factsheet Mismatches)</span>
                  <span className="font-mono font-semibold text-slate-800">1</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '20%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Outstanding Actions or Ready Status */}
          {unresolvedFindings > 0 ? (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-900">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Outstanding Reviewer Action Required</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {unresolvedFindings} findings require human verification and sign-off before content can be published.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All Governance Findings Resolved</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Every audited finding in active documents has been reviewed and signed off by authorized personnel.
              </p>
            </div>
          )}

          {/* Test Scenarios Quick Launcher */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2457D6]" />
              <span>Test Scenarios (AuraCloud Demo)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Quickly load realistic drafts with intentional policy and fact errors to evaluate the hybrid scanner:
            </p>

            <div className="space-y-2">
              {SAMPLE_DOCUMENTS.map((doc, idx) => (
                <button
                  key={idx}
                  onClick={() => onOpenSampleDraft(doc)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-[#2457D6] hover:bg-blue-50/40 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 group-hover:text-[#2457D6] truncate">
                      {doc.title}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2457D6] shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono capitalize mt-0.5">
                    {doc.contentType.replace(/_/g, ' ')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
