import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, FileText, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import { EvidenceCandidate, IngestedDocument } from '../../types';
import { api } from '../../services/apiClient';
import { useDemoProfile } from '../../context/DemoProfileContext';

interface DocumentIngestionPanelProps {
  isAdmin: boolean;
  onDataChanged: () => void;
  onNavigateToKnowledgeBase?: () => void;
  standalone?: boolean;
}

type ApprovalConfirmation = {
  recordType: 'fact' | 'guideline';
  title: string;
  approvedText: string;
  filename: string;
  pageNumber?: number | null;
  sectionLabel?: string | null;
  documentId: string;
  recordId: string;
};

type CandidateDraft = { title: string; approvedText: string };
type DemoEvidenceDocument = {
  id: string;
  filename: string;
  title: string;
  description: string;
  paragraphs: string[];
};

const DEMO_EVIDENCE_DOCUMENTS: DemoEvidenceDocument[] = [
  {
    id: 'brand-voice',
    filename: 'AuraCloud_Brand_Voice_Guide.pdf',
    title: 'Brand Voice Guide',
    description: 'Tone, terminology and approved messaging rules',
    paragraphs: [
      'AURACLOUD BRAND VOICE GUIDE',
      'VOICE AND TONE',
      'Customer-facing copy must use a clear, confident, and helpful tone.',
      'Never describe AuraCloud as risk-free or completely secure.',
      'Use the approved product names AuraCloud Core, AuraCloud Teams, and AuraCloud Insights.',
      'Avoid absolute guarantees about uptime, security, or performance.',
    ],
  },
  {
    id: 'product-facts',
    filename: 'AuraCloud_Product_Factsheet.pdf',
    title: 'Product Factsheet',
    description: 'Product capabilities and measurable claims',
    paragraphs: [
      'AURACLOUD PRODUCT FACTSHEET',
      'PRODUCT OVERVIEW',
      'AuraCloud Core provides encrypted cloud storage for enterprise teams.',
      'AuraCloud supports multi-factor authentication for administrator accounts.',
      'AuraCloud maintains 99.9% monthly service availability under its standard service commitment.',
      'AuraCloud launched its enterprise platform in 2022.',
    ],
  },
  {
    id: 'claims-policy',
    filename: 'AuraCloud_Claims_Compliance_Policy.pdf',
    title: 'Claims & Compliance Policy',
    description: 'Evidence requirements and restricted claims',
    paragraphs: [
      'AURACLOUD CLAIMS AND COMPLIANCE POLICY',
      'EVIDENCE REQUIREMENTS',
      'All marketing performance claims must be supported by an approved factsheet or independent test report.',
      'Do not claim AuraCloud is certified to ISO 27001 unless a current certificate is available.',
      'AuraCloud provides annual independent security assessment reports to enterprise customers.',
      'Never promise that customer data is impossible to access or lose.',
    ],
  },
];

const buildDemoPdfFile = (sample: DemoEvidenceDocument): File => {
  const encoder = new TextEncoder();
  const clean = (value: string) => value.replace(/[^\x20-\x7E]/g, ' ');
  const wrap = (value: string) => {
    const words = clean(value).split(/\s+/);
    const lines: string[] = [];
    let line = '';
    words.forEach(word => {
      const next = line ? line + ' ' + word : word;
      if (next.length > 82 && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    return lines;
  };
  const textLines = sample.paragraphs.flatMap(wrap);
  const stream = [
    'BT',
    '/F1 11 Tf',
    '50 790 Td',
    '15 TL',
    ...textLines.flatMap((line, index) => index === 0
      ? ['(' + line.replace(/([\\()])/g, '\\$1') + ') Tj']
      : ['T*', '(' + line.replace(/([\\()])/g, '\\$1') + ') Tj']),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + encoder.encode(stream).length + ' >>\nstream\n' + stream + '\nendstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
  });
  const xrefOffset = encoder.encode(pdf).length;
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  offsets.slice(1).forEach(offset => {
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';
  return new File([encoder.encode(pdf) as unknown as BlobPart], sample.filename, { type: 'application/pdf' });
};

export const DocumentIngestionPanel: React.FC<DocumentIngestionPanelProps> = ({ isAdmin, onDataChanged, onNavigateToKnowledgeBase, standalone = false }) => {
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
  const [approvalConfirmation, setApprovalConfirmation] = useState<ApprovalConfirmation | null>(null);

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
      const message = err instanceof Error ? err.message : 'Unable to load uploaded documents.';
      if (/not found|404/i.test(message)) {
        setError('The evidence-ingestion API is missing from the connected backend. Uploading and approval are unavailable until the backend deployment is updated.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (selectedFile.size === 0) {
      setError('The selected file is empty. Choose a non-empty PDF, DOCX or TXT file.');
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('Files are limited to 15 MB.');
      return;
    }
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!extension || !['pdf', 'docx', 'txt'].includes(extension)) {
      setError('Unsupported file type. Choose a PDF, DOCX or TXT file.');
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
      setNotice('Uploaded ' + uploaded.filename + '. Review the extracted passages below before approving any knowledge.');
      await loadDocuments();
      onDataChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Document upload failed.';
      if (/not found|404/i.test(message)) {
        setError('The document-ingestion API is unavailable on the connected backend. The file was not uploaded or processed.');
      } else {
        setError(message);
      }
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
      const savedCandidate = await api.decideEvidenceCandidate(documentId, candidate.id, {
        decision,
        recordType,
        title: draft.title,
        approvedText: draft.approvedText,
        category: recordType === 'guideline' ? 'writing_standards' : 'product_specs',
        severity: 'medium',
        reviewer: currentUser.name,
      });
      if (decision === 'approve' && recordType) {
        const sourceDocument = documents.find(item => item.id === documentId);
        setApprovalConfirmation({
          recordType,
          title: draft.title.trim(),
          approvedText: draft.approvedText.trim(),
          filename: sourceDocument?.filename || 'Uploaded source document',
          pageNumber: candidate.pageNumber,
          sectionLabel: candidate.sectionLabel,
          documentId,
          recordId: savedCandidate.approvedRecordId || '',
        });
      } else {
        setNotice('Extracted passage rejected. It was not added to approved knowledge.');
      }
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
      <section className="mx-4 mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <strong>Document ingestion is restricted to the Admin profile.</strong> Select the admin demo profile to upload documents and confirm extracted evidence.
      </section>
    );
  }

  const pendingCount = documents.reduce((sum, item) => sum + item.pendingCandidateCount, 0);

  return (
    <section className={(standalone ? 'mx-4 mt-4 mb-4 ' : 'mx-4 mt-2 ') + 'shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs'}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-2 text-[#2457D6]"><FileText className="h-4 w-4" /></div>
          <div>
            <h2 className="text-xs font-bold text-slate-900">Automated Evidence Ingestion</h2>
            <p className="text-[10px] text-slate-500">Choose a demo PDF or upload your own, then review every extracted passage before approval.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            {pendingCount} awaiting confirmation
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadDocuments()} disabled={loading} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50" title="Refresh documents">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={() => setExpanded(value => !value)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-expanded={expanded} title={expanded ? 'Collapse upload workspace' : 'Expand upload workspace'}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {approvalConfirmation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setApprovalConfirmation(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="evidence-approval-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-slate-100 bg-emerald-50/70 px-5 py-4">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700"><Check className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <h2 id="evidence-approval-title" className="text-base font-bold text-slate-900">{approvalConfirmation.recordType === 'fact' ? 'Fact approved successfully' : 'Guideline approved successfully'}</h2>
                <p className="mt-1 text-xs text-slate-600">Your reviewed entry has been saved to {approvalConfirmation.recordType === 'fact' ? 'Approved Facts' : 'Brand Guidelines'}.</p>
              </div>
              <button type="button" onClick={() => setApprovalConfirmation(null)} aria-label="Close confirmation" className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Approved entry</div>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">{approvalConfirmation.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{approvalConfirmation.approvedText}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-800"><FileText className="h-4 w-4 text-blue-600" /> Source provenance</div>
                <p className="text-xs text-slate-700">{approvalConfirmation.filename}</p>
                <p className="mt-1 text-[11px] text-slate-500">{approvalConfirmation.pageNumber ? 'Page ' + approvalConfirmation.pageNumber : 'Page not recorded'}{approvalConfirmation.sectionLabel ? ' · ' + approvalConfirmation.sectionLabel : ''}</p>
                <p className="mt-2 text-[11px] font-medium text-emerald-700">The approved entry is stored in the shared knowledge base and can be considered in future claim reviews.</p>
                {approvalConfirmation.recordId && <p className="mt-1 text-[10px] text-slate-400">Knowledge record ID: {approvalConfirmation.recordId}</p>}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <a href={api.getDocumentDownloadUrl(approvalConfirmation.documentId)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Download source document</a>
              <button type="button" onClick={() => { setApprovalConfirmation(null); onNavigateToKnowledgeBase?.(); }} className="rounded-lg bg-[#2457D6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8]">View in Brand Intelligence</button>
            </div>
          </section>
        </div>
      )}
      {expanded && (
        <div className={'space-y-3 p-3 ' + (documents.length > 0 && !standalone ? 'max-h-[36vh] overflow-y-auto' : standalone ? 'max-h-[calc(100dvh-15rem)] overflow-y-auto' : '')}>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3">
            <label htmlFor="brandguard-document-upload" className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Upload PDF, DOCX or TXT</label>
            <input
              id="brandguard-document-upload"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={event => {
                const file = event.target.files?.[0] || null;
                setSelectedFile(file);
                setError('');
                setNotice('');
                if (file && file.size === 0) setError('The selected file is empty.');
                else if (file && file.size > 15 * 1024 * 1024) setError('Files are limited to 15 MB.');
                else if (file && !['pdf', 'docx', 'txt'].includes(file.name.split('.').pop()?.toLowerCase() || '')) setError('Unsupported file type. Choose a PDF, DOCX or TXT file.');
              }}
              className="min-w-0 flex-1 text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#2457D6]"
            />
            <button type="button" onClick={() => void handleUpload()} disabled={!selectedFile || uploading} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2457D6] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? 'Extracting…' : 'Upload & Extract'}
            </button>
            {selectedFile && <span className="w-full truncate text-[10px] font-medium text-blue-700">Selected: {selectedFile.name}</span>}
            <span className="w-full text-[10px] text-slate-500">Maximum 15 MB. Text-based PDFs are supported; scanned image-only PDFs need OCR.</span>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Ready-to-use demo PDFs</h3>
              <span className="text-[10px] text-slate-400">3 sample documents</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DEMO_EVIDENCE_DOCUMENTS.map(sample => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    setSelectedFile(buildDemoPdfFile(sample));
                    setError('');
                    setNotice(sample.title + ' PDF is ready. Click Upload & Extract to process it.');
                  }}
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50"
                >
                  <FileText className="h-4 w-4 shrink-0 text-[#2457D6]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-semibold text-slate-800">{sample.title}</span>
                    <span className="mt-0.5 block text-[9px] leading-snug text-slate-500">{sample.description}</span>
                  </span>
                  <span className="shrink-0 text-[9px] font-semibold text-[#2457D6]">Use PDF</span>
                </button>
              ))}
            </div>
          </div>

          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">{error}</div>}
          {notice && <div role="status" className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-800">{notice}</div>}

          {documents.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-3">
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
                    <span className={'rounded-full border px-2 py-0.5 text-[10px] font-semibold ' + (documentItem.candidateCount === 0 ? 'border-slate-200 bg-slate-100 text-slate-600' : documentItem.pendingCandidateCount ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
                      {documentItem.candidateCount === 0 ? 'No candidates detected' : documentItem.pendingCandidateCount ? documentItem.pendingCandidateCount + ' pending' : 'All passages reviewed'}
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
                              <span className={'rounded px-2 py-0.5 text-[9px] font-bold uppercase ' + (candidate.candidateType === 'guideline' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700')}>{candidate.candidateType} candidate</span>
                              <span className="text-[10px] text-slate-500">{candidate.pageNumber ? 'Page ' + candidate.pageNumber : 'Page not available'}{candidate.sectionLabel ? ' · ' + candidate.sectionLabel : ''}</span>
                              <span className="text-[10px] text-slate-400">Extraction confidence: {candidate.confidence}</span>
                            </div>
                            <span className={'rounded-full border px-2 py-0.5 text-[9px] font-semibold ' + (candidate.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : candidate.status === 'rejected' ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-amber-200 bg-amber-50 text-amber-700')}>{candidate.status}</span>
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
                            <p className="mt-2 text-[10px] text-slate-500">{candidate.status === 'approved' ? 'Confirmed by ' + (candidate.reviewedBy || 'reviewer') + ' as ' + candidate.approvedRecordType + '.' : 'Rejected by ' + (candidate.reviewedBy || 'reviewer') + '; no knowledge record was created.'}</p>
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