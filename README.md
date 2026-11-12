# BrandGuard AI
### Evidence-Grounded Brand Governance & Content Review Platform

BrandGuard AI is an AI-powered platform that helps teams maintain brand consistency and review marketing content before publication. It combines deterministic rule-based checks with Gemini-powered contextual analysis to identify unsupported claims, inconsistent messaging, and violations of brand guidelines.

---

## 1. Problem Statement

Organizations often maintain brand guidelines, approved terminology, product facts, and communication rules across multiple documents and platforms.

As a result:
- Marketing content may contain unsupported or inaccurate claims.
- Brand terminology and tone may be applied inconsistently.
- Reviewers may struggle to trace findings back to approved information.
- Manual reviews can be time-consuming and difficult to track.

BrandGuard AI addresses these challenges through a centralized, evidence-grounded content review workflow.

## 2. Proposed Solution

BrandGuard AI brings brand knowledge, content analysis, and human review into one platform.

Users can store approved brand information, submit content for analysis, inspect evidence-backed findings, and decide whether to accept, edit, or reject suggested corrections.

The platform combines two analysis approaches:

- **Deterministic analysis:** Checks content against configured rules and brand requirements.
- **AI-powered analysis:** Uses Google Gemini to identify contextual issues and suggest improvements.

AI findings are advisory. Final decisions remain with the human reviewer.

## 3. Key Features

### Brand Intelligence
A centralized knowledge base for managing:
- Brand guidelines and communication rules.
- Approved terminology and preferred wording.
- Product facts and approved claims.
- Knowledge sources used during content verification.

### Content Analysis
- Rule-based checks for configured brand requirements.
- Gemini-powered contextual analysis.
- Detection of inconsistent messaging and potentially unsupported claims.
- Findings with severity, explanations, and suggested corrections.

### Evidence Validation
- Checks whether findings reference approved knowledge-base records.
- Validates quoted evidence against stored information.
- Withholds mismatched or unapproved citations.
- Identifies claims that lack sufficient supporting evidence.

### Review Studio
- Review individual findings and their supporting information.
- Accept, edit, or reject suggested corrections.
- Preserve the revised content.
- Re-run analysis after making changes.

### Re-analysis and Audit History
- Re-analyse updated content using the same review.
- Avoid duplicate findings where possible.
- Preserve existing reviewer decisions and audit history.
- Record analysis status, reviewer information, and outcomes.

### Governance Insights
Provides insights derived from stored review data, helping users understand recurring issues and areas that may need improvements to brand guidelines.

## 4. System Workflow

The main workflow takes content from submission through analysis and human approval.

```mermaid
flowchart TD
    A[Brand Knowledge Base] --> B[Content Submission]
    B --> C[Deterministic Rule Engine]
    B --> D[Gemini AI Analysis]
    C --> E[Evidence Validation]
    D --> E
    E --> F[Analysis Findings]
    F --> G[Review Studio]
    G --> H{Reviewer Decision}
    H -->|Accept| I[Approved Suggestion]
    H -->|Edit| J[Revised Content]
    H -->|Reject| K[Rejected Suggestion]
    I --> L[Decision Archive]
    J --> L
    K --> L
    J --> M[Re-run Analysis]
    M --> C
    M --> D
    L --> N[Governance Insights]
```

## 5. System Architecture

The application uses a React frontend, FastAPI backend, PostgreSQL database, and Gemini API integration.

```mermaid
flowchart TB
    U[User] --> FE[React + TypeScript Frontend]
    FE --> API[FastAPI Backend]
    API --> RULES[Deterministic Rule Engine]
    API --> AI[Google Gemini API]
    API --> DB[(PostgreSQL Database)]
    RULES --> API
    AI --> API
    DB --> API
    API --> FE
```

**Architecture responsibilities:**

| Component | Responsibility |
|---|---|
| React frontend | User interface, content submission, review and insights |
| FastAPI backend | API endpoints and application logic |
| Rule engine | Deterministic brand compliance checks |
| Gemini API | Contextual content analysis and suggestions |
| PostgreSQL | Brand knowledge, reviews, findings and audit records |
| SQLAlchemy | Database interaction and models |

## 6. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| AI integration | Google Gemini API |
| Build tool | Vite |

## 7. Analysis Reliability and Failure Handling

BrandGuard AI distinguishes between different analysis outcomes instead of treating every empty result as a successful review.

It handles:
- Analysis completed with findings.
- Analysis completed with no new findings.
- Deterministic analysis completed while Gemini failed.
- Both analysis methods failing.
- Analysis services being unavailable or unconfigured.

Failures are reported honestly, and users can retry analysis. Re-analysis also preserves existing decisions, including rejected review decisions and their audit history.

An analysis with no findings is not a guarantee that content is completely safe or compliant.

## 8. Completed Post-Round-2 Improvements

The three commitments made after Round 2 are implemented in the current development branch.

### 1. Automated Evidence Ingestion and Extraction
- Upload PDF, DOCX and TXT source documents (15 MB maximum).
- Extract text and preserve the original uploaded file.
- Create candidate fact and guideline passages with page/section provenance.
- Let a reviewer edit, approve or reject every candidate before it enters approved knowledge.
- Preserve uploader, reviewer, source document and extraction metadata.
- Detect duplicate uploads and handle documents with no candidate passages.
- Limitation: image-only scanned PDFs are not OCR-processed.

### 2. Claim-to-Evidence Traceability
- Link findings to approved facts, guidelines, terminology entries or uploaded knowledge sources.
- Store the cited evidence quote and evidence status.
- Resolve uploaded-source citations to the original document, page, section and excerpt when available.
- Distinguish supported, partially supported, unsupported, conflicting and not-assessed outcomes.
- Reject mismatched AI citations rather than presenting them as validated evidence.
- A policy or terminology reference is not presented as proof that a factual claim is true.

### 3. Collaborative Staged Review Workflow
- Add sequential review stages and assign a reviewer to each stage.
- Record stage approvals, returns, rejections and hand-off notes.
- Prevent later stages from progressing before earlier stages are completed.
- Export workflow history as CSV.
- Limitation: reviewer names and demo profiles are workflow attribution, not production authentication or role-based access control.

## 9. Additional Product Improvements

- Evidence-linked detection combines deterministic brand rules with Gemini contextual analysis and evidence validation.
- Suggested corrections include rationale and an explanation of how author intent is preserved.
- Reviewers explicitly accept, edit or reject suggestions; AI does not silently publish or replace content.
- Re-analysis records analysis status and preserves existing reviewer decisions and audit history.
- Governance Insights summarizes recurring terminology flags, finding categories, severity, reference mismatches and recommended policy clarifications.
- The Command Centre, Pending Reviews and Review Studio provide separate entry points for monitoring, queue management and detailed review.

## 10. Technical Architecture

The application uses a React and TypeScript frontend, a FastAPI backend, PostgreSQL persistence and Google Gemini for contextual analysis.

```mermaid
flowchart TB
    U[Reviewer] --> FE[React + TypeScript + Vite]
    FE --> API[FastAPI API]
    API --> RULES[Deterministic Rule Engine]
    API --> AI[Gemini Contextual Analysis]
    API --> DB[(PostgreSQL)]
    API --> INGEST[Document Extraction]
    INGEST --> DB
    RULES --> VALIDATE[Evidence Validation]
    AI --> VALIDATE
    DB --> VALIDATE
    VALIDATE --> FE
    FE --> HUMAN[Human Review and Staged Approval]
    HUMAN --> DB
    DB --> INSIGHTS[Governance Insights]
```

| Component | Responsibility |
|---|---|
| React 19, TypeScript, Vite | Responsive dashboard, knowledge management, content submission and review UI |
| Tailwind CSS and Lucide | Styling, layout and interface icons |
| FastAPI | REST API, validation and application orchestration |
| Deterministic rule engine | Exact terminology, guideline and configured policy checks |
| Google Gemini API | Contextual analysis and suggested corrections |
| Evidence validation | Verify that cited records and quotes match approved knowledge |
| PostgreSQL and SQLAlchemy | Persist documents, knowledge, findings, suggestions, decisions and workflow stages |
| Document extraction | Extract text from PDF, DOCX and TXT and preserve source provenance |

## 11. Local Setup

### Prerequisites
- Node.js and npm
- Python 3.10 or newer
- PostgreSQL
- A Google Gemini API key

### Clone the repository
```bash
git clone https://github.com/adoraeden/brandguard-ai.git
cd brandguard-ai
```

### Configure and run the backend
From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the environment:

**Windows PowerShell**
```powershell
.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `backend/.env` with the following values:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Start the API from the `backend` directory:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend health endpoint is `http://127.0.0.1:8000/health`.

### Configure and run the frontend
Open a second terminal at the repository root:

```bash
npm install
npm run dev:frontend
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). Local development defaults to the backend at `http://127.0.0.1:8000`. Set `VITE_API_BASE_URL` only when using a different backend origin.

### Production build and checks
From the repository root:

```bash
npm run lint
npm run build
```

From the `backend` directory:

```bash
python -m unittest discover -s tests -v
```

Do not commit `.env` files, API keys, database credentials or other secrets.

## 12. Testing and Validation

The repository's GitHub Actions quality workflow runs:
- Backend unit and API tests.
- Frontend TypeScript type-checking.
- Frontend production build.

The suite includes coverage for:
- Document upload and candidate approval/rejection.
- Evidence quote validation and source-page provenance.
- Deterministic terminology-to-catalogue traceability.
- Gemini evidence matching and mismatched citation rejection.
- Analysis reruns, duplicate handling and preservation of reviewer decisions.
- Staged workflow decisions and hand-offs.

The latest recorded quality workflow on the development branch completed successfully for both backend tests and frontend type-check/build. Re-run the workflow against the final submission commit before submitting.

## 13. Demo Access and Limitations

The interface includes selectable demo profiles for demonstrating reviewer and administrator views. These profiles are not real user accounts and do not provide production authentication or access control.

The current Vercel preview is access-controlled by the project's Vercel deployment protection. Before the judges' evaluation, publish an evaluator-accessible URL or configure a public custom domain and verify that the application and backend are reachable without developer-team access.

Other known limitations:
- Image-only scanned PDFs are not OCR-processed.
- Evidence validation checks record identity and textual citation matching; it does not guarantee complete semantic entailment.
- Gemini analysis depends on external API availability.
- Demo reviewer assignments are not production RBAC.
- The platform does not automatically publish reviewed content.
- Visual content analysis and accessibility checks are not currently implemented.

## 14. Roadmap

1. **Production access control:** Add authenticated accounts, organization boundaries and server-enforced reviewer/admin permissions.
2. **Stronger evidence reasoning:** Add semantic entailment checks, richer source matching, uncertainty thresholds and OCR for scanned documents.
3. **Review collaboration:** Add authenticated reviewer invitations, notifications, version comparison and more detailed audit exports.
4. **Governance intelligence:** Add time-based trend comparisons, configurable policy-gap reports and organization-level dashboards.
5. **Operational hardening:** Add rate limiting, observability, backup/restore drills and broader end-to-end browser tests.

## 15. Project Links

- **Source repository:** https://github.com/adoraeden/brandguard-ai
- **Development branch:** `phase-2-round3-improvements`
- **Vercel preview (deployment protection enabled):** https://brandguard-c486opm58-adora10.vercel.app
- **Backend:** https://brandguard-ai-tkr7.onrender.com

