import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from database import DBApprovedFact, DBIngestedDocument, DBKnowledgeSource, SessionLocal
from main import app


class DocumentIngestionApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def upload_text(self, content, filename_prefix="ingestion-ci"):
        filename = f"{filename_prefix}-{uuid4().hex}.txt"
        response = self.client.post(
            "/api/documents",
            data={"uploaded_by": "CI Evidence Reviewer"},
            files={"file": (filename, content.encode("utf-8"), "text/plain")},
        )
        return filename, response

    def test_upload_review_approval_rejection_and_provenance(self):
        content = (
            "BRAND EVIDENCE FACTSHEET\n"
            "The platform provides 99.95% monthly uptime under its standard service commitment.\n"
            "All customer-facing claims must be supported by approved evidence."
        )
        filename, uploaded = self.upload_text(content)
        self.assertEqual(uploaded.status_code, 201, uploaded.text)
        document = uploaded.json()
        self.assertEqual(document["filename"], filename)
        self.assertEqual(document["candidateCount"], 2)
        self.assertEqual(document["pendingCandidateCount"], 2)

        fact_candidate = next(
            item for item in document["candidates"]
            if item["candidateType"] == "fact"
        )
        guideline_candidate = next(
            item for item in document["candidates"]
            if item["candidateType"] == "guideline"
        )

        approved = self.client.post(
            f"/api/documents/{document['id']}/candidates/{fact_candidate['id']}/decision",
            json={
                "decision": "approve",
                "recordType": "fact",
                "title": "Monthly uptime commitment",
                "approvedText": fact_candidate["excerpt"],
                "reviewer": "CI Evidence Reviewer",
            },
        )
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(approved.json()["status"], "approved")

        rejected = self.client.post(
            f"/api/documents/{document['id']}/candidates/{guideline_candidate['id']}/decision",
            json={
                "decision": "reject",
                "reviewer": "CI Evidence Reviewer",
            },
        )
        self.assertEqual(rejected.status_code, 200, rejected.text)
        self.assertEqual(rejected.json()["status"], "rejected")

        detail = self.client.get(f"/api/documents/{document['id']}")
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertEqual(detail.json()["pendingCandidateCount"], 0)

        download = self.client.get(f"/api/documents/{document['id']}/download")
        self.assertEqual(download.status_code, 200)
        self.assertEqual(download.content.decode("utf-8"), content)

        with SessionLocal() as db:
            fact = db.query(DBApprovedFact).filter_by(
                source_document_id=document["id"]
            ).one()
            source = db.query(DBKnowledgeSource).filter_by(
                source_url=f"internal://api/documents/{document['id']}/download"
            ).one()
            self.assertEqual(fact.source_page_number, 1)
            self.assertEqual(fact.source_excerpt, fact_candidate["excerpt"])
            self.assertEqual(source.status, "active")
            self.assertEqual(source.description, fact_candidate["excerpt"])

    def test_document_with_no_candidates_is_archived_not_left_under_review(self):
        content = "A short introductory passage describing the company background and its audience in general terms."
        _, uploaded = self.upload_text(content, "empty-evidence")
        self.assertEqual(uploaded.status_code, 201, uploaded.text)
        document = uploaded.json()
        self.assertEqual(document["candidateCount"], 0)
        with SessionLocal() as db:
            source = db.query(DBKnowledgeSource).filter_by(
                source_url=f"internal://api/documents/{document['id']}/download"
            ).one()
            self.assertEqual(source.status, "archived")

    def test_same_file_can_be_uploaded_more_than_once(self):
        filename = f"repeat-upload-{uuid4().hex}.txt"
        content = b"The platform maintains a verified 99.95% monthly service availability commitment."

        def upload_again():
            return self.client.post(
                "/api/documents",
                data={"uploaded_by": "CI Evidence Reviewer"},
                files={"file": (filename, content, "text/plain")},
            )

        first = upload_again()
        self.assertEqual(first.status_code, 201, first.text)
        second = upload_again()
        self.assertEqual(second.status_code, 201, second.text)

        first_document = first.json()
        second_document = second.json()
        self.assertNotEqual(first_document["id"], second_document["id"])
        self.assertEqual(first_document["filename"], second_document["filename"])
        self.assertEqual(first_document["sha256"], second_document["sha256"])

        document_ids = [first_document["id"], second_document["id"]]
        with SessionLocal() as db:
            rows = db.query(DBIngestedDocument).filter(
                DBIngestedDocument.id.in_(document_ids)
            ).all()
            self.assertEqual(len(rows), 2)
            for document_id in document_ids:
                db.query(DBKnowledgeSource).filter_by(
                    source_url=f"internal://api/documents/{document_id}/download"
                ).delete(synchronize_session=False)
                row = db.get(DBIngestedDocument, document_id)
                if row:
                    db.delete(row)
            db.commit()


if __name__ == "__main__":
    unittest.main()
