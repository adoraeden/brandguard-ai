import os
import json
from typing import List
from models import ReviewFindingModel, SuggestionModel, BrandGuidelineModel, ApprovedFactModel

def run_gemini_contextual_analysis(
    content: str,
    title: str,
    content_type: str,
    guidelines: List[BrandGuidelineModel],
    facts: List[ApprovedFactModel],
    review_id: str,
    existing_findings: List[ReviewFindingModel]
) -> List[ReviewFindingModel]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        guideline_summary = "\n".join([
            f"- [{g.category}] {g.title}: {g.description} (Ref: {g.sourceReference})"
            for g in guidelines if g.status == 'active'
        ])
        fact_summary = "\n".join([
            f"- [{f.category}] {f.title}: {f.statement} (Source: {f.source})"
            for f in facts
        ])

        prompt = f"""You are the contextual brand governance review engine for AuraCloud Technologies.
Analyze the following marketing/communication draft against the brand guidelines and facts below.

ORGANIZATION BRAND GUIDELINES:
{guideline_summary}

VERIFIED COMPANY FACTS:
{fact_summary}

DRAFT METADATA:
Content Type: {content_type}
Title: {title}

DRAFT CONTENT:
\"\"\"
{content}
\"\"\"

INSTRUCTIONS:
1. Identify contextual brand inconsistencies (tone of voice deviations, hyperbolic marketing promises, worker elimination rhetoric, false guarantees).
2. Identify unsupported claims that cannot be substantiated by verified facts.
3. Identify potential issues where wording is ambiguous or misleading.
4. Do NOT re-flag items already caught deterministically.
5. For EVERY finding, provide an intent-preserving suggestion that preserves the original author's meaning while adhering to brand standards.

Return a JSON array of objects with keys:
title, category ('contextual_inconsistency', 'unsupported_claim', 'potential_issue'), severity ('critical', 'high', 'medium', 'low', 'informational'), exactText, explanation, sourceRuleOrTerm, sourceReference, confidence ('high', 'medium', 'low'), suggestedText, suggestionRationale, authorIntentPreserved.
"""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        data = json.loads(response.text or "[]")
        additional_findings: List[ReviewFindingModel] = []
        g_count = 1

        for item in data:
            exact_text = item.get('exactText', '')
            if any(exact_text.lower() in ef.exactText.lower() or ef.exactText.lower() in exact_text.lower() for ef in existing_findings):
                continue

            finding = ReviewFindingModel(
                id=f"gem-{review_id}-{g_count}",
                reviewId=review_id,
                title=item.get('title', 'Contextual Brand Inconsistency'),
                category=item.get('category', 'contextual_inconsistency'),
                severity=item.get('severity', 'medium'),
                exactText=exact_text,
                explanation=item.get('explanation', ''),
                sourceRuleOrTerm=item.get('sourceRuleOrTerm', 'Brand Guidelines'),
                sourceReference=item.get('sourceReference', 'Brand Voice & Messaging Standards'),
                detectionMethod='gemini_contextual',
                confidence=item.get('confidence', 'high'),
                suggestion=SuggestionModel(
                    id=f"sug-gem-{g_count}",
                    suggestedText=item.get('suggestedText', ''),
                    rationale=item.get('suggestionRationale', 'Align with approved brand tone.'),
                    authorIntentPreserved=item.get('authorIntentPreserved', 'Preserves original intent.'),
                    status='pending'
                ) if item.get('suggestedText') else None
            )
            g_count += 1
            additional_findings.append(finding)

        return additional_findings

    except Exception as e:
        print(f"Gemini contextual analysis error: {e}")
        return []
