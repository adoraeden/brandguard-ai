import re
from typing import List, Dict, Any, Tuple
from models import ReviewFindingModel, SuggestionModel, TerminologyEntryModel, BrandGuidelineModel, ApprovedFactModel

def run_python_deterministic_checks(
    content: str,
    terminology: List[TerminologyEntryModel],
    guidelines: List[BrandGuidelineModel],
    facts: List[ApprovedFactModel],
    review_id: str
) -> List[ReviewFindingModel]:
    findings: List[ReviewFindingModel] = []
    text = content
    finding_counter = 1

    # 1. Terminology scanning (Exact matching with boundary awareness)
    for term in terminology:
        if term.status != 'active':
            continue
        restricted = term.restrictedTerm.strip()
        if not restricted:
            continue

        escaped = re.escape(restricted)
        pattern = re.compile(rf'\b{escaped}\b', re.IGNORECASE)

        for match in pattern.finditer(text):
            matched_text = match.group(0)
            start_idx = match.start()
            end_idx = match.end()

            severity = 'critical' if term.category in ['product_naming', 'capability_claim'] else 'high'

            finding = ReviewFindingModel(
                id=f"det-{review_id}-{finding_counter}",
                reviewId=review_id,
                title=f'Restricted Term: "{matched_text}"',
                category='exact_violation',
                severity=severity,
                exactText=matched_text,
                startIndex=start_idx,
                endIndex=end_idx,
                explanation=term.explanation,
                sourceRuleOrTerm=f"Terminology: {term.preferredTerm}",
                sourceReference=f"Approved Terminology Catalogue §{term.category}",
                detectionMethod='deterministic_rule',
                confidence='high',
                suggestion=SuggestionModel(
                    id=f"sug-det-{finding_counter}",
                    suggestedText=term.approvedAlternative,
                    rationale=f'Replace restricted term with approved standard: "{term.approvedAlternative}".',
                    authorIntentPreserved="Preserves original message while complying with naming standards.",
                    status='pending'
                )
            )
            finding_counter += 1
            findings.append(finding)

    # 2. Guideline prohibited examples exact scan
    for g in guidelines:
        if g.status != 'active' or not g.examples or not g.examples.get('prohibited'):
            continue
        prohibited = g.examples.get('prohibited', '').strip()
        if not prohibited:
            continue

        escaped = re.escape(prohibited)
        pattern = re.compile(escaped, re.IGNORECASE)

        for match in pattern.finditer(text):
            matched_text = match.group(0)
            start_idx = match.start()
            end_idx = match.end()

            # Prevent duplicate overlap
            if any(abs((f.startIndex or -1) - start_idx) < 5 for f in findings):
                continue

            approved_ex = g.examples.get('approved', '')
            suggestion = None
            if approved_ex:
                suggestion = SuggestionModel(
                    id=f"sug-det-{finding_counter}",
                    suggestedText=approved_ex,
                    rationale=f"Guideline mandate: {g.title}",
                    authorIntentPreserved="Maintains compliant corporate wording.",
                    status='pending'
                )

            finding = ReviewFindingModel(
                id=f"det-{review_id}-{finding_counter}",
                reviewId=review_id,
                title=f"Guideline Violation: {g.title}",
                category='exact_violation',
                severity=g.severity,
                exactText=matched_text,
                startIndex=start_idx,
                endIndex=end_idx,
                explanation=g.description,
                sourceRuleOrTerm=g.title,
                sourceReference=g.sourceReference,
                detectionMethod='deterministic_rule',
                confidence='high',
                suggestion=suggestion
            )
            finding_counter += 1
            findings.append(finding)

    # 3. Known Fact Inconsistencies & Unsupported Claims
    fact_rules = [
        {
            'pattern': re.compile(r'100%\s*(zero[\s-]downtime|uninterrupted|never fails)', re.IGNORECASE),
            'title': 'False 100% Availability Claim',
            'category': 'unsupported_claim',
            'severity': 'high',
            'suggested': '99.95% verified uptime SLA',
            'explanation': 'Contradicts verified engineering SLA of 99.95% with multi-region failover.',
            'source': 'Engineering Operational SLA Agreement v4.2, 2026'
        },
        {
            'pattern': re.compile(r'(military-grade|unhackable\s*shield|bulletproof\s*security)', re.IGNORECASE),
            'title': 'Unverified Security Hyperbole',
            'category': 'unsupported_claim',
            'severity': 'high',
            'suggested': 'SOC-2 Type II certified and AES-256 encrypted',
            'explanation': 'AuraCloud relies on SOC-2 Type II audited controls and AES-256 encryption at rest, not colloquial military-grade claims.',
            'source': 'Independent Security Audit Report (Grant Thornton, Aug 2026)'
        },
        {
            'pattern': re.compile(r'(guaranteed\s*regulatory\s*immunity|100%\s*legal\s*immunity)', re.IGNORECASE),
            'title': 'Unsubstantiated Legal Immunity Claim',
            'category': 'unsupported_claim',
            'severity': 'critical',
            'suggested': 'HIPAA and GDPR compliance support',
            'explanation': 'Legal violation: platform software cannot confer legal immunity from regulatory audits.',
            'source': 'Legal & Risk Communications Manual 2026, §5.1'
        },
        {
            'pattern': re.compile(r'(cheap\s*unlimited\s*lifetime\s*access|free\s*forever\s*unlimited)', re.IGNORECASE),
            'title': 'Contradicts Commercial Licensing Policy',
            'category': 'exact_violation',
            'severity': 'medium',
            'suggested': 'custom enterprise annual licensing',
            'explanation': 'Commercial policy dictates annual seat subscriptions. Lifetime tiers do not exist.',
            'source': 'Commercial Licensing Directory 2026'
        }
    ]

    for f_rule in fact_rules:
        for match in f_rule['pattern'].finditer(text):
            matched_text = match.group(0)
            start_idx = match.start()
            end_idx = match.end()

            if any(abs((f.startIndex or -1) - start_idx) < 5 for f in findings):
                continue

            finding = ReviewFindingModel(
                id=f"det-{review_id}-{finding_counter}",
                reviewId=review_id,
                title=f_rule['title'],
                category=f_rule['category'],
                severity=f_rule['severity'],
                exactText=matched_text,
                startIndex=start_idx,
                endIndex=end_idx,
                explanation=f_rule['explanation'],
                sourceRuleOrTerm=f"Factsheet: {f_rule['title']}",
                sourceReference=f_rule['source'],
                detectionMethod='fact_check',
                confidence='high',
                suggestion=SuggestionModel(
                    id=f"sug-det-{finding_counter}",
                    suggestedText=f_rule['suggested'],
                    rationale=f"Align with verified facts: {f_rule['explanation']}",
                    authorIntentPreserved="Preserves value proposition grounded in audited facts.",
                    status='pending'
                )
            )
            finding_counter += 1
            findings.append(finding)

    return findings
