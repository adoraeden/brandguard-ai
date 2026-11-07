import { 
  BrandGuideline, 
  TerminologyEntry, 
  ApprovedFact, 
  KnowledgeSource, 
  ReviewDocument, 
  GovernanceInsights 
} from '../types';

// All application APIs are served by FastAPI. Set VITE_API_BASE_URL to the
// deployed FastAPI origin for production builds; local development defaults to
// the documented backend at 127.0.0.1:8000.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')).replace(/\/$/, '');
const apiFetch = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(new URL(input.toString(), `${API_BASE_URL || window.location.origin}/`), init);
const newEntryId = (prefix: string) => `${prefix}-${globalThis.crypto.randomUUID()}`;
const apiError = async (res: Response, fallback: string) => {
  const body = await res.json().catch(() => ({}));
  if (typeof body.error === 'string') return body.error;
  if (typeof body.detail === 'string') return body.detail;
  if (Array.isArray(body.detail)) return body.detail.map((item: any) => item.msg || 'Invalid field').join('. ');
  return fallback;
};

export const api = {
  // Health
  async getHealth() {
    const res = await apiFetch('/health');
    return res.json();
  },

  // Overview
  async getOverview() {
    const res = await apiFetch('/api/overview');
    if (!res.ok) throw new Error('Failed to fetch overview metrics');
    return res.json();
  },

  // Guidelines
  async getGuidelines(): Promise<BrandGuideline[]> {
    const res = await apiFetch('/api/guidelines');
    if (!res.ok) throw new Error('Failed to fetch guidelines');
    return res.json();
  },

  async createGuideline(guideline: Partial<BrandGuideline>): Promise<BrandGuideline> {
    const res = await apiFetch('/api/guidelines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newEntryId('bg'), status: 'active', lastUpdated: new Date().toISOString().slice(0, 10), ...guideline }),
    });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to create guideline'));
    return res.json();
  },

  async updateGuideline(id: string, guideline: Partial<BrandGuideline>): Promise<BrandGuideline> {
    const res = await apiFetch(`/api/guidelines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'active', lastUpdated: new Date().toISOString().slice(0, 10), ...guideline }),
    });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to update guideline'));
    return res.json();
  },

  async deleteGuideline(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/guidelines/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to delete guideline'));
    return res.json();
  },

  // Terminology
  async getTerminology(): Promise<TerminologyEntry[]> {
    const res = await apiFetch('/api/terminology');
    if (!res.ok) throw new Error('Failed to fetch terminology');
    return res.json();
  },

  async createTerminology(term: Partial<TerminologyEntry>): Promise<TerminologyEntry> {
    const res = await apiFetch('/api/terminology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newEntryId('term'), status: 'active', createdAt: new Date().toISOString().slice(0, 10), ...term }),
    });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to create terminology entry'));
    return res.json();
  },

  async updateTerminology(id: string, term: Partial<TerminologyEntry>): Promise<TerminologyEntry> {
    const res = await apiFetch(`/api/terminology/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'active', createdAt: new Date().toISOString().slice(0, 10), ...term }),
    });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to update terminology entry'));
    return res.json();
  },

  async deleteTerminology(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/terminology/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to delete terminology entry'));
    return res.json();
  },

  // Facts
  async getFacts(): Promise<ApprovedFact[]> {
    const res = await apiFetch('/api/facts');
    if (!res.ok) throw new Error('Failed to fetch facts');
    return res.json();
  },

  async createFact(fact: Partial<ApprovedFact>): Promise<ApprovedFact> {
    const res = await apiFetch('/api/facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newEntryId('fact'), verificationStatus: 'verified', lastUpdated: new Date().toISOString().slice(0, 10), ...fact }),
    });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to create fact'));
    return res.json();
  },

  async updateFact(id: string, fact: Partial<ApprovedFact>): Promise<ApprovedFact> {
    const res = await apiFetch(`/api/facts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, verificationStatus: 'verified', lastUpdated: new Date().toISOString().slice(0, 10), ...fact }),
    });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to update fact'));
    return res.json();
  },

  async deleteFact(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/facts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to delete fact'));
    return res.json();
  },

  // Sources
  async getSources(): Promise<KnowledgeSource[]> {
    const res = await apiFetch('/api/sources');
    if (!res.ok) throw new Error('Failed to fetch sources');
    return res.json();
  },

  async createSource(source: Partial<KnowledgeSource>): Promise<KnowledgeSource> {
    const res = await apiFetch('/api/sources', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newEntryId('src'), version: '1.0', effectiveDate: new Date().toISOString().slice(0, 10), ruleCount: 0, status: 'active', ...source }),
    });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to create knowledge source'));
    return res.json();
  },

  async updateSource(id: string, source: Partial<KnowledgeSource>): Promise<KnowledgeSource> {
    const res = await apiFetch(`/api/sources/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, version: '1.0', effectiveDate: new Date().toISOString().slice(0, 10), ruleCount: 0, status: 'active', ...source }),
    });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to update knowledge source'));
    return res.json();
  },

  async deleteSource(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/sources/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to delete knowledge source'));
    return res.json();
  },

  // Reviews
  async getReviews(): Promise<ReviewDocument[]> {
    const res = await apiFetch('/api/reviews');
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async getReview(id: string): Promise<ReviewDocument> {
    const res = await apiFetch(`/api/reviews/${id}`);
    if (!res.ok) throw new Error('Failed to fetch review document');
    return res.json();
  },

  async getReviewHistory(id: string): Promise<any[]> {
    const res = await apiFetch(`/api/reviews/${id}/history`);
    if (!res.ok) throw new Error('Failed to fetch review audit history');
    return res.json();
  },

  async rerunReviewAnalysis(reviewId: string, reviewer?: string): Promise<ReviewDocument> {
    const res = await apiFetch(`/api/reviews/${reviewId}/rerun-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer }),
    });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to rerun review analysis'));
    return res.json();
  },

  async submitReview(payload: {
    title: string;
    contentType: string;
    content: string;
    reviewer?: string;
  }): Promise<ReviewDocument> {
    const res = await apiFetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit review');
    }
    return res.json();
  },

  async recordDecision(
    reviewId: string,
    decisionPayload: {
      findingId?: string;
      suggestionAction?: 'accept' | 'reject' | 'edit' | 'reset';
      customText?: string;
      completeDecision?: 'approved_with_changes' | 'approved_as_is' | 'rejected';
      decisionNotes?: string;
      reviewer?: string;
    }
  ): Promise<ReviewDocument> {
    const res = await apiFetch(`/api/reviews/${reviewId}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decisionPayload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record review decision');
    }
    return res.json();
  },

  async decideFinding(reviewId: string, findingId: string, decision: 'accepted' | 'dismissed' | 'verification_required', note?: string, reviewer?: string): Promise<ReviewDocument> {
    const res = await apiFetch(`/api/reviews/${reviewId}/findings/${findingId}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note, reviewer }),
    });
    if (!res.ok) throw new Error(await apiError(res, 'Failed to record finding decision'));
    return res.json();
  },

  // Archive
  async getArchive(params?: { q?: string; status?: string; decision?: string }): Promise<ReviewDocument[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.status) query.set('status', params.status);
    if (params?.decision) query.set('decision', params.decision);

    const res = await apiFetch(`/api/archive?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch archive records');
    return res.json();
  },

  // Insights
  async getInsights(): Promise<GovernanceInsights> {
    const res = await apiFetch('/api/insights');
    if (!res.ok) throw new Error('Failed to fetch governance insights');
    return res.json();
  },
};
