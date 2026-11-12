import React from 'react';
import {
  LayoutDashboard, Clock, FileSearch, BookOpen, ClipboardList,
  BarChart3, Building2, ShieldCheck
} from 'lucide-react';
import { DEMO_USERS, useDemoProfile } from '../../context/DemoProfileContext';

export type NavTab =
  | 'overview'
  | 'pending_reviews'
  | 'review_studio'
  | 'brand_intelligence'
  | 'decision_archive'
  | 'governance_insights';

interface NavigationRailProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unresolvedCount?: number;
  pendingReviewsCount?: number;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentTab,
  onSelectTab,
  unresolvedCount = 0,
  pendingReviewsCount = 0,
}) => {
  const { currentUser, selectDemoProfile } = useDemoProfile();

  const primaryNav = [
    { id: 'overview' as NavTab, label: 'Command Centre', icon: LayoutDashboard },
    { id: 'pending_reviews' as NavTab, label: 'Pending Reviews', icon: Clock, badge: pendingReviewsCount },
    { id: 'review_studio' as NavTab, label: 'Review Studio', icon: FileSearch, badge: unresolvedCount, suffix: 'open' },
  ];
  const secondaryNav = [
    { id: 'brand_intelligence' as NavTab, label: 'Brand Intelligence', icon: BookOpen },
    { id: 'decision_archive' as NavTab, label: 'Decision Ledger', icon: ClipboardList },
    { id: 'governance_insights' as NavTab, label: 'Governance Insights', icon: BarChart3 },
  ];

  const renderItem = (item: typeof primaryNav[number] | typeof secondaryNav[number]) => {
    const Icon = item.icon;
    const active = currentTab === item.id;
    const badge = 'badge' in item ? item.badge : undefined;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelectTab(item.id)}
        aria-current={active ? 'page' : undefined}
        aria-label={item.label}
        title={item.label}
        className={`group relative flex w-full min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          active
            ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 font-medium'
        }`}
      >
        {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-blue-600" />}
        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {typeof badge === 'number' && badge > 0 && (
          <span className={`min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums ${
            item.id === 'pending_reviews' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'
          }`}>{badge}</span>
        )}
      </button>
    );
  };

  return (
    <aside className="z-30 flex h-16 w-full shrink-0 flex-row items-center justify-between border-t border-slate-200 bg-white px-2 shadow-[0_-4px_16px_rgba(15,23,42,0.04)] md:h-screen md:w-[252px] md:flex-col md:items-stretch md:border-r md:border-t-0 md:px-0 md:shadow-[4px_0_24px_rgba(15,23,42,0.025)]">
      <div className="flex min-w-0 flex-1 items-center md:block md:flex-none">
        <div className="hidden border-b border-slate-100 px-6 pb-5 pt-6 md:block">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-tight text-slate-950">BrandGuard AI</div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">Brand governance workspace</div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="truncate">AuraCloud Tech</span>
            </span>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Demo</span>
          </div>
        </div>

        <nav aria-label="Main navigation" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 py-1 md:block md:space-y-7 md:px-4 md:py-6">
          <section className="flex min-w-0 items-center gap-1 md:block md:space-y-1.5">
            <div className="hidden px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 md:block">Workspace</div>
            {primaryNav.map(renderItem)}
          </section>
          <section className="hidden md:block md:space-y-1.5">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Governance</div>
            {secondaryNav.map(renderItem)}
          </section>
          <section className="flex items-center gap-1 md:hidden">
            {secondaryNav.map(renderItem)}
          </section>
        </nav>
      </div>

      <label className="hidden items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-4 md:flex">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700">{currentUser.avatarInitials}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800">{currentUser.name}</span>
          <span className="mt-0.5 block text-xs capitalize text-slate-500">{currentUser.title} · {currentUser.role}</span>
        </span>
        <select aria-label="Switch demo profile" value={currentUser.id} onChange={event => selectDemoProfile(event.target.value)} className="max-w-[104px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600">
          {DEMO_USERS.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
      </label>

      <label className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white md:hidden">
        <span className="sr-only">Switch demo profile</span>
        <select aria-label="Switch demo profile" value={currentUser.id} onChange={event => selectDemoProfile(event.target.value)} className="h-full w-full rounded-xl bg-transparent text-center text-[10px] font-semibold text-blue-700">
          {DEMO_USERS.map(user => <option key={user.id} value={user.id}>{user.avatarInitials}</option>)}
        </select>
      </label>
    </aside>
  );
};
