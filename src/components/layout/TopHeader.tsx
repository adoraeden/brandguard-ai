import React from 'react';
import { Plus, AlertTriangle, ChevronRight } from 'lucide-react';
import { NavTab } from './NavigationRail';

interface TopHeaderProps {
  currentTab: NavTab;
  onNewReviewClick: () => void;
  documentTitle?: string;
  activeFindingsCount?: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  onNewReviewClick,
  documentTitle,
  activeFindingsCount,
}) => {
  const labels: Record<NavTab, string> = {
    overview: 'Command Centre',
    review_studio: 'Review Studio',
    pending_reviews: 'Pending Reviews',
    brand_intelligence: 'Brand Intelligence',
    decision_archive: 'Decision Ledger',
    governance_insights: 'Governance Insights',
  };
  const pageLabel = currentTab === 'review_studio' && documentTitle
    ? documentTitle
    : labels[currentTab];

  return (
    <header className="z-20 flex min-h-[68px] shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-5 py-3 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden font-semibold text-slate-400 sm:inline">BrandGuard</span>
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 sm:block" />
        <span className="truncate font-semibold text-slate-800">{pageLabel}</span>
        {currentTab === 'review_studio' && activeFindingsCount !== undefined && activeFindingsCount > 0 && (
          <span className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {activeFindingsCount} unresolved
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onNewReviewClick}
        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/15 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New content review</span>
        <span className="sm:hidden">New review</span>
      </button>
    </header>
  );
};
