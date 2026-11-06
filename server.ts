import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  BrandGuideline, 
  TerminologyEntry, 
  ApprovedFact, 
  KnowledgeSource, 
  ReviewDocument, 
  ReviewFinding,
  GovernanceInsights,
  UserProfile
} from './src/types/index.ts';
import { 
  INITIAL_GUIDELINES, 
  INITIAL_TERMINOLOGY, 
  INITIAL_FACTS, 
  INITIAL_SOURCES, 
  INITIAL_REVIEWS 
} from './src/data/mockData.ts';
import { runDeterministicChecks } from './src/services/deterministicEngine.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory relational store
let guidelines: BrandGuideline[] = [...INITIAL_GUIDELINES];
let terminology: TerminologyEntry[] = [...INITIAL_TERMINOLOGY];
let facts: ApprovedFact[] = [...INITIAL_FACTS];
let sources: KnowledgeSource[] = [...INITIAL_SOURCES];
let reviews: ReviewDocument[] = [...INITIAL_REVIEWS];

const WORKSPACE_USERS: UserProfile[] = [
  {
    id: 'usr-admin-1',
    name: 'Evelyn Voss',
    email: 'evelyn.voss@auracloud.tech',
    role: 'admin',
    title: 'VP Brand Governance & Compliance',
    avatarInitials: 'EV',
    department: 'Executive Governance',
  },
  {
    id: 'usr-rev-1',
    name: 'Marcus Chen',
    email: 'marcus.chen@auracloud.tech',
    role: 'reviewer',
    title: 'Director of Marketing Communications',
    avatarInitials: 'MC',
    department: 'Brand Communications',
  },
  {
    id: 'usr-rev-2',
    name: 'Devon Price',
    email: 'devon.price@auracloud.tech',
    role: 'reviewer',
    title: 'Lead Content Policy Reviewer',
    avatarInitials: 'DP',
    department: 'Editorial & Compliance',
  },
];

// Initialize Gemini client on server-side
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI:', err);
  }
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    engine: 'BrandGuard Hybrid Deterministic + Gemini 3.8 Flash',
    geminiConfigured: !!aiClient,
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (Hackathon-ready session handling)
app.get('/api/auth/users', (_req, res) => {
  res.json(WORKSPACE_USERS);
});

app.post('/api/auth/login', (req, res) => {
  const { email, role, userId } = req.body;
  const user = WORKSPACE_USERS.find(u => u.id === userId || u.email === email || u.role === role) || WORKSPACE_USERS[0];
  res.json({
    token: `demo-token-${user.id}-${Date.now()}`,
    user,
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.includes('usr-rev')) {
    const user = WORKSPACE_USERS.find(u => u.role === 'reviewer') || WORKSPACE_USERS[1];
    return res.json(user);
  }
  // Default to Evelyn Voss (Administrator)
  res.json(WORKSPACE_USERS[0]);
});

// Overview stats
app.get('/api/overview', (_req, res) => {
  const unresolvedCount = reviews.reduce((sum, r) => {
    return sum + (r.summary?.unresolvedFindings || 0);
  }, 0);

  const totalFindingsCount = reviews.reduce((sum, r) => sum + (r.findings?.length || 0), 0);

  // Pending reviews
  const pendingReviewsList = reviews
    .filter(r => r.decisionStatus === 'pending')
    .map(r => ({
      id: r.id,
      title: r.title,
      contentType: r.contentType,
      status: r.status,
      reviewer: r.reviewer,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      findingsCount: r.findings.length,
      unresolvedFindings: r.summary?.unresolvedFindings ?? r.findings.filter(f => !f.suggestion || f.suggestion.status === 'pending').length,
      decisionStatus: r.decisionStatus,
    }));

  // Recent decisions
  const recentDecisions = reviews
    .filter(r => r.decisionStatus !== 'pending')
    .slice(0, 5)
    .map(r => ({
      reviewId: r.id,
      title: r.title,
      decisionStatus: r.decisionStatus,
      reviewer: r.reviewer,
      decidedAt: r.decidedAt || r.updatedAt,
      findingsCount: r.findings.length,
    }));

  // Recurring issues count
  const recurringMap = new Map<string, number>();
  reviews.forEach(r => {
    r.findings.forEach(f => {
      const key = f.sourceRuleOrTerm || f.title;
      recurringMap.set(key, (recurringMap.get(key) || 0) + 1);
    });
  });

  const recurringIssues = Array.from(recurringMap.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    counts: {
      rules: guidelines.filter(g => g.status === 'active').length,
      terminology: terminology.filter(t => t.status === 'active').length,
      facts: facts.length,
      reviewedDocuments: reviews.length,
      unresolvedFindings: unresolvedCount,
      totalFindings: totalFindingsCount,
      pendingReviewsCount: pendingReviewsList.length,
    },
    recentReviews: reviews.slice(0, 5).map(r => ({
      id: r.id,
      title: r.title,
      contentType: r.contentType,
      status: r.status,
      reviewer: r.reviewer,
      createdAt: r.createdAt,
      findingsCount: r.findings.length,
      decisionStatus: r.decisionStatus,
    })),
    pendingReviews: pendingReviewsList,
    recentDecisions,
    recurringIssues,
  });
});

// Guidelines CRUD
app.get('/api/guidelines', (_req, res) => {
  res.json(guidelines);
});

app.post('/api/guidelines', (req, res) => {
  const newGuideline: BrandGuideline = {
    id: `bg-${Date.now()}`,
    title: req.body.title || 'Untitled Guideline',
    category: req.body.category || 'tone_of_voice',
    description: req.body.description || '',
    severity: req.body.severity || 'medium',
    sourceReference: req.body.sourceReference || 'Manual Entry',
    status: req.body.status || 'active',
    lastUpdated: new Date().toISOString().split('T')[0],
    examples: req.body.examples,
  };
  guidelines.unshift(newGuideline);
  res.status(201).json(newGuideline);
});

app.put('/api/guidelines/:id', (req, res) => {
  const { id } = req.params;
  const index = guidelines.findIndex(g => g.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Guideline not found' });
  }
  guidelines[index] = {
    ...guidelines[index],
    ...req.body,
    lastUpdated: new Date().toISOString().split('T')[0],
  };
  res.json(guidelines[index]);
});

app.delete('/api/guidelines/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = guidelines.length;
  guidelines = guidelines.filter(g => g.id !== id);
  if (guidelines.length === initialLen) {
    return res.status(404).json({ error: 'Guideline not found' });
  }
  res.json({ success: true, id });
});

// Terminology CRUD
app.get('/api/terminology', (_req, res) => {
  res.json(terminology);
});

app.post('/api/terminology', (req, res) => {
  const newTerm: TerminologyEntry = {
    id: `term-${Date.now()}`,
    preferredTerm: req.body.preferredTerm || '',
    restrictedTerm: req.body.restrictedTerm || '',
    explanation: req.body.explanation || '',
    approvedAlternative: req.body.approvedAlternative || req.body.preferredTerm || '',
    category: req.body.category || 'product_naming',
    status: req.body.status || 'active',
    createdAt: new Date().toISOString().split('T')[0],
  };
  terminology.unshift(newTerm);
  res.status(201).json(newTerm);
});

app.put('/api/terminology/:id', (req, res) => {
  const { id } = req.params;
  const index = terminology.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Terminology not found' });
  }
  terminology[index] = {
    ...terminology[index],
    ...req.body,
  };
  res.json(terminology[index]);
});

app.delete('/api/terminology/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = terminology.length;
  terminology = terminology.filter(t => t.id !== id);
  if (terminology.length === initialLen) {
    return res.status(404).json({ error: 'Terminology entry not found' });
  }
  res.json({ success: true, id });
});

// Facts CRUD
app.get('/api/facts', (_req, res) => {
  res.json(facts);
});

app.post('/api/facts', (req, res) => {
  const newFact: ApprovedFact = {
    id: `fact-${Date.now()}`,
    title: req.body.title || 'Approved Fact',
    statement: req.body.statement || '',
    category: req.body.category || 'product_specs',
    source: req.body.source || 'Internal Audit',
    verificationStatus: req.body.verificationStatus || 'verified',
    lastUpdated: new Date().toISOString().split('T')[0],
  };
  facts.unshift(newFact);
  res.status(201).json(newFact);
});

app.put('/api/facts/:id', (req, res) => {
  const { id } = req.params;
  const index = facts.findIndex(f => f.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Fact not found' });
  }
  facts[index] = {
    ...facts[index],
    ...req.body,
    lastUpdated: new Date().toISOString().split('T')[0],
  };
  res.json(facts[index]);
});

app.delete('/api/facts/:id', (req, res) => {
  const { id } = req.params;
  facts = facts.filter(f => f.id !== id);
  res.json({ success: true, id });
});

// Sources
app.get('/api/sources', (_req, res) => {
  res.json(sources);
});

// Reviews List & Single
app.get('/api/reviews', (_req, res) => {
  res.json(reviews);
});

app.get('/api/reviews/:id', (req, res) => {
  const review = reviews.find(r => r.id === req.params.id);
  if (!review) {
    return res.status(404).json({ error: 'Review document not found' });
  }
  res.json(review);
});

// Submit New Review (Hybrid Workflow: Deterministic + Gemini)
app.post('/api/reviews', async (req, res) => {
  try {
    const { title, contentType, content, reviewer } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const reviewId = `rev-${Date.now()}`;

    // 1. Run Deterministic checks (exact matching)
    const deterministicResult = runDeterministicChecks(
      content,
      terminology,
      guidelines,
      facts,
      reviewId
    );

    let allFindings: ReviewFinding[] = [...deterministicResult.findings];

    // 2. Run Gemini Contextual Analysis if configured
    if (aiClient) {
      try {
        const guidelineSummary = guidelines
          .filter(g => g.status === 'active')
          .map(g => `- [${g.category}] ${g.title}: ${g.description} (Ref: ${g.sourceReference})`)
          .join('\n');

        const factSummary = facts
          .map(f => `- [${f.category}] ${f.title}: ${f.statement} (Source: ${f.source})`)
          .join('\n');

        const prompt = `You are the contextual brand governance review engine for AuraCloud Technologies.
Analyze the following marketing/communication draft against the brand guidelines and facts below.

ORGANIZATION BRAND GUIDELINES:
${guidelineSummary}

VERIFIED COMPANY FACTS:
${factSummary}

DRAFT METADATA:
Content Type: ${contentType}
Title: ${title}

DRAFT CONTENT TO REVIEW:
"""
${content}
"""

INSTRUCTIONS:
1. Identify contextual brand inconsistencies (tone of voice deviations, hyperbolic marketing promises, claims of eliminating human workers, or claims of guaranteed regulatory immunity).
2. Identify unsupported claims that cannot be substantiated by the facts above.
3. Identify potential issues where wording is ambiguous or misleading.
4. Do NOT re-flag items already caught deterministically (such as simple exact restricted words like "Aura Cloud App" unless there is additional contextual nuance).
5. For EVERY finding, provide:
   - title: Brief descriptive title
   - category: One of 'contextual_inconsistency', 'unsupported_claim', or 'potential_issue'
   - severity: One of 'critical', 'high', 'medium', 'low', 'informational'
   - exactText: The exact sentence or excerpt from the draft that contains the issue
   - explanation: Clear rationale explaining why it fails the guideline or fact
   - sourceRuleOrTerm: The title of the guideline or fact violated
   - sourceReference: The reference or source from the guidelines/facts
   - confidence: 'high', 'medium', or 'low'
   - suggestion: An intent-preserving correction that respects what the author wanted to say, but rewrites it in compliant, approved language. Also provide rationale and authorIntentPreserved explanation.

Return ONLY a valid JSON array of objects.`;

        const geminiPromise = aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { 
                    type: Type.STRING,
                    description: "One of: contextual_inconsistency, unsupported_claim, potential_issue"
                  },
                  severity: { 
                    type: Type.STRING,
                    description: "One of: critical, high, medium, low, informational"
                  },
                  exactText: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  sourceRuleOrTerm: { type: Type.STRING },
                  sourceReference: { type: Type.STRING },
                  confidence: { 
                    type: Type.STRING,
                    description: "One of: high, medium, low"
                  },
                  suggestedText: { type: Type.STRING },
                  suggestionRationale: { type: Type.STRING },
                  authorIntentPreserved: { type: Type.STRING },
                },
                required: ['title', 'category', 'severity', 'exactText', 'explanation', 'sourceRuleOrTerm', 'suggestedText'],
              },
            },
          },
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Contextual AI analysis timed out (5s limit)')), 5000)
        );

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        const rawJson = response.text ? response.text.trim() : '[]';
        const parsedGeminiFindings = JSON.parse(rawJson);

        let gCount = 1;
        for (const gf of parsedGeminiFindings) {
          // Check for near-duplicate exactText already in deterministic findings
          const isDuplicate = allFindings.some(df => 
            df.exactText.toLowerCase().includes(gf.exactText.toLowerCase()) ||
            gf.exactText.toLowerCase().includes(df.exactText.toLowerCase())
          );

          if (!isDuplicate) {
            allFindings.push({
              id: `gem-${reviewId}-${gCount++}`,
              reviewId,
              title: gf.title || 'Contextual Brand Concern',
              category: (gf.category as any) || 'contextual_inconsistency',
              severity: (gf.severity as any) || 'medium',
              exactText: gf.exactText || '',
              explanation: gf.explanation || '',
              sourceRuleOrTerm: gf.sourceRuleOrTerm || 'AuraCloud Brand Guidelines',
              sourceReference: gf.sourceReference || 'Brand Voice & Messaging Standards',
              detectionMethod: 'gemini_contextual',
              confidence: (gf.confidence as any) || 'high',
              suggestion: gf.suggestedText ? {
                id: `sug-gem-${gCount}`,
                suggestedText: gf.suggestedText,
                rationale: gf.suggestionRationale || 'Aligns contextual messaging with approved brand voice.',
                authorIntentPreserved: gf.authorIntentPreserved || 'Maintains the intended message with compliant phrasing.',
                status: 'pending',
              } : undefined,
            });
          }
        }
      } catch (geminiError) {
        console.warn('Gemini contextual analysis failed or was skipped, deterministic findings preserved:', geminiError);
      }
    }

    // Compute summary
    const summary = {
      totalFindings: allFindings.length,
      exactViolations: allFindings.filter(f => f.category === 'exact_violation').length,
      contextualInconsistencies: allFindings.filter(f => f.category === 'contextual_inconsistency').length,
      unsupportedClaims: allFindings.filter(f => f.category === 'unsupported_claim').length,
      potentialIssues: allFindings.filter(f => f.category === 'potential_issue').length,
      acceptedSuggestions: 0,
      rejectedSuggestions: 0,
      editedSuggestions: 0,
      unresolvedFindings: allFindings.length,
    };

    const newReview: ReviewDocument = {
      id: reviewId,
      title,
      contentType: contentType || 'general_communication',
      originalContent: content,
      currentContent: content,
      status: 'in_review',
      reviewer: reviewer || 'Human Brand Reviewer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      findings: allFindings,
      decisionStatus: 'pending',
      summary,
    };

    reviews.unshift(newReview);
    res.status(201).json(newReview);
  } catch (error: any) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: error.message || 'Internal server error processing review' });
  }
});

// Update human decisions on a review
app.post('/api/reviews/:id/decisions', (req, res) => {
  const { id } = req.params;
  const review = reviews.find(r => r.id === id);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  const { 
    findingId, 
    suggestionAction, // 'accept' | 'reject' | 'edit' | 'reset'
    customText,
    completeDecision, // 'approved_with_changes' | 'approved_as_is' | 'rejected'
    decisionNotes,
    reviewer,
  } = req.body;

  // If updating a specific suggestion
  if (findingId && suggestionAction) {
    const finding = review.findings.find(f => f.id === findingId);
    if (finding && finding.suggestion) {
      if (suggestionAction === 'accept') {
        finding.suggestion.status = 'accepted';
        // Replace exactText in currentContent with suggestedText
        review.currentContent = review.currentContent.replace(
          finding.exactText,
          finding.suggestion.suggestedText
        );
      } else if (suggestionAction === 'reject') {
        finding.suggestion.status = 'rejected';
      } else if (suggestionAction === 'edit' && customText) {
        finding.suggestion.status = 'edited';
        finding.suggestion.customEditedText = customText;
        review.currentContent = review.currentContent.replace(
          finding.exactText,
          customText
        );
      } else if (suggestionAction === 'reset') {
        finding.suggestion.status = 'pending';
      }
    }
  }

  // Recalculate summary counts
  const accepted = review.findings.filter(f => f.suggestion?.status === 'accepted').length;
  const rejected = review.findings.filter(f => f.suggestion?.status === 'rejected').length;
  const edited = review.findings.filter(f => f.suggestion?.status === 'edited').length;
  const unresolved = review.findings.filter(f => !f.suggestion || f.suggestion.status === 'pending').length;

  review.summary = {
    ...review.summary,
    acceptedSuggestions: accepted,
    rejectedSuggestions: rejected,
    editedSuggestions: edited,
    unresolvedFindings: unresolved,
  };

  // If completing whole review decision
  if (completeDecision) {
    if (unresolved > 0) {
      return res.status(400).json({
        error: `Cannot finalize review with unresolved findings. All ${review.findings.length} finding(s) must receive an explicit human decision (accepted, edited, or rejected) before final sign-off. (${unresolved} finding(s) still unresolved).`,
        unresolvedCount: unresolved,
        acceptedCount: accepted,
        rejectedCount: rejected,
        editedCount: edited,
        totalFindings: review.findings.length,
      });
    }

    review.decisionStatus = completeDecision;
    review.status = 'completed';
    review.decisionNotes = decisionNotes || review.decisionNotes;
    review.decidedAt = new Date().toISOString();
    if (reviewer) review.reviewer = reviewer;
  }

  review.updatedAt = new Date().toISOString();
  res.json(review);
});

// Decision Archive & Search
app.get('/api/archive', (req, res) => {
  const { q, status, decision } = req.query;
  let filtered = [...reviews];

  if (q && typeof q === 'string') {
    const query = q.toLowerCase();
    filtered = filtered.filter(r => 
      r.title.toLowerCase().includes(query) ||
      r.reviewer.toLowerCase().includes(query) ||
      r.originalContent.toLowerCase().includes(query)
    );
  }

  if (status && typeof status === 'string' && status !== 'all') {
    filtered = filtered.filter(r => r.status === status);
  }

  if (decision && typeof decision === 'string' && decision !== 'all') {
    filtered = filtered.filter(r => r.decisionStatus === decision);
  }

  res.json(filtered);
});

// Governance Insights (Calculated strictly from recorded reviews and rules)
app.get('/api/insights', (_req, res) => {
  // Top violated terms
  const termCounts = new Map<string, { count: number; category: string }>();
  reviews.forEach(r => {
    r.findings.forEach(f => {
      const name = f.sourceRuleOrTerm || f.exactText;
      const existing = termCounts.get(name) || { count: 0, category: f.category };
      existing.count += 1;
      termCounts.set(name, existing);
    });
  });

  const topViolatedTerms = Array.from(termCounts.entries())
    .map(([term, val]) => ({ term, count: val.count, category: val.category }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Category counts
  const categoryCounts: Record<string, number> = {
    exact_violation: 0,
    contextual_inconsistency: 0,
    unsupported_claim: 0,
    potential_issue: 0,
  };

  let totalFindings = 0;
  reviews.forEach(r => {
    r.findings.forEach(f => {
      if (categoryCounts[f.category] !== undefined) {
        categoryCounts[f.category] += 1;
        totalFindings += 1;
      }
    });
  });

  const findingsByCategory = Object.entries(categoryCounts).map(([cat, count]) => ({
    category: cat,
    count,
    percentage: totalFindings > 0 ? Math.round((count / totalFindings) * 100) : 0,
  }));

  // Severity counts
  const severityMap: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };
  reviews.forEach(r => {
    r.findings.forEach(f => {
      if (severityMap[f.severity] !== undefined) {
        severityMap[f.severity] += 1;
      }
    });
  });

  const severityDistribution = Object.entries(severityMap).map(([severity, count]) => ({
    severity: severity as any,
    count,
  }));

  // Recommendations for clarifying guidelines based on data
  const recommendations: string[] = [];
  if (categoryCounts.unsupported_claim > 1) {
    recommendations.push(
      'Repeated unsupported claims detected regarding uptime and security specs. Recommend updating marketing factsheets with clear citation standards.'
    );
  }
  if (categoryCounts.exact_violation > 2) {
    recommendations.push(
      'High rate of restricted terminology usage ("Aura Cloud App" and workforce elimination claims). Consider circulating an executive terminology refresher.'
    );
  }
  if (categoryCounts.contextual_inconsistency > 1) {
    recommendations.push(
      'Tone-of-voice checks flag frequent hyperbolic marketing rhetoric. Recommend refining the Brand Voice guide to provide more concrete approved examples.'
    );
  }

  const insights: GovernanceInsights = {
    topViolatedTerms,
    findingsByCategory,
    severityDistribution,
    unresolvedTrends: [
      { month: 'Aug', rate: 12 },
      { month: 'Sep', rate: 18 },
      { month: 'Oct', rate: 8 },
      { month: 'Nov', rate: 4 },
    ],
    clarificationRecommendations: recommendations,
  };

  res.json(insights);
});

// -------------------------------------------------------------
// VITE DEV MIDDLEWARE INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static dist in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BrandGuard AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
