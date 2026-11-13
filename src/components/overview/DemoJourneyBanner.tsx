import React from 'react';
import { ArrowRight, ClipboardCheck, FileSearch, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../../types';
import { SAMPLE_DOCUMENTS } from '../../data/mockData';

interface DemoJourneyBannerProps {
  currentUser: UserProfile;
  sample: typeof SAMPLE_DOCUMENTS[number];
  onOpenSample: (sample: typeof SAMPLE_DOCUMENTS[number]) => void;
}

const journeyCopy: Record<string, string> = {
  'usr-admin-1': 'Start with a product launch draft, inspect the workspace rules, then review the organisation-wide governance picture.',
  'usr-rev-1': 'Start with a social campaign, inspect the findings and intent-preserving suggestions, then follow the review hand-off.',
  'usr-rev-2': 'Start with website hero copy, trace its claims to approved evidence, then inspect the recorded review decisions.',
};

export const DemoJourneyBanner: React.FC<DemoJourneyBannerProps> = ({ currentUser, sample, onOpenSample }) => (
  <section className="mx-auto mt-5 flex w-full max-w-[1440px] flex-col gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 shadow-sm md:mt-6 md:flex-row md:items-center md:justify-between md:px-6">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Guided demo</span>
        <span className="text-blue-300">·</span>
        <span>{currentUser.name} / {currentUser.role}</span>
      </div>
      <h2 className="mt-1.5 text-base font-bold text-slate-950">Your suggested starting point</h2>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">{journeyCopy[currentUser.id]}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5"><FileSearch className="h-3.5 w-3.5 text-blue-600" /> Inspect findings and evidence</span>
        <span className="inline-flex items-center gap-1.5"><ClipboardCheck className="h-3.5 w-3.5 text-blue-600" /> Follow human review decisions</span>
      </div>
    </div>
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
      <div className="min-w-0 sm:max-w-[220px]">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sample scenario</div>
        <div className="truncate text-xs font-semibold text-slate-800">{sample.title}</div>
      </div>
      <button type="button" onClick={() => onOpenSample(sample)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
        Open my scenario <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  </section>
);
