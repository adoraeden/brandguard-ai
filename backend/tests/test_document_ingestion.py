import unittest

from document_ingestion import extract_document_pages, extract_evidence_candidates


class DocumentIngestionTests(unittest.TestCase):
    def test_txt_extraction_preserves_single_page_and_text(self):
        pages = extract_document_pages(
            "brand-rules.txt", "text/plain",
            b"Brand rules\nAll marketing claims must be supported by approved evidence.\nOur service provides a 99.95% verified uptime SLA.",
        )
        self.assertEqual(pages[0]["pageNumber"], 1)
        self.assertIn("99.95%", pages[0]["text"])

    def test_candidates_keep_exact_source_passage_and_type(self):
        pages = [{
            "pageNumber": 3,
            "sectionLabel": "Reliability",
            "text": (
                "The service provides a 99.95% verified uptime SLA. "
                "Marketing teams must cite approved evidence for measurable claims. "
                "This is a short heading."
            ),
        }]
        candidates = extract_evidence_candidates(pages)
        self.assertEqual(len(candidates), 2)
        self.assertEqual(candidates[0]["pageNumber"], 3)
        self.assertEqual(candidates[0]["sectionLabel"], "Reliability")
        self.assertIn(candidates[0]["excerpt"], pages[0]["text"])
        self.assertEqual({item["candidateType"] for item in candidates}, {"fact", "guideline"})

    def test_rejects_mime_extension_mismatch(self):
        with self.assertRaises(ValueError):
            extract_document_pages("brand.pdf", "text/plain", b"%PDF-1.7")

    def test_rejects_invalid_docx_zip(self):
        with self.assertRaises(ValueError):
            extract_document_pages("brand.docx", "application/octet-stream", b"not a zip")

    def test_rejects_non_utf8_text(self):
        with self.assertRaises(ValueError):
            extract_document_pages("brand.txt", "text/plain", b"\xff\xfe\xfa")


if __name__ == "__main__":
    unittest.main()
