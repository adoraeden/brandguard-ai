import { TerminologyEntry, BrandGuideline, ApprovedFact, ReviewFinding } from '../types';

export interface DeterministicResult {
  findings: ReviewFinding[];
  exactMatchesCount: number;
}

export function runDeterministicChecks(
  content: string,
  terminology: TerminologyEntry[],
  guidelines: BrandGuideline[],
  facts: ApprovedFact[],
  reviewId: string
): DeterministicResult {
  const findings: ReviewFinding[] = [];
  const text = content;
  let findingIdCounter = 1;

  // 1. Terminology scanning (Exact phrase matches)
  for (const term of terminology) {
    if (term.status !== 'active') continue;
    const searchTarget = term.restrictedTerm.trim();
    if (!searchTarget) continue;

    // Boundary-aware search or substring
    const escaped = searchTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, term.matchCaseSensitive ? 'g' : 'gi');

    let match;
    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const matchedText = match[0];

      // Determine severity based on category
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'high';
      if (term.category === 'product_naming' || term.category === 'capability_claim') {
        severity = 'critical';
      } else if (term.category === 'security') {
        severity = 'high';
      }

      findings.push({
        id: `det-${reviewId}-${findingIdCounter++}`,
        reviewId,
        title: `Restricted Term: "${matchedText}"`,
        category: 'exact_violation',
        severity,
        exactText: matchedText,
        startIndex: matchIndex,
        endIndex: matchIndex + matchedText.length,
        explanation: term.explanation,
        sourceRuleOrTerm: `Terminology: ${term.preferredTerm}`,
        sourceReference: `Approved Terminology Catalogue §${term.category}`,
        detectionMethod: 'deterministic_rule',
        confidence: 'high',
        suggestion: {
          id: `sug-det-${findingIdCounter}`,
          suggestedText: term.approvedAlternative,
          rationale: `Replace prohibited terminology with approved brand standard: "${term.approvedAlternative}".`,
          authorIntentPreserved: `Maintains the intended message while removing restricted phrasing.`,
          status: 'pending',
        },
      });
    }
  }

  // 2. Guideline prohibited examples exact scan
  for (const guideline of guidelines) {
    if (guideline.status !== 'active' || !guideline.examples?.prohibited) continue;

    const prohibitedSample = guideline.examples.prohibited.trim();
    if (!prohibitedSample) continue;

    // Look for key phrases or exact prohibited text
    const escaped = prohibitedSample.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');

    let match;
    while ((match = regex.exec(text)) !== null) {
      // Avoid duplicate overlapping findings
      const matchIndex = match.index;
      const matchedText = match[0];
      const alreadyFlagged = findings.some(
        f => Math.abs((f.startIndex ?? -1) - matchIndex) < 5
      );
      if (alreadyFlagged) continue;

      findings.push({
        id: `det-${reviewId}-${findingIdCounter++}`,
        reviewId,
        title: `Guideline Violation: ${guideline.title}`,
        category: 'exact_violation',
        severity: guideline.severity,
        exactText: matchedText,
        startIndex: matchIndex,
        endIndex: matchIndex + matchedText.length,
        explanation: guideline.description,
        sourceRuleOrTerm: guideline.title,
        sourceReference: guideline.sourceReference,
        detectionMethod: 'deterministic_rule',
        confidence: 'high',
        suggestion: guideline.examples.approved ? {
          id: `sug-det-${findingIdCounter}`,
          suggestedText: guideline.examples.approved,
          rationale: `Guideline recommendation: Use approved corporate wording.`,
          authorIntentPreserved: `Preserves author intent under compliance guidelines.`,
          status: 'pending',
        } : undefined,
      });
    }
  }

  // 3. Factual claim verification (Deterministic check for common known false/distorted claims)
  const knownFactViolations = [
    {
      pattern: /100%\s*(zero[\s-]downtime|uninterrupted|never fails)/i,
      title: 'False 100% Availability Claim',
      category: 'unsupported_claim' as const,
      severity: 'high' as const,
      fact: facts.find(f => f.category === 'uptime_performance') ?? facts[0],
      suggestedText: '99.95% verified uptime SLA',
      explanation: 'Contradicts verified engineering SLA. AuraCloud guarantees 99.95% uptime with multi-region failover, not 100% zero downtime.',
    },
    {
      pattern: /(military-grade|unhackable\s*shield|bulletproof\s*security)/i,
      title: 'Unverified Security Hyperbole',
      category: 'unsupported_claim' as const,
      severity: 'high' as const,
      fact: facts.find(f => f.category === 'compliance_security') ?? facts[1],
      suggestedText: 'SOC-2 Type II certified and AES-256 encrypted',
      explanation: 'Unsupported security specification. AuraCloud is SOC-2 Type II certified with AES-256 at rest, not "military-grade unhackable".',
    },
    {
      pattern: /(guaranteed\s*regulatory\s*immunity|100%\s*legal\s*immunity)/i,
      title: 'Unsubstantiated Legal Immunity Claim',
      category: 'unsupported_claim' as const,
      severity: 'critical' as const,
      fact: facts.find(f => f.category === 'compliance_security') ?? facts[2],
      suggestedText: 'HIPAA and GDPR compliance support',
      explanation: 'Legal violation: software cannot confer immunity from regulatory audits or statutory duties.',
    },
    {
      pattern: /(cheap\s*unlimited\s*lifetime\s*access|free\s*forever\s*unlimited)/i,
      title: 'Contradicts Commercial Licensing Policy',
      category: 'exact_violation' as const,
      severity: 'medium' as const,
      fact: facts[0],
      suggestedText: 'enterprise annual subscription licensing',
      explanation: 'AuraCloud products are billed per-seat annually. Lifetime or consumer-budget tiering does not exist.',
    },
  ];

  for (const check of knownFactViolations) {
    const match = check.pattern.exec(text);
    if (match) {
      const matchIndex = match.index;
      const matchedText = match[0];
      const alreadyFlagged = findings.some(
        f => Math.abs((f.startIndex ?? -1) - matchIndex) < 5
      );
      if (alreadyFlagged) continue;

      findings.push({
        id: `det-${reviewId}-${findingIdCounter++}`,
        reviewId,
        title: check.title,
        category: check.category,
        severity: check.severity,
        exactText: matchedText,
        startIndex: matchIndex,
        endIndex: matchIndex + matchedText.length,
        explanation: check.explanation,
        sourceRuleOrTerm: check.fact ? `Factsheet: ${check.fact.title}` : 'Verified Factsheet Standard',
        sourceReference: check.fact ? check.fact.source : 'AuraCloud Verified Technical Registry',
        detectionMethod: 'fact_check',
        confidence: 'high',
        suggestion: {
          id: `sug-det-${findingIdCounter}`,
          suggestedText: check.suggestedText,
          rationale: `Substantiate with verified fact: ${check.fact ? check.fact.statement : check.suggestedText}`,
          authorIntentPreserved: `Preserves the communication benefit while ensuring factual accuracy.`,
          status: 'pending',
        },
      });
    }
  }

  return {
    findings,
    exactMatchesCount: findings.length,
  };
}
