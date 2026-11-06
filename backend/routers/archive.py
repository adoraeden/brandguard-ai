from fastapi import APIRouter, Query
from typing import List, Optional
from models import ReviewDocumentModel

router = APIRouter(prefix="/api/archive", tags=["archive"])

_reviews_ref: List[ReviewDocumentModel] = []

def set_archive_reviews_store(store: List[ReviewDocumentModel]):
    global _reviews_ref
    _reviews_ref = store

@router.get("", response_model=List[ReviewDocumentModel])
def query_archive(
    q: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    decision: Optional[str] = Query(None)
):
    results = list(_reviews_ref)

    if q:
        query_lower = q.lower()
        results = [
            r for r in results
            if query_lower in r.title.lower()
            or query_lower in r.reviewer.lower()
            or query_lower in r.originalContent.lower()
            or query_lower in r.id.lower()
        ]

    if status and status != 'all':
        results = [r for r in results if r.status == status]

    if decision and decision != 'all':
        results = [r for r in results if r.decisionStatus == decision]

    return results
