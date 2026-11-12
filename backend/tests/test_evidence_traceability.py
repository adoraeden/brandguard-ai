import unittest
from types import SimpleNamespace

from routers.reviews import enrich_finding_evidence


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


if __name__ == "__main__":
    unittest.main()
