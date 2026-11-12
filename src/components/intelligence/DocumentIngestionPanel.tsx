import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, FileText, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import { EvidenceCandidate, IngestedDocument } from '../../types';
import { api } from '../../services/apiClient';
import { useDemoProfile } from '../../context/DemoProfileContext';

interface DocumentIngestionPanelProps {
  isAdmin: boolean;
  onDataChanged: () => void;
}

type CandidateDraft = { title: string; approvedText: string };

export const DocumentIngestionPanel: React.FC<DocumentIngestionPanelProps> = ({ isAdmin, onDataChanged }) => {
  const { currentUser } = useDemoProfile();
  const [documents, setDocuments] = useState<IngestedDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [drafts, setDrafts] = useState<Record<string, CandidateDraft>>({});
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyCandidate, setBusyCandidate] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDocuments = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const rows = await api.getDocuments();
      setDocuments(rows);
      setDrafts(previous => {
        const next = { ...previous };
        rows.forEach(documentItem => documentItem.candidates.forEach(candidate => {
          if (!next[candidate.id]) next[candidate.id] = { title: candidate.title, approvedText: candidate.excerpt };
        }));
        return next;
      });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load uploaded documents.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('Files are limited to 15 MB.');
      return;
    }
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const uploaded = await api.uploadDocument(selectedFile, currentUser.name);
      setSelectedFile(null);
      const input = document.getElementById('brandguard-document-upload') as HTMLInputElement | null;
      if (input) input.value = '';
      setNotice(`Uploaded ${uploaded.filename}. Review the extracted passages below before approving any knowledge.`);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Document upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDecision = async (
    documentId: string,
    candidate: EvidenceCandidate,
    decision: 'approve' | 'reject',
    recordType?: 'fact' | 'guideline',
  ) => {
    const draft = drafts[candidate.id] || { title: candidate.title, approvedText: candidate.excerpt };
    setBusyCandidate(candidate.id);
    setError('');
    setNotice('');
    try {
      await api.decideEvidenceCandidate(documentId, candidate.id, {
        decision,
        recordType,
        title: draft.title,
        approvedText: draft.approvedText,
        category: recordType === 'guideline' ? 'writing_standards' : 'product_specs',
        severity: 'medium',
        reviewer: currentUser.name,
      });
      setNotice(decision === 'reject'
        ? 'Extracted passage rejected. It was not added to approved knowledge.'
        : `Passage approved as a ${recordType}. It is now available in the brand knowledge base.`);
      await loadDocuments();
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save this evidence decision.');
    } finally {
      setBusyCandidate(null);
    }
  };

  if (!isAdmin) {
    return (
      <section className="mx-4 mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <strong>Document ingestion is restricted to the Admin profile.</strong> Select the admin demo profile to upload documents and confirm extracted evidence.
      </section>
    );
  }

  const pendingCount = documents.reduce((sum, item) => sum + item.pendingCandidateCount, 0);

  return (
    <section className="mx-4 mt-3 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-2 text-[#2457D6]"><FileText className="h-4 w-4" /></div>
          <div>
            <h2 className="text-xs font-bold text-slate-900">Automated Evidence Ingestion</h2>
            <p className="text-[10px] text-slate-500">Upload source documents, extract likely facts and rules, then confirm each passage before approval.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            {pendingCount} awaiting confirmation
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadDocuments()} disabled={loading} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50" title="Refresh documents">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={() => setExpanded(value => !value)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-expanded={expanded}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="max-h-[32vh] space-y-3 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3">
            <label htmlFor="brandguard-document-upload" className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Source document</label>
            <input
              id="brandguard-document-upload"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={event => { setSelectedFile(event.target.files?.[0] || null); setError(''); setNotice(''); }}
              className="min-w-0 flex-1 text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#2457D6]"
            />
            <button type="button" onClick={() => void handleUpload()} disabled={!selectedFile || uploading} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2457D6] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? 'Extracting…' : 'Upload & Extract'}
            </button>
            <span className="w-full text-[10px] text-slate-500">PDF, DOCX or UTF-8 TXT · maximum 15 MB · scanned image-only PDFs are not OCR-processed yet</span>
          </div>

          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">{error}</div>}
          {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">{notice}</div>}

          {documents.length === 0 && !loading ? (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">No uploaded documents yet. Upload a brand guide, factsheet or policy document to begin.</div>
          ) : (
            <div className="space-y-3">
              {documents.map(documentItem => (
                <div key={documentItem.id} className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-xs font-semibold text-slate-800">{documentItem.filename}</div>
                        <a href={api.getDocumentDownloadUrl(documentItem.id)} className="text-[10px] font-semibold text-[#2457D6] underline" target="_blank" rel="noreferrer">Download original</a>
                      </div>
                      <div className="text-[10px] text-slate-500">{documentItem.pageCount} extracted pages/sections · {documentItem.candidateCount} candidate passages · uploaded by {documentItem.uploadedBy}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${documentItem.candidateCount === 0 ? 'border-slate-200 bg-slate-100 text-slate-600' : documentItem.pendingCandidateCount ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                      {documentItem.candidateCount === 0 ? 'No candidates detected' : documentItem.pendingCandidateCount ? `${documentItem.pendingCandidateCount} pending` : 'All passages reviewed'}
                    </span>
                  </div>
                  <div className="space-y-2 p-3">
                    {documentItem.candidates.length === 0 && (
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-[11px] text-slate-600">
                        Text was extracted and the original document is stored, but no likely fact or guideline passages matched the current extraction rules. Add relevant knowledge manually or try a more text-focused source.
                      </div>
                    )}
                    {documentItem.candidates.map(candidate => {
                      const draft = drafts[candidate.id] || { title: candidate.title, approvedText: candidate.excerpt };
                      const busy = busyCandidate === candidate.id;
                      return (
                        <article key={candidate.id} className="rounded-lg border border-slate-100 bg-white p-3">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${candidate.candidateType === 'guideline' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'}`}>{candidate.candidateType} candidate</span>
                              <span className="text-[10px] text-slate-500">{candidate.pageNumber ? `Page ${candidate.pageNumber}` : 'Page not available'}{candidate.sectionLabel ? ` · ${candidate.sectionLabel}` : ''}</span>
                              <span className="text-[10px] text-slate-400">Extraction confidence: {candidate.confidence}</span>
                            </div>
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${candidate.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : candidate.status === 'rejected' ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{candidate.status}</span>
                          </div>
                          <label className="mb-2 block">
                            <span className="mb-1 block text-[9px] font-semibold uppercase text-slate-500">Knowledge entry title</span>
                            <input value={draft.title} disabled={candidate.status !== 'pending' || busy} onChange={event => setDrafts(previous => ({ ...previous, [candidate.id]: { ...draft, title: event.target.value } }))} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs disabled:bg-slate-50" />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[9px] font-semibold uppercase text-slate-500">Review extracted passage before approval</span>
                            <textarea rows={2} value={draft.approvedText} disabled={candidate.status !== 'pending' || busy} onChange={event => setDrafts(previous => ({ ...previous, [candidate.id]: { ...draft, approvedText: event.target.value } }))} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs leading-relaxed disabled:bg-slate-50" />
                          </label>
                          {candidate.status === 'pending' ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button type="button" disabled={busy || !draft.title.trim() || !draft.approvedText.trim()} onClick={() => void handleDecision(documentItem.id, candidate, 'approve', 'fact')} className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Check className="h-3 w-3" /> Approve as fact</button>
                              <button type="button" disabled={busy || !draft.title.trim() || !draft.approvedText.trim()} onClick={() => void handleDecision(documentItem.id, candidate, 'approve', 'guideline')} className="inline-flex items-center gap-1 rounded-md bg-indigo-700 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"><Check className="h-3 w-3" /> Approve as guideline</button>
                              <button type="button" disabled={busy} onClick={() => void handleDecision(documentItem.id, candidate, 'reject')} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><X className="h-3 w-3" /> Reject passage</button>
                              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />}
                            </div>
                          ) : (
                            <p className="mt-2 text-[10px] text-slate-500">{candidate.status === 'approved' ? `Confirmed by ${candidate.reviewedBy || 'reviewer'} as ${candidate.approvedRecordType}.` : `Rejected by ${candidate.reviewedBy || 'reviewer'}; no knowledge record was created.`}</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
