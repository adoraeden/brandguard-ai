import os
from datetime import datetime
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import (
    ReviewDocumentModel, BrandGuidelineModel, TerminologyEntryModel, ApprovedFactModel
)
from routers.guidelines import router as guidelines_router, set_guidelines_store
from routers.terminology import router as terminology_router, set_terminology_store
from routers.facts import router as facts_router, set_facts_store
from routers.reviews import router as reviews_router, init_review_stores
from routers.archive import router as archive_router, set_archive_reviews_store
from routers.insights import router as insights_router, set_insights_reviews_store

load_dotenv()

app = FastAPI(
    title="BrandGuard AI - Enterprise Governance Backend",
    version="2.0.0",
    description="Deterministic rule engine and Gemini contextual brand governance API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed storage
guidelines_db: List[BrandGuidelineModel] = [
    BrandGuidelineModel(
        id="bg-01",
        title="Product Naming Integrity",
        category="product_positioning",
        description="Always refer to the flagship platform as 'AuraCloud Workspace'. Never 'Aura Cloud App'.",
        severity="critical",
        sourceReference="Brand Identity Book v2.4, §1.2",
        status="active",
        lastUpdated="2026-09-15",
        examples={"approved": "Deploy AuraCloud Workspace across your operations teams.", "prohibited": "Install the new Aura Cloud App on your machines."}
    ),
    BrandGuidelineModel(
        id="bg-02",
        title="Responsible AI & Human-in-the-Loop",
        category="messaging_principles",
        description="Frame AI as intelligent orchestration that augments human judgment. Strictly prohibit claims of employee replacement.",
        severity="critical",
        sourceReference="Ethical AI Principles v3.1, §4.0",
        status="active",
        lastUpdated="2026-10-02",
        examples={"approved": "AuraCloud Workspace empowers teams with intelligent workflow suggestions.", "prohibited": "Replace your entire marketing team with fully autonomous AI agents."}
    ),
    BrandGuidelineModel(
        id="bg-03",
        title="Uptime & Reliability Fact Rigor",
        category="writing_standards",
        description="State system SLA accurately as 99.95% verified monthly availability. Never use hyperbolic phrases like '100% zero downtime'.",
        severity="high",
        sourceReference="Engineering Architecture & SLA Standard v2.0",
        status="active",
        lastUpdated="2026-08-20",
        examples={"approved": "Backed by our contractually verified 99.95% enterprise uptime SLA.", "prohibited": "Experience 100% zero-downtime uninterrupted forever."}
    )
]

terminology_db: List[TerminologyEntryModel] = [
    TerminologyEntryModel(
        id="term-01",
        preferredTerm="AuraCloud Workspace",
        restrictedTerm="Aura Cloud App",
        explanation="The official trademarked product name is AuraCloud Workspace.",
        approvedAlternative="AuraCloud Workspace",
        category="product_naming",
        status="active",
        createdAt="2026-06-10"
    ),
    TerminologyEntryModel(
        id="term-02",
        preferredTerm="intelligent workflow platform",
        restrictedTerm="fully autonomous employee replacement",
        explanation="AuraCloud is positioned as an intelligence amplifier, not workforce elimination.",
        approvedAlternative="intelligent workflow platform",
        category="capability_claim",
        status="active",
        createdAt="2026-06-12"
    ),
    TerminologyEntryModel(
        id="term-03",
        preferredTerm="99.95% verified uptime SLA",
        restrictedTerm="100% zero downtime",
        explanation="Contradicts verified engineering SLA of 99.95% with multi-region failover.",
        approvedAlternative="99.95% verified uptime SLA",
        category="capability_claim",
        status="active",
        createdAt="2026-07-01"
    )
]

facts_db: List[ApprovedFactModel] = [
    ApprovedFactModel(
        id="fact-01",
        title="Enterprise Availability SLA",
        statement="AuraCloud Workspace provides a 99.95% verified uptime Service Level Agreement backed by multi-region failover across 3 availability zones.",
        category="uptime_performance",
        source="Engineering Operational SLA Agreement v4.2, 2026",
        verificationStatus="verified",
        lastUpdated="2026-09-01"
    ),
    ApprovedFactModel(
        id="fact-02",
        title="SOC-2 Type II Certification",
        statement="AuraCloud completed independent SOC-2 Type II audit certification with zero non-conformity findings in August 2026, utilizing AES-256 at rest and TLS 1.3 in transit.",
        category="compliance_security",
        source="Independent Security Audit Report (Grant Thornton, Aug 2026)",
        verificationStatus="verified",
        lastUpdated="2026-08-28"
    )
]

reviews_db: List[ReviewDocumentModel] = []

# Inject shared stores into routers
set_guidelines_store(guidelines_db)
set_terminology_store(terminology_db)
set_facts_store(facts_db)
init_review_stores(reviews_db, guidelines_db, terminology_db, facts_db)
set_archive_reviews_store(reviews_db)
set_insights_reviews_store(reviews_db)

# Include Routers
app.include_router(guidelines_router)
app.include_router(terminology_router)
app.include_router(facts_router)
app.include_router(reviews_router)
app.include_router(archive_router)
app.include_router(insights_router)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "BrandGuard FastAPI + Python Deterministic + Gemini",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/overview")
def get_overview():
    unresolved = sum(r.summary.unresolvedFindings for r in reviews_db)
    return {
        "counts": {
            "rules": len([g for g in guidelines_db if g.status == "active"]),
            "terminology": len([t for t in terminology_db if t.status == "active"]),
            "facts": len(facts_db),
            "reviewedDocuments": len(reviews_db),
            "unresolvedFindings": unresolved,
            "totalFindings": sum(len(r.findings) for r in reviews_db)
        },
        "recentReviews": [r.dict() for r in reviews_db[:5]],
        "recentDecisions": [
            {
                "reviewId": r.id,
                "title": r.title,
                "decisionStatus": r.decisionStatus,
                "reviewer": r.reviewer,
                "decidedAt": r.decidedAt or r.updatedAt,
                "findingsCount": len(r.findings)
            }
            for r in reviews_db if r.decisionStatus != "pending"
        ][:5]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
