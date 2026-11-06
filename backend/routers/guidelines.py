from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import BrandGuidelineModel

router = APIRouter(prefix="/api/guidelines", tags=["guidelines"])

# Shared storage reference injected from main
_guidelines_store: List[BrandGuidelineModel] = []

def set_guidelines_store(store: List[BrandGuidelineModel]):
    global _guidelines_store
    _guidelines_store = store

@router.get("", response_model=List[BrandGuidelineModel])
def list_guidelines():
    return _guidelines_store

@router.post("", response_model=BrandGuidelineModel, status_code=201)
def create_guideline(payload: BrandGuidelineModel):
    _guidelines_store.insert(0, payload)
    return payload

@router.put("/{guideline_id}", response_model=BrandGuidelineModel)
def update_guideline(guideline_id: str, payload: BrandGuidelineModel):
    for i, g in enumerate(_guidelines_store):
        if g.id == guideline_id:
            _guidelines_store[i] = payload
            return payload
    raise HTTPException(status_code=404, detail="Guideline not found")

@router.delete("/{guideline_id}")
def delete_guideline(guideline_id: str):
    global _guidelines_store
    initial_len = len(_guidelines_store)
    _guidelines_store[:] = [g for g in _guidelines_store if g.id != guideline_id]
    if len(_guidelines_store) == initial_len:
        raise HTTPException(status_code=404, detail="Guideline not found")
    return {"success": True, "id": guideline_id}
