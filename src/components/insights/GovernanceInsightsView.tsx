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
  onNavigateToIntelligence: () => void;
}

export const GovernanceInsightsView: React.FC<GovernanceInsightsViewProps> = ({
  insights,
  onNavigateToIntelligence,
}) => {
  if (!insights) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Calculating governance analytics from recorded reviews...
      </div>
    );
  }

  const {
    topViolatedTerms,
    findingsByCategory,
    severityDistribution,
    clarificationRecommendations,
  } = insights;

  const totalViolations = topViolatedTerms.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2457D6] mb-0.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Policy Analytics & Friction Patterns</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Governance Insights & Compliance Trends
          </h1>
          <p className="text-xs text-slate-500">
            Synthesized from {totalViolations} recorded review findings to highlight recurring brand ambiguity.
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

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Most Frequently Flagged Rules */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
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
                    style={{ width: `${Math.min(100, item.count * 30)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="uppercase">Category: {item.category.replace(/_/g, ' ')}</span>
                  <span className="text-[#0D9488]">High Friction</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Finding Category Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
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
        </div>
      </div>
    </div>
  );
};
