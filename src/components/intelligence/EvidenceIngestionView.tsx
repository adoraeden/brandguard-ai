import React from 'react';
import { FileUp, ShieldCheck, Workflow } from 'lucide-react';
import { useDemoProfile } from '../../context/DemoProfileContext';
import { DocumentIngestionPanel } from './DocumentIngestionPanel';

interface EvidenceIngestionViewProps {
  onDataChanged: () => void;
  onNavigateToKnowledgeBase: () => void;
}

export const EvidenceIngestionView: React.FC<EvidenceIngestionViewProps> = ({
  onDataChanged,
  onNavigateToKnowledgeBase,
}) => {
  const { isAdmin } = useDemoProfile();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 md:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><FileUp className="h-5 w-5" /></div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-950">Automated Evidence Ingestion</h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Upload source documents, inspect extracted passages, and approve only the facts and guidelines your team has verified.</p>
            </div>
          </div>
          <button type="button" onClick={onNavigateToKnowledgeBase} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Open Brand Intelligence</button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <FileUp className="h-4 w-4 text-blue-600" />
            <span className="text-[11px] font-medium text-slate-700">1. Upload and extract</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[11px] font-medium text-slate-700">2. Human verification</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <Workflow className="h-4 w-4 text-indigo-600" />
            <span className="text-[11px] font-medium text-slate-700">3. Shared review knowledge</span>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto pb-5">
        <DocumentIngestionPanel
          isAdmin={isAdmin}
          onDataChanged={onDataChanged}
          onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
          standalone
        />
      </div>
    </div>
  );
};
