from datetime import datetime, date
from hashlib import sha256
from pathlib import PurePath
from uuid import uuid4
import io

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import (
    DBApprovedFact, DBBrandGuideline, DBDocumentAudit, DBEvidenceCandidate,
    DBIngestedDocument, DBKnowledgeSource, get_db,
)
from document_ingestion import ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, extract_document_pages, extract_evidence_candidates
from models import (
    EvidenceCandidateDecisionRequest, EvidenceCandidateModel,
    IngestedDocumentModel, IngestedDocumentDetailModel,
)

router = APIRouter(prefix="/api/documents", tags=["document-ingestion"])


def candidate_model(row):
    return EvidenceCandidateModel(
        id=row.id, documentId=row.document_id, candidateType=row.candidate_type,
        title=row.title, excerpt=row.excerpt, pageNumber=row.page_number,
        sectionLabel=row.section_label, confidence=row.confidence, status=row.status,
        approvedRecordType=row.approved_record_type, approvedRecordId=row.approved_record_id,
        reviewedBy=row.reviewed_by, reviewedAt=row.reviewed_at,
    )


def document_model(row):
    candidates = [candidate_model(item) for item in row.candidates]
    return IngestedDocumentModel(
        id=row.id, filename=row.filename, mimeType=row.mime_type,
        sizeBytes=row.size_bytes, sha256=row.sha256, extractionStatus=row.extraction_status,
        uploadedBy=row.uploaded_by, uploadedAt=row.uploaded_at.isoformat() + "Z",
        pageCount=len(row.extracted_pages or []), candidateCount=len(candidates),
        pendingCandidateCount=sum(item.status == "pending" for item in candidates),
        candidates=candidates,
    )


@router.get("", response_model=list[IngestedDocumentModel])
def list_documents(db: Session = Depends(get_db)):
    rows = db.query(DBIngestedDocument).order_by(DBIngestedDocument.uploaded_at.desc()).all()
    return [document_model(row) for row in rows]


@router.post("", response_model=IngestedDocumentModel, status_code=201)
def upload_document(
    file: UploadFile = File(...),
    uploaded_by: str = Form(default="Brand Governance Admin"),
    db: Session = Depends(get_db),
):
    filename = PurePath((file.filename or "").replace("\\", "/")).name
    extension = PurePath(filename).suffix.lower()
    if not filename or extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(415, "Upload a PDF, DOCX or TXT file.")
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if not data:
        raise HTTPException(422, "The uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Files are limited to 15 MB.")
    digest = sha256(data).hexdigest()
    duplicate = db.query(DBIngestedDocument).filter(DBIngestedDocument.sha256 == digest).first()
    if duplicate:
        raise HTTPException(409, f"This exact file was already uploaded as {duplicate.filename}.")

    try:
        pages = extract_document_pages(filename, file.content_type or "", data)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    candidates = extract_evidence_candidates(pages)
    now = datetime.utcnow()
    document_id = f"doc-{uuid4().hex}"
    row = DBIngestedDocument(
        id=document_id, filename=filename, mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(data), sha256=digest, file_data=data,
        extraction_status="extracted", extracted_pages=pages,
        uploaded_by=(uploaded_by or "").strip()[:160] or "Brand Governance Admin",
        uploaded_at=now,
    )
    for position, item in enumerate(candidates):
        row.candidates.append(DBEvidenceCandidate(
            id=f"evc-{uuid4().hex}", document_id=document_id, position=position,
            candidate_type=item["candidateType"], title=item["title"],
            excerpt=item["excerpt"], page_number=item["pageNumber"],
            section_label=item["sectionLabel"], confidence=item["confidence"],
            status="pending",
        ))
    source = DBKnowledgeSource(
        id=f"src-{uuid4().hex}", title=filename, source_type="document",
        description=(
            "Uploaded document. Extracted passages require human confirmation before becoming approved knowledge."
            if candidates else
            "Original document retained. No likely fact or guideline passages were extracted, so this source is archived and is not used as approved evidence."
        ),
        version="1.0", effective_date=date.today().isoformat(), rule_count=len(candidates),
        source_url=f"internal://api/documents/{document_id}/download",
        status="under_review" if candidates else "archived",
    )
    db.add(row)
    db.add(source)
    try:
        db.commit()
        db.refresh(row)
    except Exception:
        db.rollback()
        raise
    return document_model(row)


@router.get("/{document_id}", response_model=IngestedDocumentDetailModel)
def get_document(document_id: str, db: Session = Depends(get_db)):
    row = db.get(DBIngestedDocument, document_id)
    if not row:
        raise HTTPException(404, "Uploaded document not found.")
    base = document_model(row).model_dump(by_alias=True)
    base["pages"] = row.extracted_pages or []
    return IngestedDocumentDetailModel(**base)


@router.get("/{document_id}/download")
def download_document(document_id: str, db: Session = Depends(get_db)):
    row = db.get(DBIngestedDocument, document_id)
    if not row:
        raise HTTPException(404, "Uploaded document not found.")
    return StreamingResponse(
        io.BytesIO(row.file_data),
        media_type=row.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{row.filename.replace("\r", "").replace("\n", "").replace(chr(34), "")}"'},
    )


def _refresh_source_status(db: Session, document_id: str) -> None:
    document = db.get(DBIngestedDocument, document_id)
    if not document:
        return
    pending = db.query(DBEvidenceCandidate).filter_by(document_id=document_id, status="pending").count()
    approved_rows = (
        db.query(DBEvidenceCandidate)
        .filter_by(document_id=document_id, status="approved")
        .order_by(DBEvidenceCandidate.position)
        .all()
    )
    if pending:
        status = "under_review"
    else:
        status = "active" if approved_rows else "archived"
    source = db.query(DBKnowledgeSource).filter(
        DBKnowledgeSource.source_url == f"internal://api/documents/{document_id}/download"
    ).first()
    if source:
        source.status = status
        if status == "active":
            # Only human-approved passages are exposed as active source evidence.
            source.description = "\n\n".join(item.excerpt for item in approved_rows)
        elif status == "archived":
            source.description = "No extracted passages from this upload were approved for use."


@router.post("/{document_id}/candidates/{candidate_id}/decision", response_model=EvidenceCandidateModel)
def decide_candidate(
    document_id: str,
    candidate_id: str,
    payload: EvidenceCandidateDecisionRequest,
    db: Session = Depends(get_db),
):
    document = db.get(DBIngestedDocument, document_id)
    candidate = db.get(DBEvidenceCandidate, candidate_id)
    if not document or not candidate or candidate.document_id != document_id:
        raise HTTPException(404, "Evidence candidate not found for this document.")
    if candidate.status != "pending":
        raise HTTPException(409, "This extracted passage has already been reviewed.")
    now = datetime.utcnow()
    if payload.decision == "reject":
        candidate.status = "rejected"
    else:
        approved_text = (payload.approvedText or candidate.excerpt).strip()
        title = (payload.title or candidate.title).strip()
        if not approved_text or len(approved_text) > 5000:
            raise HTTPException(422, "Approved text must contain between 1 and 5,000 characters.")
        if not title or len(title) > 180:
            raise HTTPException(422, "A title of 1–180 characters is required.")
        source_label = document.filename
        if candidate.page_number:
            source_label += f", page {candidate.page_number}"
        if candidate.section_label:
            source_label += f", section {candidate.section_label}"

        if payload.recordType not in ("fact", "guideline"):
            raise HTTPException(422, "Choose whether to approve this passage as a fact or a guideline.")
        if payload.recordType == "fact":
            record_id = f"fact-{uuid4().hex}"
            db.add(DBApprovedFact(
                id=record_id, title=title, statement=approved_text,
                category=payload.category or "product_specs", source=source_label,
                verification_status="verified", last_updated=date.today().isoformat(),
                source_document_id=document_id, source_page_number=candidate.page_number,
                source_section_label=candidate.section_label, source_excerpt=candidate.excerpt,
            ))
            candidate.approved_record_type = "fact"
        else:
            record_id = f"bg-{uuid4().hex}"
            db.add(DBBrandGuideline(
                id=record_id, title=title, category=payload.category or "writing_standards",
                description=approved_text, severity=payload.severity or "medium",
                source_reference=source_label, status="active",
                last_updated=date.today().isoformat(),
                source_document_id=document_id, source_page_number=candidate.page_number,
                source_section_label=candidate.section_label, source_excerpt=candidate.excerpt,
            ))
            candidate.approved_record_type = "guideline"
        candidate.approved_record_id = record_id
        candidate.status = "approved"

    candidate.reviewed_by = (payload.reviewer or "").strip()[:160] or "Brand Governance Admin"
    candidate.reviewed_at = now.isoformat() + "Z"
    # Sessions use autoflush=False; flush the candidate/knowledge changes before
    # deriving the aggregate source review status.
    db.flush()
    _refresh_source_status(db, document_id)
    db.add(DBDocumentAudit(
        id=f"daud-{uuid4().hex}", document_id=document_id, candidate_id=candidate_id,
        action="evidence_candidate_" + payload.decision, reviewer=candidate.reviewed_by,
        previous_value={"status": "pending"},
        new_value={
            "status": candidate.status, "documentId": document_id,
            "recordType": candidate.approved_record_type,
            "recordId": candidate.approved_record_id,
            "pageNumber": candidate.page_number, "sectionLabel": candidate.section_label,
        },
        created_at=now,
    ))
    try:
        db.commit()
        db.refresh(candidate)
    except Exception:
        db.rollback()
        raise
    return candidate_model(candidate)
