from fastapi import APIRouter, HTTPException
from typing import List
from models import TerminologyEntryModel

router = APIRouter(prefix="/api/terminology", tags=["terminology"])

_terminology_store: List[TerminologyEntryModel] = []

def set_terminology_store(store: List[TerminologyEntryModel]):
    global _terminology_store
    _terminology_store = store

@router.get("", response_model=List[TerminologyEntryModel])
def list_terminology():
    return _terminology_store

@router.post("", response_model=TerminologyEntryModel, status_code=201)
def create_terminology(payload: TerminologyEntryModel):
    _terminology_store.insert(0, payload)
    return payload

@router.put("/{term_id}", response_model=TerminologyEntryModel)
def update_terminology(term_id: str, payload: TerminologyEntryModel):
    for i, t in enumerate(_terminology_store):
        if t.id == term_id:
            _terminology_store[i] = payload
            return payload
    raise HTTPException(status_code=404, detail="Terminology entry not found")

@router.delete("/{term_id}")
def delete_terminology(term_id: str):
    global _terminology_store
    initial_len = len(_terminology_store)
    _terminology_store[:] = [t for t in _terminology_store if t.id != term_id]
    if len(_terminology_store) == initial_len:
        raise HTTPException(status_code=404, detail="Terminology entry not found")
    return {"success": True, "id": term_id}
