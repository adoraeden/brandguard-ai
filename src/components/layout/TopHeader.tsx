import React from 'react';
import { Plus, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import { NavTab } from './NavigationRail';

interface TopHeaderProps {
  currentTab: NavTab;
  onNewReviewClick: () => void;
  onRefreshClick: () => void;
  isRefreshing?: boolean;
  documentTitle?: string;
  activeFindingsCount?: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  onNewReviewClick,
  onRefreshClick,
  isRefreshing = false,
  documentTitle,
  activeFindingsCount,
}) => {
  const labels: Record<NavTab, string> = {
    overview: 'Command Centre',
    review_studio: 'Review Studio',
    pending_reviews: 'Pending Reviews',
    brand_intelligence: 'Brand Intelligence',
    evidence_ingestion: 'Evidence Ingestion',
    decision_archive: 'Decision Ledger',
    governance_insights: 'Governance Insights',
  };
  const pageLabel = labels[currentTab];

  return (
    <header className="z-20 flex min-h-[76px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-5 py-4 md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden font-semibold text-slate-400 sm:inline">BrandGuard</span>
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 sm:block" />
        <h1 className="truncate text-xl font-bold tracking-tight text-slate-950 md:text-2xl">{pageLabel}</h1>
        {currentTab === 'review_studio' && activeFindingsCount !== undefined && activeFindingsCount > 0 && (
          <span className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {activeFindingsCount} unresolved
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
      <button type="button" onClick={onRefreshClick} disabled={isRefreshing} aria-label="Refresh workspace data" title="Refresh workspace data" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-blue-700 disabled:cursor-wait disabled:opacity-60">
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
      <button
        type="button"
        onClick={onNewReviewClick}
        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/15 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New content review</span>
        <span className="sm:hidden">New review</span>
      </button>
      </div>
    </header>
  );
};
