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

            severity = getattr(term, 'priority', None) or ('critical' if term.category in ['product_naming', 'capability_claim'] else 'high')

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
                evidenceRecordType='terminology',
                evidenceRecordId=term.id,
                evidenceQuote=term.restrictedTerm,
                detectionMethod='deterministic_rule',
                confidence='high',
                suggestion=SuggestionModel(
                    id=f"sug-det-{review_id}-{finding_counter}",
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
                    id=f"sug-det-{review_id}-{finding_counter}",
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
            'explanation': 'This absolute availability claim requires direct support from a current approved SLA. No linked approved fact is attached to this deterministic rule, so verify the claim before publication.',
            'source': 'No directly linked approved evidence in the current evidence registry'
        },
        {
            'pattern': re.compile(r'(military-grade|unhackable\s*shield|bulletproof\s*security)', re.IGNORECASE),
            'title': 'Unverified Security Hyperbole',
            'category': 'unsupported_claim',
            'severity': 'high',
            'suggested': 'SOC-2 Type II certified and AES-256 encrypted',
            'explanation': 'This security superlative requires direct support from a current approved security source. No linked approved fact is attached to this deterministic rule, so verify the claim before publication.',
            'source': 'No directly linked approved evidence in the current evidence registry'
        },
        {
            'pattern': re.compile(r'(guaranteed\s*regulatory\s*immunity|100%\s*legal\s*immunity)', re.IGNORECASE),
            'title': 'Unsubstantiated Legal Immunity Claim',
            'category': 'unsupported_claim',
            'severity': 'critical',
            'suggested': 'HIPAA and GDPR compliance support',
            'explanation': 'A claim of guaranteed legal or regulatory immunity is high risk and requires review against approved legal guidance. No linked approved source is attached to this deterministic rule.',
            'source': 'No directly linked approved evidence in the current evidence registry'
        },
        {
            'pattern': re.compile(r'(cheap\s*unlimited\s*lifetime\s*access|free\s*forever\s*unlimited)', re.IGNORECASE),
            'title': 'Contradicts Commercial Licensing Policy',
            'category': 'exact_violation',
            'severity': 'medium',
            'suggested': 'custom enterprise annual licensing',
            'explanation': 'This pricing and licensing claim must be checked against the current approved commercial policy. No linked approved fact is attached to this deterministic rule.',
            'source': 'No directly linked approved evidence in the current evidence registry'
        },
        {
            'pattern': re.compile(r'\bexplainable\s+AI\s+insights\b', re.IGNORECASE),
            'title': 'Unsubstantiated AI Explainability Claim',
            'category': 'unsupported_claim',
            'severity': 'medium',
            'suggested': None,
            'explanation': 'The current approved AuraCloud evidence registry does not describe the explainability mechanism, validation trail, or controls behind this claim. Provide approved technical evidence or reword the statement before publication.',
            'source': 'No directly relevant approved source in the current AuraCloud evidence registry'
        }
    ]

    for f_rule in fact_rules:
        for match in f_rule['pattern'].finditer(text):
            matched_text = match.group(0)
            start_idx = match.start()
            end_idx = match.end()

            if any(abs((f.startIndex or -1) - start_idx) < 5 for f in findings):
                continue

            suggestion = None
            if f_rule.get('suggested'):
                suggestion = SuggestionModel(
                    id=f"sug-det-{review_id}-{finding_counter}",
                    suggestedText=f_rule['suggested'],
                    rationale=f"Align with verified facts: {f_rule['explanation']}",
                    authorIntentPreserved="Preserves value proposition grounded in audited facts.",
                    status='pending'
                )

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
                sourceRuleOrTerm=(
                    "Insufficient Evidence"
                ),
                sourceReference=f_rule['source'],
                detectionMethod='fact_check',
                confidence='high',
                suggestion=suggestion
            )
            finding_counter += 1
            findings.append(finding)

    return findings
