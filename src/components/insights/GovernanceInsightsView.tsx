import React from 'react';
import { 
  TrendingUp, 
  BookOpen, 
  Activity, 
  Target, 
  Lightbulb, 
  BarChart3,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { GovernanceInsights } from '../../types';

interface GovernanceInsightsViewProps {
  insights: GovernanceInsights | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onNavigateToIntelligence: () => void;
}

export const GovernanceInsightsView: React.FC<GovernanceInsightsViewProps> = ({
  insights,
  isLoading = false,
  error,
  onRetry,
  onNavigateToIntelligence,
}) => {
  if (isLoading && !insights) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Calculating governance analytics from recorded reviews...
      </div>
    );
  }
  if (error && !insights) return <div role="alert" className="m-6 rounded-xl border border-rose-200 bg-white p-8 text-center"><p className="text-sm font-semibold text-rose-800">Analytics unavailable</p><p className="mt-2 text-sm text-slate-600">{error}</p><button onClick={onRetry} className="mt-4 rounded-lg bg-[#2457D6] px-4 py-2 text-sm font-semibold text-white">Retry</button></div>;
  if (!insights) return <div className="p-12 text-center text-sm text-slate-500">No governance analytics are available yet.</div>;

  const {
    topViolatedTerms,
    findingsByCategory,
    severityDistribution,
    clarificationRecommendations,
  } = insights;

  const totalViolations = topViolatedTerms.reduce((sum, item) => sum + item.count, 0);
  const stats = insights.reviewStatistics;
  const maxTermCount = Math.max(1, ...topViolatedTerms.map(item => item.count));

  return (
    <div className="page-content mx-auto w-full max-w-[1440px] space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 lg:p-7 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2457D6] mb-0.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Policy Analytics & Friction Patterns</span>
          </div>
          <h1 className="text-2xl lg:text-[28px] font-bold text-slate-950 tracking-tight">
            Governance Insights & Compliance Trends
          </h1>
          <p className="text-xs text-slate-500">
            Based on {stats?.totalFindings ?? totalViolations} persisted findings across saved reviews.
          </p>
        </div>

        <button
          onClick={onNavigateToIntelligence}
          className="px-3.5 py-2 bg-[#2457D6] hover:bg-[#1D4ED8] text-white transition-all font-medium text-xs rounded-lg flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Update Brand Rules</span>
        </button>
      </div>

      {error && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">Refresh failed. Showing the last loaded analytics. {error}<button onClick={onRetry} className="ml-2 font-semibold underline">Retry</button></div>}

      {stats && <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[["Reviews", stats.total], ["Completed", stats.completed], ["Completion rate", `${stats.completionRate}%`], ["Awaiting decision", stats.pending], ["Unresolved findings", stats.unresolvedFindings]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold text-slate-900">{value}</div></div>)}
      </div>}

      {/* Evidence quality and decision accountability */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-bold text-slate-900">Evidence quality</h2><p className="mt-1 text-xs text-slate-500">How thoroughly recorded findings are linked to evidence.</p></div>
            <span className="rounded-lg bg-blue-50 px-3 py-2 text-lg font-bold text-[#2457D6]">{insights.evidenceCoverage?.assessmentRate ?? 0}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2457D6]" style={{ width: `${insights.evidenceCoverage?.assessmentRate ?? 0}%` }} /></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Supported", insights.evidenceCoverage?.supported ?? 0, "text-emerald-700"],
              ["Partial", insights.evidenceCoverage?.partiallySupported ?? 0, "text-amber-700"],
              ["Unsupported", insights.evidenceCoverage?.unsupported ?? 0, "text-rose-700"],
              ["Conflicting", insights.evidenceCoverage?.conflicting ?? 0, "text-rose-800"],
            ].map(([label, count, color]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><div className="text-[11px] text-slate-500">{label}</div><div className={`mt-1 text-xl font-bold ${color}`}>{count}</div></div>)}
          </div>
          <p className="text-[11px] text-slate-400">{insights.evidenceCoverage?.assessed ?? 0} of {insights.evidenceCoverage?.totalFindings ?? 0} findings have an evidence assessment. Assessment coverage is not the same as proof of a claim.</p>
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
          <div><h2 className="text-sm font-bold text-slate-900">Finding decision accountability</h2><p className="mt-1 text-xs text-slate-500">Human review outcomes recorded against individual findings.</p></div>
          <div className="space-y-3">
            {(insights.findingDecisionBreakdown || []).map(item => {
              const total = Math.max(1, insights.evidenceCoverage?.totalFindings ?? stats?.totalFindings ?? 0);
              const labels: Record<string, string> = { accepted: "Accepted", dismissed: "Dismissed", verification_required: "Verification required", pending: "No decision recorded" };
              const width = Math.min(100, item.count * 100 / total);
              return <div key={item.decision}><div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-700">{labels[item.decision] || item.decision}</span><span className="font-mono font-semibold text-slate-900">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0D9488]" style={{ width: `${width}%` }} /></div></div>;
            })}
            {!insights.findingDecisionBreakdown?.length && <p className="text-sm text-slate-500">No finding-level decisions have been recorded yet.</p>}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Unresolved finding trend</h2><p className="mt-1 text-xs text-slate-500">Share of findings still unresolved in each review month.</p></div><span className="text-[11px] text-slate-400">Last 6 months with activity</span></div>
        {(insights.unresolvedTrends || []).length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{insights.unresolvedTrends!.map(item => <div key={item.month} className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] font-medium text-slate-500">{item.month}</div><div className="mt-1 text-xl font-bold text-slate-900">{item.rate}%</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-amber-500" style={{ width: `${item.rate}%` }} /></div><div className="mt-2 text-[10px] text-slate-400">{item.unresolvedFindings ?? 0} / {item.totalFindings ?? 0} unresolved</div></div>)}</div> : <p className="py-4 text-sm text-slate-500">Trend data will appear once reviews contain findings.</p>}
      </section>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Most Frequently Flagged Rules */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#2457D6]" />
              <span>Most Frequently Flagged Rules & Terms</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Occurrences</span>
          </div>

          <div className="space-y-3 pt-1">
            {topViolatedTerms.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 truncate max-w-xs">
                    {item.term}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#2457D6]">
                    {item.count} hits
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#2457D6] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, (item.count / maxTermCount) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="uppercase">Category: {item.category.replace(/_/g, ' ')}</span>
                  <span>{item.count > 1 ? 'Repeated' : 'Single occurrence'}</span>
                </div>
              </div>
            ))}
            {topViolatedTerms.length === 0 && <p className="py-6 text-sm text-slate-500">No findings have been recorded in reviews yet.</p>}
          </div>
        </div>

        {/* 2. Finding Category Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Finding Category Distribution</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Proportion</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {findingsByCategory.map((cat, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800 capitalize">
                    {cat.category.replace(/_/g, ' ')}
                  </span>
                  <div className="font-mono text-xs text-slate-900 flex items-center gap-2">
                    <span className="font-semibold">{cat.count}</span>
                    <span className="text-slate-400">({cat.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      cat.category === 'exact_violation'
                        ? 'bg-rose-500'
                        : cat.category === 'direct_contradiction'
                        ? 'bg-rose-700'
                        : cat.category === 'contextual_inconsistency'
                        ? 'bg-amber-500'
                        : cat.category === 'unsupported_claim'
                        ? 'bg-[#2457D6]'
                        : 'bg-[#0D9488]'
                    }`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Severity Breakdown Bar */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            {severityDistribution.map((s, sIdx) => (
              <div key={sIdx} className="flex-1 p-2 bg-slate-50 rounded-lg text-center border border-slate-200">
                <div className="text-[10px] uppercase font-mono text-slate-400">{s.severity}</div>
                <div className="font-mono font-bold text-xs text-slate-900 mt-0.5">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><h2 className="text-sm font-bold text-slate-900">Repeated terminology flags</h2><p className="mb-3 mt-1 text-xs text-slate-500">Observed in saved review findings.</p>{(insights.repeatedTerminology || []).length ? <ul className="space-y-2">{insights.repeatedTerminology!.map((item, i) => <li key={`${item.term}-${i}`} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="break-words">{item.term}</span><span className="shrink-0 font-semibold text-[#2457D6]">{item.count}×</span></li>)}</ul> : <p className="py-5 text-sm text-slate-500">No repeated terminology flags recorded.</p>}</section>
        <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-bold text-slate-900">Guideline and factsheet mismatches</h2><p className="mb-3 mt-1 text-xs text-slate-500">Standards and audited evidence cited by matching findings.</p>{(insights.referenceMismatches || []).length ? <ul className="space-y-2">{insights.referenceMismatches!.map((item, i) => <li key={`${item.type}-${item.source}-${i}`} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="break-words"><span className="mr-2 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{item.type}</span>{item.source}</span><span className="shrink-0 font-semibold text-amber-700">{item.count}</span></li>)}</ul> : <p className="py-5 text-sm text-slate-500">No guideline or factsheet mismatches are recorded.</p>}</section>
      </div>

      {/* 3. Actionable Policy Recommendations */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2457D6]">
          <Lightbulb className="w-4 h-4 text-[#0D9488]" />
          <span>Actionable Policy Clarifications</span>
        </div>
        <p className="text-xs text-slate-500">
          Targeted revisions recommended based on recurring ambiguities identified during marketing reviews:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {clarificationRecommendations.map((rec, i) => (
            <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="w-6 h-6 rounded-md bg-[#2457D6] text-white font-mono font-bold text-xs flex items-center justify-center">
                0{i + 1}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {rec}
              </p>
            </div>
          ))}
          {clarificationRecommendations.length === 0 && <p className="md:col-span-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No policy clarification recommendations can be derived from the current findings.</p>}
        </div>
      </div>
    </div>
  );
};
