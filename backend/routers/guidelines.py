from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import DBBrandGuideline, get_db
from models import BrandGuidelineModel
from storage import guideline_model, guideline_row

router = APIRouter(prefix="/api/guidelines", tags=["guidelines"])

@router.get("", response_model=list[BrandGuidelineModel])
def list_guidelines(db: Session = Depends(get_db)):
    return [guideline_model(row) for row in db.query(DBBrandGuideline).order_by(DBBrandGuideline.id).all()]

@router.post("", response_model=BrandGuidelineModel, status_code=201)
def create_guideline(payload: BrandGuidelineModel, db: Session = Depends(get_db)):
    if db.get(DBBrandGuideline, payload.id):
        raise HTTPException(409, "Guideline ID already exists")
    row = guideline_row(payload)
    db.add(row)
    db.commit()
    return payload

@router.put("/{guideline_id}", response_model=BrandGuidelineModel)
def update_guideline(guideline_id: str, payload: BrandGuidelineModel, db: Session = Depends(get_db)):
    row = db.get(DBBrandGuideline, guideline_id)
    if not row:
        raise HTTPException(404, "Guideline not found")
    for key, value in guideline_row(payload).__dict__.items():
        if key in {"title", "category", "description", "severity", "source_reference", "status", "last_updated", "approved_example", "prohibited_example"}:
            setattr(row, key, value)
    db.commit()
    return payload.model_copy(update={"id": guideline_id})

@router.delete("/{guideline_id}")
def delete_guideline(guideline_id: str, db: Session = Depends(get_db)):
    row = db.get(DBBrandGuideline, guideline_id)
    if not row:
        raise HTTPException(404, "Guideline not found")
    db.delete(row)
    db.commit()
    return {"success": True, "id": guideline_id}
