from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import DBKnowledgeSource, get_db
from models import KnowledgeSourceModel
from storage import source_model, source_row

router = APIRouter(prefix="/api/sources", tags=["sources"])

@router.get("", response_model=list[KnowledgeSourceModel])
def list_sources(db: Session = Depends(get_db)):
    return [source_model(row) for row in db.query(DBKnowledgeSource).order_by(DBKnowledgeSource.id).all()]

@router.post("", response_model=KnowledgeSourceModel, status_code=201)
def create_source(payload: KnowledgeSourceModel, db: Session = Depends(get_db)):
    if not payload.url or not payload.url.strip():
        raise HTTPException(422, "A source URL or reference is required")
    if db.get(DBKnowledgeSource, payload.id):
        raise HTTPException(409, "Knowledge source ID already exists")
    row = source_row(payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return source_model(row)

@router.put("/{source_id}", response_model=KnowledgeSourceModel)
def update_source(source_id: str, payload: KnowledgeSourceModel, db: Session = Depends(get_db)):
    row = db.get(DBKnowledgeSource, source_id)
    if not row:
        raise HTTPException(404, "Knowledge source not found")
    if not payload.url or not payload.url.strip():
        raise HTTPException(422, "A source URL or reference is required")
    updated = source_row(payload)
    for key in ("title", "source_type", "description", "version", "effective_date", "rule_count", "source_url", "status"):
        setattr(row, key, getattr(updated, key))
    db.commit()
    db.refresh(row)
    return source_model(row)

@router.delete("/{source_id}")
def delete_source(source_id: str, db: Session = Depends(get_db)):
    row = db.get(DBKnowledgeSource, source_id)
    if not row:
        raise HTTPException(404, "Knowledge source not found")
    db.delete(row)
    db.commit()
    return {"success": True, "id": source_id}
