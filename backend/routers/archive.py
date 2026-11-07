from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import DBReviewDocument, get_db
from models import ReviewDocumentModel
from storage import review_model

router = APIRouter(prefix="/api/archive", tags=["archive"])

@router.get("", response_model=list[ReviewDocumentModel])
def query_archive(q: Optional[str] = Query(None), status: Optional[str] = Query(None),
                  decision: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(DBReviewDocument)
    if q:
        pattern = f"%{q}%"
        query = query.filter((DBReviewDocument.title.ilike(pattern)) |
            (DBReviewDocument.reviewer.ilike(pattern)) |
            (DBReviewDocument.original_content.ilike(pattern)) |
            (DBReviewDocument.id.ilike(pattern)))
    if status and status != "all":
        query = query.filter(DBReviewDocument.status == status)
    if decision and decision != "all":
        query = query.filter(DBReviewDocument.decision_status == decision)
    return [review_model(r) for r in query.order_by(DBReviewDocument.created_at.desc()).all()]
