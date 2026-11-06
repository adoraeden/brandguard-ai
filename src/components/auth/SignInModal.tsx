import React from 'react';
import { ShieldCheck, UserCheck, Key, X, Check, ArrowRight } from 'lucide-react';
import { useAuth, DEMO_USERS } from '../../context/AuthContext';
import { UserProfile } from '../../types';

export const SignInModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal, currentUser, loginAs } = useAuth();

  if (!showAuthModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2457D6] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                BrandGuard Authentication
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                AuraCloud Technologies Demo Workspace
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAuthModal(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-600 leading-relaxed">
            Select an authenticated role to verify permissions. Every human review decision is recorded and attributed to the active user.
          </div>

          {/* Account selector cards */}
          <div className="space-y-2.5">
            {DEMO_USERS.map((user) => {
              const isSelected = currentUser.id === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => loginAs(user)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-[#2457D6] bg-blue-50/60 ring-2 ring-[#2457D6]/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border ${
                        user.role === 'admin'
                          ? 'bg-blue-100 text-[#2457D6] border-blue-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {user.avatarInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {user.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full uppercase font-bold border ${
                            user.role === 'admin'
                              ? 'bg-blue-50 text-[#2457D6] border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {user.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[#2457D6] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Role permissions notice */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#2457D6]" />
              <span>Role Permissions Breakdown</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              <strong>Administrator</strong>: Manage brand knowledge (add, edit, delete rules/terms/facts), configure workspace governance.<br />
              <strong>Reviewer</strong>: Submit communication drafts, evaluate findings, record human sign-off verdicts.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={() => setShowAuthModal(false)}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Continue as {currentUser.name}
          </button>
        </div>
      </div>
    </div>
  );
};
