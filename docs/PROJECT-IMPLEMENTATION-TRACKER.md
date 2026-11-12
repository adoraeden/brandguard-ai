# BrandGuard AI — Implementation Tracker

This tracker separates the CodeNexus submission rounds from the internal implementation phases.

## Phase 1 — Initial codebase audit
- [x] Inspect the existing frontend, FastAPI backend, database, and deployed services.
- [x] Identify existing review, evidence, archive, and governance functionality.

## Phase 2 — CodeNexus Round 3 commitments

### 2.1 Automated evidence ingestion and extraction
- [x] PDF, DOCX, and TXT upload with validation and size limits.
- [x] Preserve the original upload and extracted page/section text in PostgreSQL.
- [x] Extract candidate facts and guidelines with source provenance.
- [x] Require a human edit/approve/reject decision before knowledge becomes active.
- [ ] Verify upload, extraction, approval, rejection, persistence, and knowledge-base refresh end to end against the deployed API.

### 2.2 Claim-to-evidence traceability
- [x] Retain claim-level findings and approved evidence record references.
- [x] Preserve exact evidence quotes and source document/page/section provenance.
- [x] Distinguish supported, partially supported, unsupported, and conflicting findings conservatively.
- [ ] Verify source links and evidence status across uploaded PDFs, facts, guidelines, and legacy records.
- [ ] Add regression coverage for conflicting and missing evidence cases.

### 2.3 Collaborative staged review workflow
- [x] Assign ordered review stages and named reviewers.
- [x] Enforce sequential approval and hand-off.
- [x] Support approve, return for changes, and reject decisions.
- [x] Record workflow events in the review audit history and export stage history as CSV.
- [ ] Verify persistence and reviewer hand-offs against the deployed API.
- [ ] Replace demo name-based assignment with authenticated reviewer identity before production use.

## Phase 3 — CodeNexus Round 1 improvements
- [ ] Evidence-linked detection: every finding points to an approved source/rule; show uncertainty when evidence is weak.
- [ ] Context-preserving suggestions: compare and edit suggestions; require explicit human approval; never silently publish.
- [ ] Governance insights: identify recurring violation categories and guideline gaps from review history.

## Phase 4 — Existing feature completion and bug fixes
- [ ] Complete the remaining Review Studio checkpoint and decision-flow acceptance checks.
- [ ] Verify archive, pending queue, re-analysis, and audit-history edge cases.
- [ ] Resolve outstanding API and UI defects without removing existing behavior.

## Phase 5 — Frontend and interaction refinement
- [ ] Review every navigation destination and empty/loading/error state.
- [ ] Fix responsive layout, scrolling, tables, dialogs, and accessibility.
- [ ] Keep reviewer workflows clear and consistent.

## Phase 6 — Demo account and personal access
- [ ] Define a repeatable judge/demo account and resettable demo data.
- [ ] Keep demo credentials separate from real personal accounts.
- [ ] Make demo permissions and limitations explicit.

## Phase 7 — Reliability and robustness
- [ ] Add CI for backend tests, frontend type-check, and production build.
- [ ] Validate database migrations and recovery procedures before deployment.
- [ ] Verify upload limits, duplicate detection, failure handling, and API health.
- [ ] Review authentication, authorization, CORS, rate limits, and secret handling.

## Phase 8 — Complete end-to-end journey
- [ ] Upload source document → extract passages → human approve/reject → verify active knowledge.
- [ ] Submit content → analyze → inspect exact evidence → decide findings → re-analyze.
- [ ] Assign reviewers → hand off stages → record decisions → export audit history.
- [ ] Verify existing records and decisions remain intact throughout.

## Phase 9 — Documentation and final submission
- [ ] Update README and architecture/workflow documentation to match implemented behavior.
- [ ] Capture fresh screenshots of the final working application.
- [ ] Verify deployment links and prepare the final CodeNexus submission materials.

## Deployment safety rules
- Keep main untouched during this work.
- Keep implementation changes on phase-2-round3-improvements.
- Use the existing Render PostgreSQL instance; do not create or silently switch to another database.
- Back up the current free PostgreSQL database before applying schema changes.
- Do not describe demo name-based reviewer assignment as production-grade access control.
