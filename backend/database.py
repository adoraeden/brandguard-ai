import os
from sqlalchemy import create_engine, Column, String, Text, Integer, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./brandguard.db")

# Support postgresql:// URL format if provided by Render or hosted Postgres
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DBBrandGuideline(Base):
    __tablename__ = "brand_guidelines"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String, nullable=False)
    source_reference = Column(String, nullable=False)
    status = Column(String, default="active")
    last_updated = Column(String, nullable=False)
    prohibited_example = Column(Text, nullable=True)
    approved_example = Column(Text, nullable=True)

class DBTerminology(Base):
    __tablename__ = "terminology_entries"
    id = Column(String, primary_key=True, index=True)
    preferred_term = Column(String, nullable=False)
    restricted_term = Column(String, nullable=False, index=True)
    explanation = Column(Text, nullable=False)
    approved_alternative = Column(String, nullable=False)
    category = Column(String, nullable=False)
    status = Column(String, default="active")
    created_at = Column(String, nullable=False)

class DBApprovedFact(Base):
    __tablename__ = "approved_facts"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    statement = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    source = Column(String, nullable=False)
    verification_status = Column(String, default="verified")
    last_updated = Column(String, nullable=False)

class DBReviewDocument(Base):
    __tablename__ = "review_documents"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    original_content = Column(Text, nullable=False)
    current_content = Column(Text, nullable=False)
    status = Column(String, default="in_review")
    reviewer = Column(String, nullable=False)
    decision_status = Column(String, default="pending")
    decision_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)
