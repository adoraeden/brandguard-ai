import os
from contextlib import asynccontextmanager
from datetime import datetime
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

# backend/.env must be loaded before database.py creates the engine.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from database import (DBApprovedFact, DBBrandGuideline, DBKnowledgeSource,
                      DBReviewDocument, DBTerminology, SessionLocal, engine,
                      get_db, init_db)
from models import (ApprovedFactModel, BrandGuidelineModel, TerminologyEntryModel)
from routers.archive import router as archive_router
from routers.facts import router as facts_router
from routers.guidelines import router as guidelines_router
from routers.insights import router as insights_router
from routers.reviews import router as reviews_router
from routers.sources import router as sources_router
from routers.terminology import router as terminology_router
from storage import (fact_model, fact_row, guideline_model, guideline_row,
                     review_model, terminology_model, terminology_row)


DEMO_USERS = [
    {"id": "usr-admin-1", "name": "Evelyn Voss", "email": "evelyn.voss@auracloud.tech",
     "role": "admin", "title": "VP Brand Governance & Compliance", "avatarInitials": "EV",
     "department": "Executive Governance"},
    {"id": "usr-rev-1", "name": "Marcus Chen", "email": "marcus.chen@auracloud.tech",
     "role": "reviewer", "title": "Director of Marketing Communications", "avatarInitials": "MC",
     "department": "Brand Communications"},
    {"id": "usr-rev-2", "name": "Devon Price", "email": "devon.price@auracloud.tech",
     "role": "reviewer", "title": "Lead Content Policy Reviewer", "avatarInitials": "DP",
     "department": "Editorial & Compliance"},
]

SEED_GUIDELINES = [
    BrandGuidelineModel(id="bg-01", title="Product Naming Integrity", category="product_positioning",
        description="Always refer to the flagship platform as 'AuraCloud Workspace'. Never 'Aura Cloud App'.",
        severity="critical", sourceReference="Brand Identity Book v2.4, §1.2", status="active",
        lastUpdated="2026-09-15", examples={"approved": "Deploy AuraCloud Workspace across your operations teams.",
        "prohibited": "Install the new Aura Cloud App on your machines."}),
    BrandGuidelineModel(id="bg-02", title="Responsible AI & Human-in-the-Loop", category="messaging_principles",
        description="Frame AI as intelligent orchestration that augments human judgment. Strictly prohibit claims of employee replacement.",
        severity="critical", sourceReference="Ethical AI Principles v3.1, §4.0", status="active",
        lastUpdated="2026-10-02", examples={"approved": "AuraCloud Workspace empowers teams with intelligent workflow suggestions.",
        "prohibited": "Replace your entire marketing team with fully autonomous AI agents."}),
    BrandGuidelineModel(id="bg-03", title="Uptime & Reliability Fact Rigor", category="writing_standards",
        description="State system SLA accurately as 99.95% verified monthly availability. Never use hyperbolic phrases like '100% zero downtime'.",
        severity="high", sourceReference="Engineering Architecture & SLA Standard v2.0", status="active",
        lastUpdated="2026-08-20", examples={"approved": "Backed by our contractually verified 99.95% enterprise uptime SLA.",
        "prohibited": "Experience 100% zero-downtime uninterrupted forever."}),
]

SEED_TERMINOLOGY = [
    TerminologyEntryModel(id="term-01", preferredTerm="AuraCloud Workspace", restrictedTerm="Aura Cloud App",
        explanation="The official trademarked product name is AuraCloud Workspace.", approvedAlternative="AuraCloud Workspace",
        category="product_naming", priority="critical", status="active", createdAt="2026-06-10"),
    TerminologyEntryModel(id="term-02", preferredTerm="intelligent workflow platform",
        restrictedTerm="fully autonomous employee replacement",
        explanation="AuraCloud is positioned as an intelligence amplifier, not workforce elimination.",
        approvedAlternative="intelligent workflow platform", category="capability_claim", priority="critical", status="active", createdAt="2026-06-12"),
    TerminologyEntryModel(id="term-03", preferredTerm="99.95% verified uptime SLA", restrictedTerm="100% zero downtime",
        explanation="Contradicts verified engineering SLA of 99.95% with multi-region failover.",
        approvedAlternative="99.95% verified uptime SLA", category="capability_claim", priority="critical", status="active", createdAt="2026-07-01"),
]

SEED_FACTS = [
    ApprovedFactModel(id="fact-01", title="Enterprise Availability SLA",
        statement="AuraCloud Workspace provides a 99.95% verified uptime Service Level Agreement backed by multi-region failover across 3 availability zones.",
        category="uptime_performance", source="Engineering Operational SLA Agreement v4.2, 2026",
        verificationStatus="verified", lastUpdated="2026-09-01"),
    ApprovedFactModel(id="fact-02", title="SOC-2 Type II Certification",
        statement="AuraCloud completed independent SOC-2 Type II audit certification with zero non-conformity findings in August 2026, utilizing AES-256 at rest and TLS 1.3 in transit.",
        category="compliance_security", source="Independent Security Audit Report (Grant Thornton, Aug 2026)",
        verificationStatus="verified", lastUpdated="2026-08-28"),
]

SEED_SOURCES = [
    {"id": "src-01", "title": "AuraCloud Brand Identity Book v2.4", "type": "document",
     "description": "Corporate naming conventions, brand architecture, typography standards, and trademark usage rules.",
     "version": "2.4.1", "effectiveDate": "2026-01-15", "ruleCount": 14},
    {"id": "src-02", "title": "Ethical AI & Messaging Principles v3.1", "type": "document",
     "description": "Responsible AI marketing standards, worker augmentation boundaries, and transparency mandates.",
     "version": "3.1.0", "effectiveDate": "2026-04-01", "ruleCount": 18},
    {"id": "src-03", "title": "SOC-2 Type II Audit & Security Factsheet", "type": "factsheet",
     "description": "Audited factual technical specifications, encryption methodologies, and compliance boundaries.",
     "version": "2026-Q3", "effectiveDate": "2026-08-28", "ruleCount": 9},
]


def seed_if_empty(db: Session):
    if db.query(DBBrandGuideline).count() == 0:
        db.add_all(guideline_row(item) for item in SEED_GUIDELINES)
    if db.query(DBTerminology).count() == 0:
        db.add_all(terminology_row(item) for item in SEED_TERMINOLOGY)
    if db.query(DBApprovedFact).count() == 0:
        db.add_all(fact_row(item) for item in SEED_FACTS)
    if db.query(DBKnowledgeSource).count() == 0:
        db.add_all(DBKnowledgeSource(id=s["id"], title=s["title"], source_type=s["type"],
            description=s["description"], version=s["version"], effective_date=s["effectiveDate"],
            rule_count=s["ruleCount"]) for s in SEED_SOURCES)
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as db:
        try:
            seed_if_empty(db)
        except Exception:
            db.rollback()
            raise
    yield


app = FastAPI(title="BrandGuard AI - Enterprise Governance Backend", version="2.0.0",
    description="Deterministic rule engine and Gemini contextual brand governance API", lifespan=lifespan)
allowed_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins,
    allow_origin_regex=r"https://[a-zA-Z0-9-]+\.vercel\.app",
    allow_credentials=False, allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"])

for route in (guidelines_router, terminology_router, facts_router, sources_router,
              reviews_router, archive_router, insights_router):
    app.include_router(route)

@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        connected = True
    except Exception:
        connected = False
    return {"status": "ok" if connected else "degraded",
        "database": "connected" if connected else "unavailable",
        "engine": "BrandGuard FastAPI + Python Deterministic + Gemini",
        "geminiConfigured": bool(os.getenv("GEMINI_API_KEY")),
        "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/auth/users")
def list_demo_users():
    return DEMO_USERS

@app.post("/api/auth/login")
def demo_login(payload: dict):
    user = next((u for u in DEMO_USERS if u["id"] == payload.get("userId") or
        u["email"] == payload.get("email") or u["role"] == payload.get("role")), DEMO_USERS[0])
    return {"token": f"demo-token-{user['id']}-{uuid4().hex}", "user": user}

@app.get("/api/auth/me")
def demo_current_user(request: Request):
    auth_header = request.headers.get("authorization", "")
    if "usr-rev" in auth_header:
        return next(user for user in DEMO_USERS if user["role"] == "reviewer")
    return DEMO_USERS[0]

@app.get("/api/overview")
def get_overview(db: Session = Depends(get_db)):
    guidelines = db.query(DBBrandGuideline).all()
    terminology = db.query(DBTerminology).all()
    facts_count = db.query(DBApprovedFact).count()
    rows = db.query(DBReviewDocument).order_by(DBReviewDocument.created_at.desc()).all()
    docs = [review_model(row) for row in rows]
    pending = [review for review in docs if review.decisionStatus == "pending"]
    decisions = [review for review in docs if review.decisionStatus != "pending"]
    severity = {key: 0 for key in ("critical", "high", "medium", "low", "informational")}
    for doc in docs:
        for finding in doc.findings:
            if finding.severity in severity:
                severity[finding.severity] += 1
    return {"counts": {"rules": sum(item.status == "active" for item in guidelines),
        "terminology": sum(item.status == "active" for item in terminology), "facts": facts_count,
        "reviewedDocuments": len(docs),
        "unresolvedFindings": sum(item.summary.unresolvedFindings for item in docs),
        "totalFindings": sum(len(item.findings) for item in docs),
        "pendingReviewsCount": len(pending)},
        "reviewStatistics": {"total": len(docs), "completed": len(decisions), "pending": len(pending),
            "approved": sum(item.decisionStatus in ("approved_with_changes", "approved_as_is") for item in docs),
            "rejected": sum(item.decisionStatus == "rejected" for item in docs)},
        "severityDistribution": severity,
        "pendingReviews": [{"id": item.id, "title": item.title, "contentType": item.contentType,
            "reviewer": item.reviewer, "updatedAt": item.updatedAt,
            "unresolvedFindings": item.summary.unresolvedFindings} for item in pending],
        "recentReviews": [item.model_dump(by_alias=True) for item in docs[:5]],
        "recentDecisions": [{"reviewId": item.id, "title": item.title,
            "decisionStatus": item.decisionStatus, "reviewer": item.reviewer,
            "decidedAt": item.decidedAt or item.updatedAt, "findingsCount": len(item.findings)}
            for item in decisions[:5]]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
