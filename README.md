# BrandGuard AI — Evidence-Grounded Brand Governance & Content Review Platform

<p align="center">
  **From brand guidelines to explainable content decisions.**
</p>

BrandGuard AI is a hybrid AI-powered brand governance platform that helps organizations review marketing content, product announcements, promotional copy, and external communications against their approved brand guidelines, terminology, technical facts, and messaging standards.

It combines a deterministic rule engine with Gemini-powered contextual analysis to identify potential content issues, explain why they matter, connect findings to approved evidence where available, and suggest revisions while keeping final decisions under human control.

**The central idea:** AI assists with reviewing and improving content. Humans remain responsible for approval and publication.

---

## Project Information

| Detail | Information |
|---|---|
| Project | BrandGuard AI |
| Hackathon | CodeNexus India 2026 — Code Pune |
| Round | Round 2 — Functional Prototype |
| Team | adoraeden07 |
| Team size | 1 — Individual participant |
| Project category | AI / Software |
| Repository | [GitHub — BrandGuard AI](https://github.com/adoraeden/brandguard-ai) |
| Working project | Deployment link to be added |
| Project documentation | Updated Round 2 PDF |

---

## 1. The Problem

Organizations create and publish content through marketing teams, employees, agencies, contractors, and AI-assisted tools.

However, their brand knowledge is often scattered across documents, product descriptions, internal guidelines, approved terminology, and informal reviewer feedback.

This creates several problems:

- Inconsistent use of product names and terminology.
- Promotional claims that are exaggerated or unsupported.
- Outdated or contradictory technical information.
- Content that does not match the organization's intended tone.
- Repeated manual review work.
- Difficulty tracing reviewer feedback to an approved source.

A conventional grammar checker cannot reliably determine whether a statement follows an organization's own policies or whether a product claim is supported by its approved information.

BrandGuard AI addresses this by bringing approved brand knowledge, content analysis, evidence references, suggested corrections, and human review into one workflow.

---

## 2. Our Solution

BrandGuard AI provides a centralized workspace where users can maintain brand information and review content before publication.

### End-to-end workflow

```text
       APPROVED BRAND KNOWLEDGE
                  |
                  v
       BRAND INTELLIGENCE MODULE
   Guidelines | Terminology | Factsheets
           | Knowledge Sources
                  |
                  v
        SUBMIT CONTENT FOR REVIEW
                  |
                  v
          HYBRID REVIEW ENGINE
                  |
          +-------+-------+
          |               |
          v               v
    DETERMINISTIC       GEMINI AI
     RULE ENGINE       ANALYSIS
          |               |
          +-------+-------+
                  |
                  v
       FINDINGS & EVIDENCE REFERENCES
                  |
                  v
        SUGGESTED CORRECTIONS
                  |
                  v
          HUMAN REVIEWER
                  |
       +----------+----------+
       |          |          |
       v          v          v
     ACCEPT      EDIT      REJECT
       |          |          |
       +----------+----------+
                  |
                  v
         DECISION & AUDIT HISTORY
                  |
                  v
          GOVERNANCE INSIGHTS
```

The platform does not automatically publish content or treat AI-generated findings as unquestionable facts.

---

## 3. Completed Features — Round 2

The following features have been implemented in the functional prototype.

### A. Governance Dashboard

- Centralized governance overview.
- Review and content statistics.
- Stored brand guideline and terminology information.
- Review pipeline visibility.
- Governance metrics derived from persisted application data.
- Demonstration scenarios using AuraCloud Technologies sample data.

### B. Brand Intelligence

A centralized area for managing approved brand information.

**Brand Guidelines**
- Create and manage brand communication guidelines.
- Define tone, messaging standards, and restrictions.
- Maintain the standards used during content review.

**Terminology Catalogue**
- Store approved terminology.
- Define prohibited alternatives and explanations.
- Assign categories and priority levels.
- Support Critical, High, Medium, and Low priorities.

**Audited Technical Factsheets**
- Maintain approved technical facts and claims.
- Store supporting evidence or source information.
- Track review status.

**Knowledge Sources**
- Store source names, source types, references, descriptions, and approval status.
- Maintain source information used during review.

Brand Intelligence records persist in PostgreSQL across application refreshes and backend restarts.

### C. Hybrid Content Review Engine

**1. Deterministic Rule Engine — Python**

Performs rule-based checks such as:
- Restricted terminology detection.
- Prohibited phrase matching.
- Configured brand-rule checks.
- Known contradictory claim checks against stored information.

**2. Gemini Contextual Analysis**

Uses the Google Gemini API to examine content beyond exact phrase matching.

Its contextual analysis includes:
- Tone-of-voice issues.
- Hyperbolic or exaggerated promotional claims.
- Potentially misleading guarantees.
- Contextual inconsistencies.
- Unsupported or insufficiently grounded claims.
- Intent-preserving revision suggestions.

**3. Combined Findings**

The review workspace brings analysis results together so reviewers can inspect findings, their severity, explanations, relevant evidence references, and proposed changes.

### D. Evidence Validation

BrandGuard AI includes backend validation for Gemini-generated evidence references.

- Checks whether a cited database record exists.
- Checks whether the referenced record is approved.
- Verifies that the quoted excerpt appears in the referenced record.
- Checks textual overlap with the flagged content.
- Withholds mismatched or unapproved citations.
- Labels unsupported claims as **Insufficient Evidence** when relevant supporting sources cannot be established.
- Supplies evidence titles and references from database records rather than trusting model-generated citation details.

Suggestions that introduce unapproved statistics or named certifications are also filtered.

**Important limitation:** These checks validate record status and textual correspondence. They do not guarantee that the source semantically proves every conclusion. Human verification remains necessary.

### E. Review Studio

The central content-review workspace.

- Submit and inspect content drafts.
- View flagged text and linked finding pins.
- Inspect finding categories and severity.
- Review contextual explanations and evidence.
- View proposed revisions.
- Accept suggestions.
- Edit suggestions before accepting them.
- Reject suggestions.
- Track accepted, rejected, and unresolved items.
- Maintain a revised draft without silently publishing changes.

### F. Re-run Analysis

Existing reviews can be analyzed again without creating an entirely new review.

Implemented behaviour:
- Dedicated **Re-run Analysis** button.
- Reuses the existing review ID.
- Analyzes the persisted current draft.
- Runs deterministic checks and contextual analysis.
- Adds only findings that are not already present.
- Preserves accepted, rejected, and edited suggestions.
- Does not overwrite the current revised draft.
- Records analysis run information, reviewer, timestamp, status, and outcome in audit history.
- Can add new findings to an existing completed review while retaining previous audit records.

An empty result is explicitly not treated as a safety approval.

### G. Decision Archive and Audit History

- Historical review records.
- Reviewer decisions.
- Accepted and rejected suggestions.
- Edited revisions.
- Review status and completion information.
- Audit history for important review actions.
- Completion certificate view for completed review records.

### H. Governance Insights

- Displays governance information derived from stored review data.
- Highlights recurring violation categories.
- Provides recommendations that can help identify unclear or incomplete brand guidelines.

### I. Database Persistence

PostgreSQL stores the application's core data, including:

- Brand guidelines.
- Terminology entries.
- Approved facts.
- Knowledge sources.
- Review documents.
- Review findings.
- Review suggestions.
- Review decision and audit records.

The implementation also includes safe additive database migrations for new analysis and evidence-tracking fields.

---

## 4. Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React 19 | Application interface |
| Language | TypeScript | Frontend logic and type safety |
| Styling | Tailwind CSS v4 | UI styling and layout |
| Icons | Lucide Icons | Interface icons |
| Backend | Python FastAPI | API and application workflow |
| Rule engine | Python | Deterministic brand checks |
| AI integration | Google Gemini API — Gemini 3.1 Flash Lite | Contextual content analysis |
| Database | PostgreSQL | Persistent application data |
| ORM | SQLAlchemy | Database interaction |
| Version control | Git and GitHub | Source-code management |
| Frontend hosting | Vercel — planned/deployment status to be confirmed | Frontend hosting |
| Backend hosting | Render — planned/deployment status to be confirmed | API hosting |

**Development tools:** Visual Studio Code, Google AI Studio, Git, and command-line development tools.

The AI model is accessed through the backend. The Gemini API key is stored server-side and must not be exposed in frontend code or the public repository.

---

## 5. System Architecture and Implementation

BrandGuard AI uses a separated frontend, backend, database, and analysis architecture.

```text
+---------------------------+
|       REACT FRONTEND      |
|                           |
| Dashboard                 |
| Brand Intelligence        |
| Review Studio             |
| Decision Archive          |
| Governance Insights       |
+-------------+-------------+
              |
              | HTTP API
              v
+---------------------------+
|       FASTAPI BACKEND     |
|                           |
| Review Workflow           |
| Validation                |
| Persistence               |
| Decision Management       |
| Analysis Orchestration    |
+-------------+-------------+
              |
       +------+------+
       |             |
       v             v
+-------------+ +----------------+
| Python Rule | | Gemini API     |
| Engine      | | Contextual AI  |
+------+------+ +-------+--------+
       |                |
       +--------+-------+
                |
                v
+---------------------------+
|         POSTGRESQL        |
|                           |
| Guidelines                |
| Terminology               |
| Approved Facts            |
| Knowledge Sources         |
| Reviews and Findings      |
| Suggestions and Audits    |
+---------------------------+
```

### Backend responsibilities

- API request handling and validation.
- Deterministic analysis.
- Gemini analysis orchestration.
- Evidence validation.
- Review and suggestion persistence.
- Human decision recording.
- Audit history and governance metrics.

### Example API boundaries

| Endpoint | Purpose |
|---|---|
| `GET /api/overview` | Governance dashboard data |
| `POST /api/reviews` | Create a content review |
| `GET /api/reviews/{review_id}` | Retrieve a review |
| `POST /api/reviews/{review_id}/rerun-analysis` | Re-run analysis |
| Review decision endpoints | Persist human decisions |
| Guidelines, terminology, facts and source endpoints | Manage brand intelligence |

The API is implemented through FastAPI routers. The exact endpoint set can be inspected in the source repository.

---

## 6. Changes from the Original Round 1 Plan

The Round 1 proposal defined a broader product roadmap. During Round 2, implementation was focused on delivering a functional text-review workflow rather than spreading development across partially implemented features.

| Original proposal | Round 2 implementation |
|---|---|
| Centralized brand knowledge base | Implemented Brand Intelligence for guidelines, terminology, factsheets, and knowledge sources |
| Text submission and review | Implemented Review Studio and persisted review records |
| Deterministic rule checks | Implemented Python-based rule engine |
| Contextual AI review | Integrated Gemini contextual analysis |
| Evidence-linked findings | Implemented database-backed evidence validation and evidence references |
| Correction suggestions | Implemented suggested revisions and human accept/edit/reject decisions |
| Review history | Implemented Decision Archive and audit records |
| Repeated analysis | Added Re-run Analysis for existing reviews |
| Governance analytics | Implemented Governance Insights using stored review data |
| Visual and accessibility checks | Deferred to future development |

### Why the scope changed

The main development decision was to prioritize reliability, traceability, and a complete human review loop.

Instead of attempting advanced visual asset checks, broad document processing, and publishing integrations immediately, the Round 2 prototype focused on the main value proposition:

**Approved brand information → content submission → hybrid analysis → evidence and suggestions → human decisions → audit history.**

The architecture and scope evolved during implementation. Some proposed production capabilities, such as organization-level role-based access control, were not completed in the prototype.

---

## 7. Validation and Testing

The following checks have been performed during development.

| Validation area | Result |
|---|---|
| Gemini evidence validation tests | 4 passed |
| Valid evidence reference | Tested |
| Mismatched evidence reference | Tested |
| Missing evidence reference | Tested |
| Unapproved numbers/certifications in suggestions | Tested |
| Python syntax and backend import checks | Passed |
| PostgreSQL persistence and migration checks | Passed |
| Review rerun scenarios | Passed |
| Duplicate-free repeated reruns | Passed |
| Accepted/rejected decision preservation | Passed |
| Completed-review rerun scenarios | Passed |
| FastAPI HTTP smoke test | Passed |
| Frontend lint | Passed |
| Frontend production build | Passed |

The rerun tests included initial AI failure, zero findings, accepted and rejected suggestions, audit-history preservation, and repeated reruns.

**Testing limitation:** These rerun regression tests did not use a live Gemini request. A live Gemini review should be demonstrated separately, and AI availability can affect the contextual analysis result.

---

## 8. Screenshots and Product Demonstration

The following section documents the actual application interface. Screenshots should be stored in the repository under `docs/screenshots/`.

| Screenshot | What it demonstrates |
|---|---|
| `01-overview.png` | Governance dashboard and review overview |
| `02-brand-intelligence.png` | Brand guidelines and centralized brand information |
| `03-terminology.png` | Approved and prohibited terminology |
| `04-factsheets.png` | Approved technical facts and supporting information |
| `05-knowledge-sources.png` | Knowledge source management |
| `06-review-studio.png` | Content review and flagged findings |
| `07-evidence-findings.png` | Evidence references, severity, and contextual explanations |
| `08-suggestions.png` | Suggested revisions and reviewer decisions |
| `09-rerun-analysis.png` | Re-run Analysis workflow |
| `10-decision-archive.png` | Review history and audit trail |
| `11-governance-insights.png` | Governance insights and recurring patterns |
| `12-review-completion.png` | Completed review record and certificate |

### Screenshots

Add the actual screenshots below after placing the image files in `docs/screenshots/`.

```markdown
## Application Screenshots

### 1. Governance Dashboard
![Governance Dashboard](docs/screenshots/01-overview.png)

### 2. Brand Intelligence
![Brand Intelligence](docs/screenshots/02-brand-intelligence.png)

### 3. Terminology Management
![Terminology](docs/screenshots/03-terminology.png)

### 4. Technical Factsheets
![Factsheets](docs/screenshots/04-factsheets.png)

### 5. Knowledge Sources
![Knowledge Sources](docs/screenshots/05-knowledge-sources.png)

### 6. Review Studio
![Review Studio](docs/screenshots/06-review-studio.png)

### 7. Evidence-Linked Findings
![Evidence Findings](docs/screenshots/07-evidence-findings.png)

### 8. Suggested Revisions
![Suggestions](docs/screenshots/08-suggestions.png)

### 9. Re-run Analysis
![Re-run Analysis](docs/screenshots/09-rerun-analysis.png)

### 10. Decision Archive
![Decision Archive](docs/screenshots/10-decision-archive.png)

### 11. Governance Insights
![Governance Insights](docs/screenshots/11-governance-insights.png)

### 12. Review Completion
![Review Completion](docs/screenshots/12-review-completion.png)
```

---

## 9. Three Major Improvements Planned for Round 3

Round 3 will focus on meaningful product improvements rather than cosmetic changes.

### Improvement 1 — Stronger Evidence Reasoning and Verification

**Current foundation:** Evidence references are checked against approved database records, and quoted excerpts are validated.

**Round 3 goal:**
- Improve semantic relevance between a source and the claim it is used to support.
- Better distinguish direct contradictions, unsupported claims, and contextual concerns.
- Improve confidence and uncertainty handling.
- Reduce false positives and incorrect evidence associations.
- Expand regression testing with deliberately misleading and contradictory examples.

**Expected value:** More trustworthy and explainable findings.

### Improvement 2 — Context-Preserving Revision and Human Approval Workflow

**Current foundation:** Reviewers can accept, edit, or reject suggestions, and decisions are recorded.

**Round 3 goal:**
- Improve preservation of the original author's intent.
- Add clearer original-versus-proposed revision comparisons.
- Improve reviewer comments and change explanations.
- Strengthen version tracking and review reopening rules.
- Maintain human approval before any revision is considered final.

**Expected value:** More useful corrections without sacrificing author intent or reviewer control.

### Improvement 3 — Advanced Governance Intelligence and Guideline Gap Detection

**Current foundation:** Governance Insights summarizes recurring patterns from stored review data.

**Round 3 goal:**
- Identify repeated violation categories across reviews.
- Detect frequently misunderstood or repeatedly violated guidelines.
- Highlight terminology and policy areas that may need clarification.
- Recommend specific guideline improvements based on recurring findings.
- Provide more useful historical trend analysis.

**Expected value:** Move beyond reviewing individual drafts to helping organizations improve their brand-governance process over time.

---

## 10. Responsible AI, Privacy and Security

BrandGuard AI is designed with human oversight and transparent AI use in mind.

Current safeguards and design boundaries:

- Gemini API credentials are kept in backend environment configuration.
- AI-generated evidence references are validated before being presented.
- Unsupported claims are not automatically treated as verified facts.
- Suggestions do not silently replace the reviewer's draft.
- Human decisions are preserved in audit history.
- Empty analysis results are not treated as proof of compliance.
- No automatic publishing is performed.

### Current prototype limitations

- Authentication is demonstration-oriented and is not production-grade authentication or authorization.
- Organization-level role-based access controls are not fully implemented.
- Evidence validation checks record approval and textual correspondence but cannot guarantee semantic entailment.
- Gemini analysis depends on external API availability.
- The demonstration dataset represents an illustrative organization and is not independent verification of real-world product claims.
- Legal, regulatory, and factual approval must remain with qualified human reviewers.

These limitations are acknowledged rather than presented as completed production features.

---

## 11. Demonstration Dataset

The prototype uses sample brand information for **AuraCloud Technologies**, an illustrative enterprise workflow and cloud-governance provider.

Examples of demonstration standards include:

- Approved product terminology: AuraCloud Workspace.
- Ethical AI positioning: AI augments human teams rather than replacing employees.
- Uptime reference: the configured 99.95% availability figure.
- Security messaging: wording based on the configured sample factsheets and supporting evidence.

The sample data is intended to demonstrate how an organization-specific knowledge base can guide content review. It should not be interpreted as independently verified information about a real company.

---

## 12. Local Installation and Setup

### Prerequisites

- Python 3.12 or compatible version.
- Node.js and npm.
- PostgreSQL.
- Gemini API key for contextual analysis.

### Clone the repository

```bash
git clone https://github.com/adoraeden/brandguard-ai.git
cd brandguard-ai
```

### Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` with your local database credentials and Gemini API key:

```env
DATABASE_URL=postgresql+psycopg2://USERNAME:PASSWORD@localhost:5432/brandguard
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Do not commit `.env` or expose API credentials.

Start the FastAPI backend:

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend setup

Open a second terminal in the repository root:

```powershell
npm install
npm run dev:frontend
```

Open the local Vite URL shown in the terminal, typically:

`http://localhost:5173`

The FastAPI backend must be running for the frontend to load and save application data.

---

## 13. Future Scope

Beyond the three Round 3 priorities, potential future extensions include:

- Visual brand asset checks for logos, colours, and templates.
- Accessibility and readability analysis.
- Expanded document and PDF ingestion.
- Organization-level roles and permissions.
- Version-aware guideline and source management.
- Content-management and publishing integrations.
- More advanced review analytics.

These are future possibilities, not features claimed as completed in Round 2.

---

## 14. Project Links and Submission Information

| Deliverable | Link |
|---|---|
| Working application | Add verified deployment URL |
| Source code | [BrandGuard AI — GitHub Repository](https://github.com/adoraeden/brandguard-ai) |
| Updated Round 2 PDF | Add PDF link |
| Screenshots | `docs/screenshots/` |

**Submission note:** This is an individual project submission. The sole participant is responsible for the project, development, implementation, testing, and demonstration.

---

## 15. Conclusion

BrandGuard AI turns organization-specific brand standards into a practical content-review workflow.

By combining deterministic checks, contextual AI analysis, database-backed evidence validation, editable suggestions, human decisions, and persistent audit history, the platform aims to make content governance more explainable and manageable.

The Round 2 prototype establishes the central workflow. Round 3 will focus on strengthening evidence reasoning, improving revision and approval workflows, and turning recurring review patterns into actionable governance intelligence.

**BrandGuard AI — Review with evidence. Revise with context. Approve with confidence.**
