import { 
  BrandGuideline, 
  TerminologyEntry, 
  ApprovedFact, 
  KnowledgeSource, 
  ReviewDocument, 
  GovernanceInsights 
} from '../types';

export const api = {
  // Health
  async getHealth() {
    const res = await fetch('/health');
    return res.json();
  },

  // Overview
  async getOverview() {
    const res = await fetch('/api/overview');
    if (!res.ok) throw new Error('Failed to fetch overview metrics');
    return res.json();
  },

  // Guidelines
  async getGuidelines(): Promise<BrandGuideline[]> {
    const res = await fetch('/api/guidelines');
    if (!res.ok) throw new Error('Failed to fetch guidelines');
    return res.json();
  },

  async createGuideline(guideline: Partial<BrandGuideline>): Promise<BrandGuideline> {
    const res = await fetch('/api/guidelines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guideline),
    });
    if (!res.ok) throw new Error('Failed to create guideline');
    return res.json();
  },

  async updateGuideline(id: string, guideline: Partial<BrandGuideline>): Promise<BrandGuideline> {
    const res = await fetch(`/api/guidelines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guideline),
    });
    if (!res.ok) throw new Error('Failed to update guideline');
    return res.json();
  },

  async deleteGuideline(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/guidelines/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete guideline');
    return res.json();
  },

  // Terminology
  async getTerminology(): Promise<TerminologyEntry[]> {
    const res = await fetch('/api/terminology');
    if (!res.ok) throw new Error('Failed to fetch terminology');
    return res.json();
  },

  async createTerminology(term: Partial<TerminologyEntry>): Promise<TerminologyEntry> {
    const res = await fetch('/api/terminology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(term),
    });
    if (!res.ok) throw new Error('Failed to create terminology entry');
    return res.json();
  },

  async updateTerminology(id: string, term: Partial<TerminologyEntry>): Promise<TerminologyEntry> {
    const res = await fetch(`/api/terminology/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(term),
    });
    if (!res.ok) throw new Error('Failed to update terminology entry');
    return res.json();
  },

  async deleteTerminology(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/terminology/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete terminology entry');
    return res.json();
  },

  // Facts
  async getFacts(): Promise<ApprovedFact[]> {
    const res = await fetch('/api/facts');
    if (!res.ok) throw new Error('Failed to fetch facts');
    return res.json();
  },

  async createFact(fact: Partial<ApprovedFact>): Promise<ApprovedFact> {
    const res = await fetch('/api/facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fact),
    });
    if (!res.ok) throw new Error('Failed to create fact');
    return res.json();
  },

  async deleteFact(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/facts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete fact');
    return res.json();
  },

  // Sources
  async getSources(): Promise<KnowledgeSource[]> {
    const res = await fetch('/api/sources');
    if (!res.ok) throw new Error('Failed to fetch sources');
    return res.json();
  },

  // Reviews
  async getReviews(): Promise<ReviewDocument[]> {
    const res = await fetch('/api/reviews');
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async getReview(id: string): Promise<ReviewDocument> {
    const res = await fetch(`/api/reviews/${id}`);
    if (!res.ok) throw new Error('Failed to fetch review document');
    return res.json();
  },

  async submitReview(payload: {
    title: string;
    contentType: string;
    content: string;
    reviewer?: string;
  }): Promise<ReviewDocument> {
    const res = await fetch('/api/reviews', {
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
    const res = await fetch(`/api/reviews/${reviewId}/decisions`, {
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

  // Auth
  async getUsers(): Promise<any[]> {
    const res = await fetch('/api/auth/users');
    if (!res.ok) throw new Error('Failed to fetch workspace users');
    return res.json();
  },

  async login(payload: { email?: string; role?: string; userId?: string }): Promise<any> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  // Archive
  async getArchive(params?: { q?: string; status?: string; decision?: string }): Promise<ReviewDocument[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.status) query.set('status', params.status);
    if (params?.decision) query.set('decision', params.decision);

    const res = await fetch(`/api/archive?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch archive records');
    return res.json();
  },

  // Insights
  async getInsights(): Promise<GovernanceInsights> {
    const res = await fetch('/api/insights');
    if (!res.ok) throw new Error('Failed to fetch governance insights');
    return res.json();
  },
};
