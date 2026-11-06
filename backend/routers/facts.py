from fastapi import APIRouter, HTTPException
from typing import List
from models import ApprovedFactModel

router = APIRouter(prefix="/api/facts", tags=["facts"])

_facts_store: List[ApprovedFactModel] = []

def set_facts_store(store: List[ApprovedFactModel]):
    global _facts_store
    _facts_store = store

@router.get("", response_model=List[ApprovedFactModel])
def list_facts():
    return _facts_store

@router.post("", response_model=ApprovedFactModel, status_code=201)
def create_fact(payload: ApprovedFactModel):
    _facts_store.insert(0, payload)
    return payload

@router.delete("/{fact_id}")
def delete_fact(fact_id: str):
    global _facts_store
    initial_len = len(_facts_store)
    _facts_store[:] = [f for f in _facts_store if f.id != fact_id]
    if len(_facts_store) == initial_len:
        raise HTTPException(status_code=404, detail="Fact not found")
    return {"success": True, "id": fact_id}
