"""Safe, source-preserving document extraction for BrandGuard AI.

Extracted text is always stored as a pending review artifact. It is never promoted
into approved knowledge until a human explicitly approves a candidate.
"""
from __future__ import annotations

import io
import re
import zipfile
from pathlib import PurePath
from typing import Any

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_EXTRACTED_CHARS = 1_500_000
MAX_PDF_PAGES = 200
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
ALLOWED_MIME_TYPES = {
    ".pdf": {"application/pdf", "application/octet-stream"},
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",
    },
    ".txt": {"text/plain", "text/markdown", "application/octet-stream"},
}
FACT_CUES = re.compile(
    r"\b(?:contains?|provides?|delivers?|offers?|supports?|certified|complies?|"
    r"verified|tested|measures?|reduces?|increases?|improves?|includes?|"
    r"available|founded|headquartered|launched|achieved|maintains?)\b",
    re.IGNORECASE,
)
GUIDELINE_CUES = re.compile(
    r"\b(?:must|must not|shall|should|should not|never|always|required|"
    r"prohibited|avoid|ensure|do not|use only|不得)\b",
    re.IGNORECASE,
)
MEASUREMENT_CUES = re.compile(
    r"\b\d+(?:[.,]\d+)?\s*(?:%|percent|mg|g|kg|ml|l|days?|weeks?|months?|years?|hours?)\b",
    re.IGNORECASE,
)
SECTION_HEADING = re.compile(r"^\s*(?:\d+(?:\.\d+)*[.)]?\s+)?[A-Z][A-Z0-9 &/()'’:-]{3,100}\s*$")


def _validate_docx_archive(data: bytes) -> None:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            names = set(archive.namelist())
            if "[Content_Types].xml" not in names or "word/document.xml" not in names:
                raise ValueError("The DOCX file is missing its main document content.")
            expanded_size = sum(item.file_size for item in archive.infolist())
            if expanded_size > 40 * 1024 * 1024:
                raise ValueError("The DOCX expands beyond the supported extraction limit.")
    except zipfile.BadZipFile as exc:
        raise ValueError("The DOCX file is not a valid Office document.") from exc


def _clean_text(value: str) -> str:
    value = value.replace("\x00", " ")
    value = re.sub(r"[\t ]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def extract_document_pages(filename: str, mime_type: str, data: bytes) -> list[dict[str, Any]]:
    """Return ordered text blocks with page/section provenance."""
    extension = PurePath(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type. Upload a PDF, DOCX or TXT file.")
    if mime_type and mime_type not in ALLOWED_MIME_TYPES[extension]:
        raise ValueError("The file content type does not match its extension.")

    if extension == ".pdf":
        if not data.startswith(b"%PDF-"):
            raise ValueError("The uploaded file does not have a valid PDF signature.")
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data), strict=True)
            if reader.is_encrypted:
                raise ValueError("Password-protected PDFs are not supported.")
            if len(reader.pages) == 0:
                raise ValueError("The PDF does not contain any pages.")
            if len(reader.pages) > MAX_PDF_PAGES:
                raise ValueError(f"PDFs are limited to {MAX_PDF_PAGES} pages.")
            pages = []
            total = 0
            for index, page in enumerate(reader.pages, start=1):
                text = _clean_text(page.extract_text() or "")
                total += len(text)
                if total > MAX_EXTRACTED_CHARS:
                    raise ValueError("Extracted text exceeds the supported document limit.")
                pages.append({
                    "pageNumber": index,
                    "sectionLabel": _first_heading(text),
                    "text": text,
                })
            if not any(page["text"] for page in pages):
                raise ValueError("No readable text was found. Scanned image-only PDFs need OCR and are not supported yet.")
            return pages
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError("The PDF could not be read. Check that it is not damaged or restricted.") from exc

    if extension == ".docx":
        _validate_docx_archive(data)
        try:
            from docx import Document
            document = Document(io.BytesIO(data))
            blocks: list[dict[str, Any]] = []
            section = ""
            total = 0
            for paragraph in document.paragraphs:
                text = _clean_text(paragraph.text or "")
                if not text:
                    continue
                total += len(text)
                if total > MAX_EXTRACTED_CHARS:
                    raise ValueError("Extracted text exceeds the supported document limit.")
                style_name = getattr(getattr(paragraph, "style", None), "name", "") or ""
                if style_name.lower().startswith("heading") or (
                    len(text) <= 100 and SECTION_HEADING.match(text)
                ):
                    section = text
                    continue
                blocks.append({"pageNumber": None, "sectionLabel": section or None, "text": text})
            for table in document.tables:
                for row in table.rows:
                    cells = [_clean_text(cell.text) for cell in row.cells]
                    text = " | ".join(cell for cell in cells if cell)
                    if text:
                        total += len(text)
                        if total > MAX_EXTRACTED_CHARS:
                            raise ValueError("Extracted text exceeds the supported document limit.")
                        blocks.append({"pageNumber": None, "sectionLabel": section or "Table", "text": text})
            if not blocks:
                raise ValueError("No readable text was found in the DOCX document.")
            return blocks
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError("The DOCX document could not be read.") from exc

    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("TXT files must use UTF-8 encoding.") from exc
    text = _clean_text(text)
    if not text:
        raise ValueError("The TXT file is empty.")
    if len(text) > MAX_EXTRACTED_CHARS:
        raise ValueError("Extracted text exceeds the supported document limit.")
    return [{"pageNumber": 1, "sectionLabel": _first_heading(text), "text": text}]


def _first_heading(text: str) -> str | None:
    for line in text.splitlines():
        candidate = line.strip()
        if candidate and (SECTION_HEADING.match(candidate) or candidate.endswith(":")) and len(candidate) <= 120:
            return candidate.rstrip(":")
    return None


def extract_evidence_candidates(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Identify exact source sentences that a reviewer may promote to knowledge."""
    candidates: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for page in pages:
        text = str(page.get("text") or "")
        for raw_sentence in re.split(r"(?<=[.!?])\s+|\n+", text):
            excerpt = _clean_text(raw_sentence)
            if len(excerpt) < 28 or len(excerpt) > 650:
                continue
            is_guideline = bool(GUIDELINE_CUES.search(excerpt))
            is_fact = bool(FACT_CUES.search(excerpt) or MEASUREMENT_CUES.search(excerpt))
            if not (is_guideline or is_fact):
                continue
            candidate_type = "guideline" if is_guideline and not (MEASUREMENT_CUES.search(excerpt) or re.search(r"\b(?:certified|verified|tested|contains?|provides?)\b", excerpt, re.I)) else "fact"
            key = (candidate_type, excerpt.casefold())
            if key in seen:
                continue
            seen.add(key)
            signal_count = sum(bool(pattern.search(excerpt)) for pattern in (FACT_CUES, GUIDELINE_CUES, MEASUREMENT_CUES))
            candidates.append({
                "candidateType": candidate_type,
                "title": excerpt[:96] + ("…" if len(excerpt) > 96 else ""),
                "excerpt": excerpt,
                "pageNumber": page.get("pageNumber"),
                "sectionLabel": page.get("sectionLabel"),
                "confidence": "medium" if signal_count >= 2 else "low",
            })
            if len(candidates) >= 100:
                return candidates
    return candidates
