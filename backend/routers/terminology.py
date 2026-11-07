from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import DBTerminology, get_db
from models import TerminologyEntryModel
from storage import terminology_model, terminology_row

router = APIRouter(prefix="/api/terminology", tags=["terminology"])

@router.get("", response_model=list[TerminologyEntryModel])
def list_terminology(db: Session = Depends(get_db)):
    return [terminology_model(row) for row in db.query(DBTerminology).order_by(DBTerminology.id).all()]

@router.post("", response_model=TerminologyEntryModel, status_code=201)
def create_terminology(payload: TerminologyEntryModel, db: Session = Depends(get_db)):
    if db.get(DBTerminology, payload.id):
        raise HTTPException(409, "Terminology ID already exists")
    db.add(terminology_row(payload))
    db.commit()
    return payload

@router.put("/{term_id}", response_model=TerminologyEntryModel)
def update_terminology(term_id: str, payload: TerminologyEntryModel, db: Session = Depends(get_db)):
    row = db.get(DBTerminology, term_id)
    if not row:
        raise HTTPException(404, "Terminology entry not found")
    new_row = terminology_row(payload)
    for key in ("preferred_term", "restricted_term", "explanation", "approved_alternative", "category", "status", "created_at"):
        setattr(row, key, getattr(new_row, key))
    db.commit()
    return payload

@router.delete("/{term_id}")
def delete_terminology(term_id: str, db: Session = Depends(get_db)):
    row = db.get(DBTerminology, term_id)
    if not row:
        raise HTTPException(404, "Terminology entry not found")
    db.delete(row)
    db.commit()
    return {"success": True, "id": term_id}
