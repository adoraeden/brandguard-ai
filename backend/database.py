import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import Column, DateTime, ForeignKey, Integer, LargeBinary, String, Text, create_engine, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

# Load backend/.env before reading DATABASE_URL or constructing the engine.
load_dotenv(Path(__file__).with_name(".env"))
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be set in backend/.env or the environment")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
if not DATABASE_URL.startswith("postgresql+psycopg2://"):
    raise RuntimeError("DATABASE_URL must use the postgresql+psycopg2:// driver")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
Base = declarative_base()


class DBIngestedDocument(Base):
    __tablename__ = "ingested_documents"
    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256 = Column(String, nullable=False, unique=True, index=True)
    file_data = Column(LargeBinary, nullable=False)
    extraction_status = Column(String, nullable=False)
    extracted_pages = Column(JSONB, nullable=False, default=list)
    uploaded_by = Column(String, nullable=False)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    candidates = relationship("DBEvidenceCandidate", cascade="all, delete-orphan",
                              order_by="DBEvidenceCandidate.position")


class DBEvidenceCandidate(Base):
    __tablename__ = "evidence_candidates"
    id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("ingested_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(Integer, nullable=False, default=0)
    candidate_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    excerpt = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    section_label = Column(String, nullable=True)
    confidence = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    approved_record_type = Column(String, nullable=True)
    approved_record_id = Column(String, nullable=True)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(String, nullable=True)


class DBDocumentAudit(Base):
    __tablename__ = "document_ingestion_audit"
    id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("ingested_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    reviewer = Column(String, nullable=True)
    previous_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class DBBrandGuideline(Base):
    __tablename__ = "brand_guidelines"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String, nullable=False)
    source_reference = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")
    last_updated = Column(String, nullable=False)
    approved_example = Column(Text, nullable=True)
    prohibited_example = Column(Text, nullable=True)
    source_document_id = Column(String, ForeignKey("ingested_documents.id", ondelete="SET NULL"), nullable=True)
    source_page_number = Column(Integer, nullable=True)
    source_section_label = Column(String, nullable=True)
    source_excerpt = Column(Text, nullable=True)


class DBTerminology(Base):
    __tablename__ = "terminology_entries"
    id = Column(String, primary_key=True)
    preferred_term = Column(String, nullable=False)
    restricted_term = Column(String, nullable=False, index=True)
    explanation = Column(Text, nullable=False)
    approved_alternative = Column(String, nullable=False)
    category = Column(String, nullable=False)
    priority = Column(String, nullable=False, default="medium", server_default="medium")
    status = Column(String, nullable=False, default="active")
    created_at = Column(String, nullable=False)


class DBApprovedFact(Base):
    __tablename__ = "approved_facts"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    statement = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    source = Column(String, nullable=False)
    verification_status = Column(String, nullable=False, default="verified")
    last_updated = Column(String, nullable=False)
    source_document_id = Column(String, ForeignKey("ingested_documents.id", ondelete="SET NULL"), nullable=True)
    source_page_number = Column(Integer, nullable=True)
    source_section_label = Column(String, nullable=True)
    source_excerpt = Column(Text, nullable=True)


class DBKnowledgeSource(Base):
    __tablename__ = "knowledge_sources"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    source_type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    version = Column(String, nullable=False)
    effective_date = Column(String, nullable=False)
    rule_count = Column(Integer, nullable=False, default=0)
    source_url = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="active")


class DBReviewDocument(Base):
    __tablename__ = "review_documents"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    original_content = Column(Text, nullable=False)
    current_content = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="in_review")
    reviewer = Column(String, nullable=False)
    decision_status = Column(String, nullable=False, default="pending")
    decision_notes = Column(Text, nullable=True)
    decided_at = Column(String, nullable=True)
    summary = Column(JSONB, nullable=False, default=dict)
    ai_analysis_status = Column(String, nullable=True)
    ai_analysis_message = Column(Text, nullable=True)
    deterministic_analysis_status = Column(String, nullable=True)
    deterministic_analysis_message = Column(Text, nullable=True)
    last_analysis_run_id = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    findings = relationship("DBReviewFinding", cascade="all, delete-orphan", order_by="DBReviewFinding.position")
    audit_history = relationship("DBDecisionAudit", cascade="all, delete-orphan", order_by="DBDecisionAudit.created_at")
    workflow_stages = relationship("DBReviewStage", cascade="all, delete-orphan", order_by="DBReviewStage.stage_order")


class DBReviewStage(Base):
    __tablename__ = "review_workflow_stages"
    id = Column(String, primary_key=True)
    review_id = Column(String, ForeignKey("review_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    stage_order = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    assigned_reviewer = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    decision_note = Column(Text, nullable=True)
    created_by = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class DBReviewFinding(Base):
    __tablename__ = "review_findings"
    id = Column(String, primary_key=True)
    review_id = Column(String, ForeignKey("review_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    exact_text = Column(Text, nullable=False)
    start_index = Column(Integer, nullable=True)
    end_index = Column(Integer, nullable=True)
    explanation = Column(Text, nullable=False)
    source_rule_or_term = Column(String, nullable=False)
    source_reference = Column(String, nullable=False)
    detection_method = Column(String, nullable=False)
    confidence = Column(String, nullable=False)
    evidence_record_type = Column(String, nullable=True)
    evidence_record_id = Column(String, nullable=True)
    evidence_quote = Column(Text, nullable=True)
    evidence_status = Column(String, nullable=True)
    source_document_id = Column(String, nullable=True)
    source_page_number = Column(Integer, nullable=True)
    source_section_label = Column(String, nullable=True)
    source_excerpt = Column(Text, nullable=True)
    analysis_run_id = Column(String, nullable=True, index=True)
    finding_decision = Column(String, nullable=True)
    finding_decision_reviewer = Column(String, nullable=True)
    finding_decision_at = Column(String, nullable=True)
    finding_decision_note = Column(Text, nullable=True)
    suggestion = relationship("DBReviewSuggestion", uselist=False, cascade="all, delete-orphan")
    lifecycle_status = Column(
    String,
    nullable=False,
    default="active",
    server_default="active",
)

class DBReviewSuggestion(Base):
    __tablename__ = "review_suggestions"
    id = Column(String, primary_key=True)
    finding_id = Column(String, ForeignKey("review_findings.id", ondelete="CASCADE"), unique=True, nullable=False)
    suggested_text = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    author_intent_preserved = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="pending")
    custom_edited_text = Column(Text, nullable=True)
    applied_start = Column(Integer, nullable=True)
    applied_end = Column(Integer, nullable=True)
    replaced_text = Column(Text, nullable=True)


class DBDecisionAudit(Base):
    __tablename__ = "review_decision_audit"
    id = Column(String, primary_key=True)
    review_id = Column(String, ForeignKey("review_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    reviewer = Column(String, nullable=True)
    previous_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    # create_all only creates missing tables; it does not drop existing data.
    Base.metadata.create_all(bind=engine)
    # Add columns introduced since the original, previously unused schema. These
    # additive migrations preserve all existing rows and are safe to rerun.
    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE brand_guidelines ADD COLUMN IF NOT EXISTS source_document_id VARCHAR REFERENCES ingested_documents(id) ON DELETE SET NULL"
        ))
        connection.execute(text("ALTER TABLE brand_guidelines ADD COLUMN IF NOT EXISTS source_page_number INTEGER"))
        connection.execute(text("ALTER TABLE brand_guidelines ADD COLUMN IF NOT EXISTS source_section_label VARCHAR"))
        connection.execute(text("ALTER TABLE brand_guidelines ADD COLUMN IF NOT EXISTS source_excerpt TEXT"))
        connection.execute(text("ALTER TABLE evidence_candidates ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0"))
        connection.execute(text(
            "ALTER TABLE approved_facts ADD COLUMN IF NOT EXISTS source_document_id VARCHAR REFERENCES ingested_documents(id) ON DELETE SET NULL"
        ))
        connection.execute(text("ALTER TABLE approved_facts ADD COLUMN IF NOT EXISTS source_page_number INTEGER"))
        connection.execute(text("ALTER TABLE approved_facts ADD COLUMN IF NOT EXISTS source_section_label VARCHAR"))
        connection.execute(text("ALTER TABLE approved_facts ADD COLUMN IF NOT EXISTS source_excerpt TEXT"))
        connection.execute(text(
            "ALTER TABLE review_documents ADD COLUMN IF NOT EXISTS decided_at VARCHAR"
        ))
        connection.execute(text(
            "ALTER TABLE review_documents ADD COLUMN IF NOT EXISTS summary JSONB NOT NULL DEFAULT '{}'::jsonb"
        ))
        connection.execute(text(
            "ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS source_url TEXT"
        ))
        connection.execute(text(
            "ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'active'"
        ))
        connection.execute(text("ALTER TABLE terminology_entries ADD COLUMN IF NOT EXISTS priority VARCHAR"))
        connection.execute(text("""UPDATE terminology_entries SET priority = CASE
            WHEN category IN ('product_naming', 'capability_claim') THEN 'critical' ELSE 'high' END
            WHERE priority IS NULL"""))
        connection.execute(text("ALTER TABLE terminology_entries ALTER COLUMN priority SET DEFAULT 'medium'"))
        connection.execute(text("ALTER TABLE terminology_entries ALTER COLUMN priority SET NOT NULL"))
        connection.execute(text(
            "ALTER TABLE review_documents ADD COLUMN IF NOT EXISTS ai_analysis_status VARCHAR"
        ))
        connection.execute(text(
            "ALTER TABLE review_documents ADD COLUMN IF NOT EXISTS ai_analysis_message TEXT"
        ))
        connection.execute(text(
            "ALTER TABLE review_documents ADD COLUMN IF NOT EXISTS last_analysis_run_id VARCHAR"
        ))
        connection.execute(text(
            "ALTER TABLE review_documents ADD COLUMN IF NOT EXISTS deterministic_analysis_status VARCHAR"
        ))
        connection.execute(text(
            "ALTER TABLE review_documents ADD COLUMN IF NOT EXISTS deterministic_analysis_message TEXT"
        ))
        connection.execute(text(
            "ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS evidence_record_type VARCHAR"
        ))
        connection.execute(text(
            "ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS evidence_record_id VARCHAR"
        ))
        connection.execute(text(
            "ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS evidence_quote TEXT"
        ))
        connection.execute(text("ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS evidence_status VARCHAR"))
        connection.execute(text("ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS source_document_id VARCHAR"))
        connection.execute(text("ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS source_page_number INTEGER"))
        connection.execute(text("ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS source_section_label VARCHAR"))
        connection.execute(text("ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS source_excerpt TEXT"))
        connection.execute(text(
            "ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS analysis_run_id VARCHAR"
        ))
        connection.execute(text(
            "ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS finding_decision VARCHAR"
        ))
        connection.execute(text(
            "ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS finding_decision_reviewer VARCHAR"
        ))
        connection.execute(text(
            "ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS finding_decision_at VARCHAR"
        ))
        connection.execute(text(
            "ALTER TABLE review_findings ADD COLUMN IF NOT EXISTS finding_decision_note TEXT"
        ))
        connection.execute(text("""
    ALTER TABLE review_findings
    ADD COLUMN IF NOT EXISTS lifecycle_status
    VARCHAR NOT NULL DEFAULT 'active'
"""))
        connection.execute(text(
            "ALTER TABLE review_suggestions ADD COLUMN IF NOT EXISTS applied_start INTEGER"
        ))
        connection.execute(text(
            "ALTER TABLE review_suggestions ADD COLUMN IF NOT EXISTS applied_end INTEGER"
        ))
        connection.execute(text(
            "ALTER TABLE review_suggestions ADD COLUMN IF NOT EXISTS replaced_text TEXT"
        ))
