import unittest
from types import SimpleNamespace

from routers.reviews import enrich_finding_evidence
from models import TerminologyEntryModel
from rule_engine import run_python_deterministic_checks
from gemini_analyzer import _approved_evidence, _retrieve_evidence, _evidence_matches_claim
from database import DBApprovedFact
from storage import fact_model


def finding(category, record_type=None, record_id=None, quote=None):
    return SimpleNamespace(
        category=category,
        evidenceRecordType=record_type,
        evidenceRecordId=record_id,
        evidenceQuote=quote,
        evidenceStatus=None,
        sourceDocumentId=None,
        sourcePageNumber=None,
        sourceSectionLabel=None,
        sourceExcerpt=None,
    )


class FakeDatabase:
    def __init__(self, documents):
        self.documents = documents

    def get(self, model, document_id):
        return self.documents.get(document_id)


class EvidenceTraceabilityTests(unittest.TestCase):
    def test_direct_contradiction_is_marked_conflicting(self):
        item = finding("direct_contradiction", "fact", "fact-1", "99.9% monthly availability")
        fact = SimpleNamespace(
            id="fact-1", sourceDocumentId="doc-1", sourcePageNumber=2,
            sourceSectionLabel="Availability", sourceExcerpt="Approved SLA passage",
        )
        enrich_finding_evidence([item], [], [fact])
        self.assertEqual(item.evidenceStatus, "conflicting")
        self.assertEqual(item.sourceDocumentId, "doc-1")
        self.assertEqual(item.sourcePageNumber, 2)
        self.assertEqual(item.sourceSectionLabel, "Availability")

    def test_claim_without_approved_evidence_is_unsupported(self):
        item = finding("unsupported_claim")
        enrich_finding_evidence([item], [], [])
        self.assertEqual(item.evidenceStatus, "unsupported")

    def test_policy_reference_is_only_partially_supporting(self):
        item = finding("contextual_inconsistency", "guideline", "guide-1", "Avoid absolute security guarantees.")
        guideline = SimpleNamespace(
            id="guide-1", sourceDocumentId=None, sourcePageNumber=None,
            sourceSectionLabel=None, sourceExcerpt=None,
        )
        enrich_finding_evidence([item], [guideline], [])
        self.assertEqual(item.evidenceStatus, "partially_supported")

    def test_uploaded_knowledge_source_resolves_original_page(self):
        quote = "The platform uses TLS 1.3 for data in transit."
        item = finding("direct_contradiction", "knowledge_source", "source-1", quote)
        source = SimpleNamespace(
            id="source-1",
            url="internal://api/documents/doc-1/download",
            sourceDocumentId=None,
            sourcePageNumber=None,
            sourceSectionLabel=None,
            sourceExcerpt=None,
        )
        document = SimpleNamespace(extracted_pages=[{
            "pageNumber": 4,
            "sectionLabel": "Transport Security",
            "text": "Security controls. " + quote + " Additional notes.",
        }])
        db = FakeDatabase({"doc-1": document})
        enrich_finding_evidence([item], [], [], [source], db)
        self.assertEqual(item.evidenceStatus, "conflicting")
        self.assertEqual(item.sourceDocumentId, "doc-1")
        self.assertEqual(item.sourcePageNumber, 4)
        self.assertEqual(item.sourceSectionLabel, "Transport Security")
        self.assertEqual(item.sourceExcerpt, quote)


    def test_exact_deterministic_terminology_violation_is_fully_supported_by_approved_rule(self):
        item = finding("exact_violation", "terminology", "term-1", "AuraCloud App")
        item.detectionMethod = "deterministic_rule"
        term = SimpleNamespace(id="term-1", term="AuraCloud App", approvedReplacement="AuraCloud Workspace")
        enrich_finding_evidence([item], [], [], terminology=[term])
        self.assertEqual(item.evidenceStatus, "supported")

    def test_contextual_policy_reference_remains_partially_supporting(self):
        item = finding("contextual_inconsistency", "guideline", "guide-1", "Avoid absolute security guarantees.")
        item.detectionMethod = "gemini_contextual"
        guideline = SimpleNamespace(
            id="guide-1", sourceDocumentId=None, sourcePageNumber=None,
            sourceSectionLabel=None, sourceExcerpt=None,
        )
        enrich_finding_evidence([item], [guideline], [])
        self.assertEqual(item.evidenceStatus, "partially_supported")


    def test_real_deterministic_terminology_match_links_catalogue_and_is_not_mislabelled_unassessed(self):
        term = TerminologyEntryModel(
            id="term-aura-app",
            preferredTerm="AuraCloud Workspace",
            restrictedTerm="AuraCloud App",
            explanation="Use the approved product name.",
            approvedAlternative="AuraCloud Workspace",
            category="product_naming",
            createdAt="2026-11-12",
        )
        findings = run_python_deterministic_checks(
            "Meet the AuraCloud App team.", [term], [], [], "review-term-test"
        )
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].evidenceRecordType, "terminology")
        self.assertEqual(findings[0].evidenceRecordId, term.id)
        self.assertEqual(findings[0].evidenceQuote, "AuraCloud App")
        enrich_finding_evidence(findings, [], [], terminology=[term])
        self.assertEqual(findings[0].evidenceStatus, "partially_supported")


    def test_hardcoded_high_risk_rule_does_not_invent_approved_source(self):
        findings = run_python_deterministic_checks(
            "Our platform guarantees 100% zero downtime.",
            [], [], [], "review-unlinked-claim"
        )
        self.assertEqual(len(findings), 1)
        item = findings[0]
        self.assertEqual(item.sourceRuleOrTerm, "Insufficient Evidence")
        self.assertIn("No directly linked approved evidence", item.sourceReference)
        self.assertIsNone(item.evidenceRecordId)
        enrich_finding_evidence(findings, [], [])
        self.assertEqual(item.evidenceStatus, "unsupported")


    def test_uploaded_approved_fact_keeps_exact_document_provenance(self):
        quote = "The service provides a 99.95% verified uptime SLA."
        item = finding("direct_contradiction", "fact", "fact-uploaded", quote)
        fact = SimpleNamespace(
            id="fact-uploaded", sourceDocumentId="doc-uploaded",
            sourcePageNumber=2, sourceSectionLabel="Availability",
            sourceExcerpt=quote,
        )
        enrich_finding_evidence([item], [], [fact])
        self.assertEqual(item.evidenceStatus, "conflicting")
        self.assertEqual(item.sourceDocumentId, "doc-uploaded")
        self.assertEqual(item.sourcePageNumber, 2)
        self.assertEqual(item.sourceSectionLabel, "Availability")
        self.assertEqual(item.sourceExcerpt, quote)

    def test_approved_guideline_is_not_misrepresented_as_factual_proof(self):
        item = finding("contextual_inconsistency", "guideline", "guide-uploaded", "Use measured claims.")
        guideline = SimpleNamespace(
            id="guide-uploaded", sourceDocumentId="doc-guide",
            sourcePageNumber=1, sourceSectionLabel="Claims",
            sourceExcerpt="All measurable claims must cite approved evidence.",
        )
        enrich_finding_evidence([item], [guideline], [])
        self.assertEqual(item.evidenceStatus, "partially_supported")
        self.assertEqual(item.sourceDocumentId, "doc-guide")
        self.assertEqual(item.sourcePageNumber, 1)
        self.assertEqual(item.sourceExcerpt, "All measurable claims must cite approved evidence.")


    def test_ingested_approved_fact_flows_into_review_retrieval_and_traceability(self):
        # This mirrors the records created by documents.decide_candidate after a
        # human approves an extracted passage as a fact.
        approved_text = "The service provides a 99.95% verified uptime SLA."
        fact = SimpleNamespace(
            id="fact-ingestion-e2e",
            title="Verified uptime SLA",
            statement=approved_text,
            category="product_specs",
            source="Reliability Guide.pdf, page 2, section Availability",
            verificationStatus="verified",
            sourceDocumentId="doc-ingestion-e2e",
            sourcePageNumber=2,
            sourceSectionLabel="Availability",
            sourceExcerpt=approved_text,
        )
        provisional_fact = SimpleNamespace(
            id="fact-not-approved",
            title="Unreviewed uptime",
            statement="The service guarantees 100% uptime.",
            category="product_specs",
            source="Unreviewed upload",
            verificationStatus="provisional",
            sourceExcerpt="The service guarantees 100% uptime.",
        )

        # The analyzer's approved catalogue must include the approved fact,
        # preserve its original excerpt, and exclude unapproved facts.
        catalogue = _approved_evidence([], [], [fact, provisional_fact], [])
        self.assertEqual([record.id for record in catalogue], ["fact-ingestion-e2e"])
        self.assertEqual(catalogue[0].kind, "fact")
        self.assertIn(approved_text, catalogue[0].text)

        # The claim under review must retrieve the newly approved fact.
        claim = "AuraCloud provides a 99.95% verified uptime SLA."
        retrieved = _retrieve_evidence(catalogue, claim, "Reliability claim")
        self.assertEqual(len(retrieved), 1)
        evidence = retrieved[0]
        self.assertEqual(evidence.id, fact.id)
        self.assertTrue(_evidence_matches_claim(claim, evidence, approved_text))

        # Once a finding cites that exact record and quote, enrichment must
        # attach the original document, page, section, and excerpt.
        item = finding("direct_contradiction", "fact", fact.id, approved_text)
        enrich_finding_evidence([item], [], [fact])
        self.assertEqual(item.evidenceStatus, "conflicting")
        self.assertEqual(item.sourceDocumentId, "doc-ingestion-e2e")
        self.assertEqual(item.sourcePageNumber, 2)
        self.assertEqual(item.sourceSectionLabel, "Availability")
        self.assertEqual(item.sourceExcerpt, approved_text)

    def test_approved_guideline_enters_contextual_evidence_catalogue(self):
        guideline = SimpleNamespace(
            id="guideline-ingestion-e2e",
            title="Evidence-backed claims",
            description="All measurable claims must cite approved evidence.",
            sourceReference="Brand Voice Guide.pdf, page 1, section Claims",
            status="active",
            category="writing_standards",
            examples={},
            sourceExcerpt="All measurable claims must cite approved evidence.",
        )
        catalogue = _approved_evidence([guideline], [], [], [])
        self.assertEqual(len(catalogue), 1)
        self.assertEqual(catalogue[0].kind, "guideline")
        self.assertIn("All measurable claims must cite approved evidence.", catalogue[0].text)


    def test_database_approved_fact_mapping_preserves_ingestion_provenance_for_analyzer(self):
        original_excerpt = "The service provides a 99.95% verified uptime SLA."
        database_row = DBApprovedFact(
            id="fact-db-ingestion",
            title="Verified uptime SLA",
            statement=original_excerpt,
            category="product_specs",
            source="Reliability Guide.pdf, page 2, section Availability",
            verification_status="verified",
            last_updated="2026-11-12",
            source_document_id="doc-db-ingestion",
            source_page_number=2,
            source_section_label="Availability",
            source_excerpt=original_excerpt,
        )
        mapped_fact = fact_model(database_row)
        self.assertEqual(mapped_fact.sourceDocumentId, "doc-db-ingestion")
        self.assertEqual(mapped_fact.sourcePageNumber, 2)
        self.assertEqual(mapped_fact.sourceSectionLabel, "Availability")
        self.assertEqual(mapped_fact.sourceExcerpt, original_excerpt)

        catalogue = _approved_evidence([], [], [mapped_fact], [])
        self.assertEqual(len(catalogue), 1)
        self.assertEqual(catalogue[0].id, "fact-db-ingestion")
        self.assertIn(original_excerpt, catalogue[0].text)

if __name__ == "__main__":
    unittest.main()
