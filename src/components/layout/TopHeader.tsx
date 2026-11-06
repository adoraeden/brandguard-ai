import React from 'react';
import { Plus, Shield, AlertTriangle } from 'lucide-react';
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
  const getTabLabel = () => {
    switch (currentTab) {
      case 'overview':
        return 'Command Centre';
      case 'review_studio':
        return documentTitle ? `Review Studio · ${documentTitle}` : 'Review Studio';
      case 'brand_intelligence':
        return 'Brand Intelligence';
      case 'decision_archive':
        return 'Decision Ledger';
      case 'governance_insights':
        return 'Governance Insights';
      default:
        return 'Command Centre';
    }
  };

  return (
    <header className="h-12 bg-white border-b border-slate-200 px-5 flex items-center justify-between gap-4 shrink-0">
      {/* Contextual Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
        <span className="font-semibold text-slate-900 shrink-0">BrandGuard</span>
        <span className="text-slate-300">/</span>
        <span className="font-medium text-slate-700 truncate">{getTabLabel()}</span>
        {activeFindingsCount !== undefined && activeFindingsCount > 0 && (
          <>
            <span className="text-slate-300">/</span>
            <span className="text-rose-700 font-mono text-[11px] font-medium flex items-center gap-1 shrink-0 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              {activeFindingsCount} unresolved
            </span>
          </>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onNewReviewClick}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2457D6] hover:bg-[#1E40AF] transition-colors rounded flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Content Review</span>
        </button>
      </div>
    </header>
  );
};
