import React from 'react';
import { ArrowRight, BarChart3, BookOpen, CheckCircle2, FileSearch, ShieldCheck, Users } from 'lucide-react';
import { DEMO_USERS } from '../../context/DemoProfileContext';
import { UserProfile } from '../../types';
import { SAMPLE_DOCUMENTS } from '../../data/mockData';

interface DemoEntryScreenProps {
  selectedUser: UserProfile;
  onSelectUser: (userId: string) => void;
  onEnter: () => void;
}

const personaDetails: Record<string, { focus: string; description: string; scenarioIndex: number; highlights: string[] }> = {
  'usr-admin-1': {
    focus: 'Workspace administrator',
    description: 'See the full governance workspace, manage approved brand knowledge and review organisation-wide insights.',
    scenarioIndex: 0,
    highlights: ['Brand knowledge and evidence', 'All review activity', 'Governance insights'],
  },
  'usr-rev-1': {
    focus: 'Marketing communications reviewer',
    description: 'Explore a campaign review, understand content findings and work through human approval decisions.',
    scenarioIndex: 1,
    highlights: ['Campaign content review', 'Editable correction suggestions', 'Reviewer hand-offs'],
  },
  'usr-rev-2': {
    focus: 'Editorial and compliance reviewer',
    description: 'Focus on claim verification, source traceability and the decision history behind a content review.',
    scenarioIndex: 2,
    highlights: ['Claim-to-evidence traceability', 'Compliance findings', 'Decision history'],
  },
};

export const DemoEntryScreen: React.FC<DemoEntryScreenProps> = ({ selectedUser, onSelectUser, onEnter }) => {
  const selectedDetails = personaDetails[selectedUser.id] || personaDetails['usr-admin-1'];
  const selectedScenario = SAMPLE_DOCUMENTS[selectedDetails.scenarioIndex];

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-slate-950">BrandGuard AI</div>
            <div className="text-xs font-medium text-slate-500">Intelligent brand governance platform</div>
          </div>
          <span className="ml-auto rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">Interactive demo</span>
        </header>

        <section className="mx-auto my-auto w-full max-w-5xl py-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              No password · Choose a demo role
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">Explore BrandGuard AI</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Enter the workspace as one of three demo personas. Each role has a different review focus and a tailored sample scenario, so you can explore the platform without creating an account.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {DEMO_USERS.map(user => {
              const details = personaDetails[user.id];
              const selected = selectedUser.id === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onSelectUser(user.id)}
                  aria-pressed={selected}
                  className={`group flex h-full flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${selected ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' : 'border-slate-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ${selected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}>{user.avatarInitials}</span>
                    {selected && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700"><CheckCircle2 className="h-3 w-3" /> Selected</span>}
                  </div>
                  <h2 className="mt-4 text-base font-bold text-slate-950">{user.name}</h2>
                  <p className="mt-1 text-xs font-semibold text-blue-700">{details.focus}</p>
                  <p className="mt-3 min-h-[60px] text-sm leading-5 text-slate-600">{details.description}</p>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {details.highlights.map(item => <div key={item} className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />{item}</div>)}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Your selected demo journey</div>
              <div className="mt-1 text-sm font-bold text-slate-900">{selectedUser.name} · {selectedDetails.focus}</div>
              <p className="mt-1 text-xs leading-5 text-slate-600">Suggested first scenario: <span className="font-semibold text-slate-800">{selectedScenario.title}</span></p>
            </div>
            <button type="button" onClick={onEnter} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              Enter demo workspace <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 grid gap-3 text-xs text-slate-500 sm:grid-cols-3">
            <div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-blue-600" /> Review content against brand rules</div>
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-blue-600" /> Trace findings to approved sources</div>
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600" /> Explore decisions and governance insights</div>
          </div>
          <p className="mt-8 text-center text-[11px] leading-5 text-slate-400">
            Demo identities are sample personas, not password-protected user accounts. They share one fictional AuraCloud workspace; reviewer views focus on items assigned to that persona.
          </p>
        </section>
      </div>
    </main>
  );
};
