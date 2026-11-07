from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import DBApprovedFact, get_db
from models import ApprovedFactModel
from storage import fact_model, fact_row

router = APIRouter(prefix="/api/facts", tags=["facts"])

@router.get("", response_model=list[ApprovedFactModel])
def list_facts(db: Session = Depends(get_db)):
    return [fact_model(row) for row in db.query(DBApprovedFact).order_by(DBApprovedFact.id).all()]

@router.post("", response_model=ApprovedFactModel, status_code=201)
def create_fact(payload: ApprovedFactModel, db: Session = Depends(get_db)):
    if db.get(DBApprovedFact, payload.id):
        raise HTTPException(409, "Fact ID already exists")
    db.add(fact_row(payload))
    db.commit()
    return payload

@router.put("/{fact_id}", response_model=ApprovedFactModel)
def update_fact(fact_id: str, payload: ApprovedFactModel, db: Session = Depends(get_db)):
    row = db.get(DBApprovedFact, fact_id)
    if not row:
        raise HTTPException(404, "Fact not found")
    new_row = fact_row(payload)
    for key in ("title", "statement", "category", "source", "verification_status", "last_updated"):
        setattr(row, key, getattr(new_row, key))
    db.commit()
    return payload

@router.delete("/{fact_id}")
def delete_fact(fact_id: str, db: Session = Depends(get_db)):
    row = db.get(DBApprovedFact, fact_id)
    if not row:
        raise HTTPException(404, "Fact not found")
    db.delete(row)
    db.commit()
    return {"success": True, "id": fact_id}
