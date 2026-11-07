import React from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  FileSearch, 
  BookOpen, 
  ClipboardList, 
  BarChart3, 
  Building2,
  Cpu,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  LogOut,
  Key
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
  const { currentUser, setShowAuthModal } = useAuth();

  const primaryNav = [
    {
      id: 'overview' as NavTab,
      label: 'Command Centre',
      icon: LayoutDashboard,
    },
    {
      id: 'pending_reviews' as NavTab,
      label: 'Pending Reviews',
      icon: Clock,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      id: 'review_studio' as NavTab,
      label: 'Review Studio',
      icon: FileSearch,
      badge: unresolvedCount > 0 ? `${unresolvedCount} pins` : undefined,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  ];

  const secondaryNav = [
    {
      id: 'brand_intelligence' as NavTab,
      label: 'Brand Intelligence',
      icon: BookOpen,
    },
    {
      id: 'decision_archive' as NavTab,
      label: 'Decision Ledger',
      icon: ClipboardList,
    },
    {
      id: 'governance_insights' as NavTab,
      label: 'Governance Insights',
      icon: BarChart3,
    },
  ];

  return (
    <aside className="w-full h-14 md:w-56 md:h-screen bg-white border-t md:border-t-0 md:border-r border-slate-200 flex flex-row md:flex-col justify-between shrink-0 select-none z-20">
      {/* Top Brand & Workspace Block */}
      <div className="min-w-0 flex-1 md:flex-none">
        {/* Brand Header */}
        <div className="hidden md:block px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#2457D6] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="font-semibold text-xs tracking-tight text-slate-900 leading-none">
                BrandGuard AI
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                Brand Governance
              </div>
            </div>
          </div>

          {/* Active Workspace Pill */}
          <div className="mt-3 px-2 py-1.5 rounded bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
              <Building2 className="w-3 h-3 text-[#2457D6] shrink-0" />
              <span className="truncate">AuraCloud Tech</span>
            </span>
            <span className="text-[9px] font-mono font-medium text-slate-500 bg-white border border-slate-200 px-1 rounded">
              Demo
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="h-full md:h-auto px-1 py-1 md:p-2.5 flex md:block gap-1 md:space-y-4 overflow-x-auto">
          {/* Workspace Group */}
          <div>
            <div className="hidden md:block px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </div>
            <div className="flex md:block gap-1 md:space-y-0.5">
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    aria-label={item.label}
                    title={item.label}
                    className={`w-11 h-11 md:w-full md:h-auto shrink-0 justify-center md:justify-between text-left flex items-center px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-[#2457D6] font-semibold border-l-2 border-[#2457D6]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#2457D6]' : 'text-slate-400'}`} />
                      <span className="hidden md:block truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`hidden md:inline text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold border ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Governance & Knowledge Group */}
          <div>
            <div className="hidden md:block px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Governance
            </div>
            <div className="flex md:block gap-1 md:space-y-0.5">
              {secondaryNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    aria-label={item.label}
                    title={item.label}
                    className={`w-11 h-11 md:w-full md:h-auto shrink-0 justify-center md:justify-between text-left flex items-center px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-[#2457D6] font-semibold border-l-2 border-[#2457D6]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#2457D6]' : 'text-slate-400'}`} />
                      <span className="hidden md:block truncate">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => setShowAuthModal(true)} className="md:hidden mx-1 h-11 w-10 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Switch demo role" title="Switch demo role">
        <Key className="mx-auto h-4 w-4" />
      </button>

      {/* Bottom Profile Area with Authenticated Role Switcher (Requirement 8) */}
      <div className="hidden md:block p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 font-mono">
          <span>AUTHENTICATED USER</span>
          <span className="capitalize font-semibold text-[#2457D6]">{currentUser.role}</span>
        </div>

        <div className="p-2 rounded bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-blue-100 text-[#2457D6] font-semibold text-[10px] flex items-center justify-center border border-blue-200 shrink-0">
              {currentUser.avatarInitials}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-800 truncate leading-none">
                {currentUser.name}
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">
                {currentUser.title}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAuthModal(true)}
            className="p-1 text-slate-400 hover:text-[#2457D6] hover:bg-slate-100 rounded cursor-pointer"
            title="Switch User Role / Demo Account"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
