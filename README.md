# BrandGuard AI
### An Intelligent, Evidence-Grounded Brand Governance Platform

**CodeNexus India 2026 · Round 3 Submission**

BrandGuard AI helps teams review marketing and communication content against their own approved brand knowledge before publication. It combines deterministic policy checks, Google Gemini contextual analysis, source-aware evidence validation, document extraction, and human-controlled review workflows.

Rather than producing a single unexplained compliance score, BrandGuard AI presents individual findings, their severity and evidence status, relevant approved sources where available, and editable correction suggestions. Reviewers remain responsible for decisions: the platform does not silently rewrite or automatically publish content.

[**Open the live demo**](https://6af6d89c934044e6d0f0197f--famous-granita-dc4978.netlify.app/) · [**View the source repository**](https://github.com/adoraeden/brandguard-ai)

> **Round 3 improvements delivered**
>
> 1. **Automated Evidence Ingestion and Extraction** — upload PDF, DOCX, and TXT sources, extract candidate facts and guidelines, and require human confirmation before approval.
> 2. **Claim-to-Evidence Traceability** — connect review findings to approved source records and show whether evidence is supported, partial, unsupported, or conflicting.
> 3. **Collaborative Staged Review Workflow** — assign ordered reviewer stages, hand off or return drafts, save audited revisions, resubmit, and export workflow records.

---

## Project information

| Item | Details |
|---|---|
| Hackathon | CodeNexus India 2026 |
| Official team name | `adoraeden07` |
| Project | BrandGuard AI |
| Participant | Adora Sandeep Eden |
| Position | Team Leader · Sole Participant |
| Team size | 1 |
| Contact | adoraeden07@gmail.com |
| Repository | [github.com/adoraeden/brandguard-ai](https://github.com/adoraeden/brandguard-ai) |
| Judge demo | [Open BrandGuard AI](https://6af6d89c934044e6d0f0197f--famous-granita-dc4978.netlify.app/) |

## 1. The problem

Organisations distribute brand knowledge across brand books, campaign briefs, approved product descriptions, terminology lists, legal disclaimers, factsheets, and informal reviewer feedback. When that information is fragmented or outdated, content creators and reviewers can struggle to determine which standard applies and whether a claim is supported.

Common consequences include:

- Inconsistent product names, terminology, tone, and messaging.
- Unsupported, exaggerated, outdated, or contradictory marketing claims.
- Review comments that are difficult to trace to an approved source.
- Repeated manual checking and limited visibility into recurring governance issues.
- Review decisions and revisions that are difficult to track over time.

BrandGuard AI addresses this as a governance and traceability problem, not simply a grammar or copy-editing problem.

## 2. The solution

BrandGuard AI provides a shared brand-knowledge workspace and a pre-publication content-review workflow. Teams can maintain approved guidelines, terminology, facts, and source documents; submit content; inspect rule-based and AI-assisted findings; validate the evidence behind claims; revise the draft; and record human review decisions.

The analysis pipeline combines two complementary methods:

- **Deterministic checks** evaluate configured terminology, restricted phrases, and explicit brand rules.
- **Gemini contextual analysis** evaluates contextual messaging and potential inconsistencies that require language understanding.

The backend validates model output and evidence references before presenting findings. Evidence gaps and uncertain observations are identified rather than represented as proven facts. AI output is advisory: human reviewers retain control of corrections, approvals, exceptions, and rejection.

## 3. Explore the judge demo

The live demo is designed to be explored without a walkthrough or account creation.

### No-password demo entry

1. Open the [live demo](https://6af6d89c934044e6d0f0197f--famous-granita-dc4978.netlify.app/).
2. Choose one of the three demo personas on the entry screen. No password is required.
3. Enter the workspace and follow the persona-specific starting scenario shown on the Command Centre.
4. Use the navigation to explore Brand Intelligence, Evidence Ingestion, Review Studio, Pending Reviews, Decision Archive, and Governance Insights.
5. Switch personas to inspect the reviewer hand-off and collaboration experience.

### Demo personas

| Persona | Demonstration focus |
|---|---|
| **Evelyn Voss** · Admin | Workspace overview, approved brand knowledge, evidence ingestion, and governance insights. |
| **Marcus Chen** · Reviewer | Campaign review, findings, editable suggestions, reviewer assignments, and hand-offs. |
| **Devon Price** · Reviewer | Claim verification, source traceability, compliance findings, and decision history. |

The demo uses fictional AuraCloud sample brand material and a shared demonstration workspace. These selectable identities are for product exploration; they are not separate customer tenants or production-grade authentication and role-based access control. Changes made in the demo may be visible when another demo persona is selected.

### Suggested judge journey

- **Start as Evelyn Voss:** inspect the brand rules and facts, then open Evidence Ingestion to see how an uploaded source becomes reviewable knowledge.
- **Review a sample draft:** open the suggested product-launch scenario and inspect the deterministic and Gemini findings in Review Studio.
- **Trace a claim:** open a finding's evidence details and compare the claim with the approved fact, guideline, or uploaded source. Pay attention to the evidence status and source location.
- **Try reviewer collaboration:** switch to Marcus Chen or Devon Price, open the assigned review stage, and approve it or return it with a note. Switch back to the stage creator to revise and resubmit the same draft.
- **Finish with governance:** inspect the Decision Archive and Governance Insights to see the recorded review outcomes and patterns.

## 4. Main features

### Brand Intelligence

- Centralised management of brand guidelines and communication rules.
- Approved facts and claims used as the reference point for content review.
- Preferred and restricted terminology.
- Knowledge-source records and approved evidence.
- Structured brand knowledge that can be maintained as the brand evolves.

### Automated Evidence Ingestion and Extraction

- Upload supported PDF, DOCX, and TXT files.
- Extract readable text while retaining source provenance, including page or section information where available.
- Identify candidate facts and guidelines from extracted material.
- Review and confirm extracted candidates before they are promoted into the approved knowledge base.
- Retain uploaded documents as source records so later findings can be traced back to the source.
- Allow the same document to be uploaded again as a separate ingestion record; existing records are not silently replaced.

### Hybrid Content Analysis

- Deterministic checks for configured brand rules and terminology.
- Google Gemini contextual analysis using the configured `gemini-3.1-flash-lite` model.
- Detection of terminology violations, contextual inconsistencies, unsupported claims, and direct contradictions.
- Findings that include an explanation, category, severity, evidence status, and suggested correction where appropriate.
- Separate reporting for deterministic analysis and Gemini analysis outcomes.

### Claim-to-Evidence Traceability

- Link findings to relevant approved facts, guidelines, terminology, and uploaded source records when supported.
- Compare claim text with available evidence and retain source references.
- Distinguish **supported**, **partially supported**, **unsupported**, and **conflicting** evidence outcomes.
- Preserve source provenance, including the original document and page or section location where available.
- Withhold invalid or unapproved source references rather than presenting them as verified citations.
- Keep evidence limitations visible to the reviewer; an evidence match is not a guarantee of truth or complete semantic entailment.

### Review Studio

- Inspect individual findings and their supporting evidence.
- Accept, edit, or reject suggested corrections.
- Preserve the submitted and revised content.
- Re-run analysis after revisions.
- Record reviewer decisions and rationale in the review history.
- Distinguish finding-level decisions, applying a correction, collaborative-stage approval, and final document sign-off.
- Support explicit **Approve As-Is** acknowledgement for evidence gaps without changing an unsupported evidence status into a supported one.

### Collaborative Staged Review Workflow

- Create ordered review stages such as Brand & Messaging Review, Legal & Compliance Review, and Final Approval.
- Assign stages to demo reviewers and hand work from one reviewer to the next.
- Let reviewers approve and hand off a stage, return it for changes with a note, or reject the stage.
- Return the existing draft to its creator; the creator can edit and save a revision, re-run analysis, and resubmit it to the original reviewer.
- Keep stage approval separate from final document approval. Final sign-off is blocked until every configured collaborative stage is approved.
- Export the collaborative workflow record as CSV.

### Pending Reviews and Decision Archive

- Display reviews awaiting a human decision and the number of unresolved findings.
- Provide a historical record of completed review outcomes and reviewer sign-off.
- Preserve findings, suggestions, decisions, revisions, and audit history for later inspection.
- Keep completed reviews read-only in the audit view.

### Governance Insights

- Summarise review volume, completion, and pending work.
- Show recurring flagged terms and rules.
- Group findings by category and severity.
- Report recorded evidence-coverage outcomes and finding-level decisions.
- Surface repeated terminology flags, reference mismatches, and guideline clarification recommendations derived from saved reviews.

## 5. Three major Round 3 improvements

The three improvements below are the main Round 3 commitments carried forward from the Round 2 implementation report. They are presented separately from the reliability fixes to existing features described in the next section.

### 5.1 Automated Evidence Ingestion and Extraction

**What was delivered:** users can upload PDF, DOCX, and TXT source documents. The backend extracts readable text, identifies candidate facts and guidelines, and retains source provenance. Extracted candidates remain pending until a human reviews and confirms them; extraction does not automatically make information approved knowledge.

**Why it matters:** teams can bring existing brand documentation into the platform without manually retyping every fact or rule, while retaining human control over what becomes an approved source.

### 5.2 Claim-to-Evidence Traceability

**What was delivered:** review findings can be connected to approved facts, guidelines, terminology, and ingested source documents. Evidence is classified by support status, and the interface can show the relevant source and its location where available. Contradictory, partial, and unsupported claims are not collapsed into a generic pass/fail result.

**Why it matters:** reviewers can understand not only what the system flagged, but also what approved information supports or fails to support the claim.

### 5.3 Collaborative Staged Review Workflow

**What was delivered:** reviews can move through ordered stages assigned to different demo reviewers. Reviewers can approve and hand off, return a draft with a note, or reject a stage. A returned draft goes back to its creator for an audited revision, re-analysis, and resubmission to the assigned reviewer. The workflow record can be exported as CSV, and final document sign-off requires all configured stages to be approved.

**Why it matters:** the product demonstrates a review process involving multiple checkpoints and hand-offs rather than a single isolated approve/reject button.

## 6. Reliability fixes and completion of existing workflows

The following work tightened existing Round 1/Round 2 functionality and closed loose ends found during end-to-end testing. These are reliability and workflow-completion fixes, not additional headline Round 3 commitments.

- **Repeat uploads:** removed the one-upload-only restriction for the same sample or document. Each upload can be represented separately, and existing records are preserved. The database change makes the uploaded-content hash non-unique rather than resetting or deleting existing ingestion data.
- **Terminal Reject behaviour:** a final Reject decision completes the review even when findings or suggestions remain pending. Existing findings, suggestions, and audit records are preserved.
- **Approve As-Is evidence-gap handling:** a reviewer can explicitly acknowledge an evidence gap without the system claiming the missing evidence is verified. Unapplied, ungrounded suggestions attached to that evidence gap are dismissed as part of the acknowledgement; ordinary pending corrections on supported findings remain blocking.
- **Analysis failure states:** the application distinguishes analysis with findings, analysis with no new findings, deterministic analysis completed while Gemini is unavailable or fails, and cases where both analysis methods fail. A failed AI call is not presented as a clean review.
- **Retry and bounded Gemini requests:** transient Gemini failures are handled with bounded retry behaviour and a request timeout; users can see analysis status and retry where appropriate.
- **Re-analysis history:** running analysis again does not erase prior reviewer decisions or audit history. Existing findings are refreshed or deduplicated where appropriate.
- **Workflow revision safeguards:** only the creator of a returned stage can save the returned draft revision and resubmit it; final approval remains blocked until all collaborative stages are approved.
- **Evidence status accuracy:** exact deterministic matches can be recognised as supported by an approved rule, while contextual or incomplete references retain partial or uncertain status instead of being overstated.

## 7. End-to-end workflow

```mermaid
flowchart TD
    A[Upload PDF, DOCX or TXT brand source] --> B[Extract text and source locations]
    B --> C[Identify candidate facts and guidelines]
    C --> D[Human reviews and approves candidates]
    D --> E[Approved Brand Knowledge Base]
    E --> F[Submit content for review]
    F --> G[Deterministic Rule Engine]
    F --> H[Gemini Contextual Analysis]
    G --> I[Evidence Validation and Traceability]
    H --> I
    I --> J[Findings, Evidence Status and Suggestions]
    J --> K[Review Studio]
    K --> L[Collaborative Review Stages]
    L --> M{Reviewer action}
    M -->|Approve and hand off| L
    M -->|Return for changes| N[Creator edits the same draft]
    N --> O[Save revision and re-run analysis]
    O --> L
    M -->|All stages approved| P[Final human decision]
    P --> Q[Decision Archive and Audit History]
    Q --> R[Governance Insights]
```

## 8. Technical architecture

BrandGuard AI separates the React user interface, FastAPI application layer, deterministic rule engine, Gemini analysis, document extraction, and PostgreSQL persistence.

```mermaid
flowchart TB
    U[Judge or Team User] --> FE[React 19 + TypeScript + Vite]
    FE --> API[FastAPI REST API]
    API --> RULES[Python Deterministic Rule Engine]
    API --> GEMINI[Google Gemini API\ngemini-3.1-flash-lite]
    API --> INGEST[Document Extraction\nPDF / DOCX / TXT]
    API <--> DB[(PostgreSQL)]
    RULES --> API
    GEMINI --> API
    INGEST --> API
    API --> FE
```

### Architecture responsibilities

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 19, TypeScript, Vite | Demo entry, brand knowledge screens, content submission, findings, reviewer actions, archive, and insights. |
| Styling and UI | Tailwind CSS, Lucide React | Responsive application layout, controls, icons, and status presentation. |
| Backend/API | Python, FastAPI | REST endpoints, input validation, workflow orchestration, analysis status, and review lifecycle. |
| Deterministic review | Python rule engine | Exact terminology, restricted phrase, and configured brand-rule checks. |
| Contextual analysis | Google Gemini API (`gemini-3.1-flash-lite`) | Context-aware content analysis and suggested improvements. |
| Evidence ingestion | `pypdf`, `python-docx`, Python text handling | Extract supported files and preserve page/section provenance for evidence candidates. |
| Persistence | PostgreSQL, SQLAlchemy, psycopg2 | Brand knowledge, ingested documents, reviews, findings, suggestions, stages, decisions, and audit records. |
| Deployment | Netlify demo frontend, Render API/database | Public judge demo and hosted FastAPI/PostgreSQL services. Vercel configuration is also retained in the repository. |
| CI | GitHub Actions | Backend tests, frontend TypeScript checking, and production build verification. |

### Main backend modules

- `backend/main.py` — FastAPI application, CORS configuration, database lifecycle, health check, and router registration.
- `backend/database.py` and `backend/models.py` — database connection, persistence models, and schema setup.
- `backend/rule_engine.py` — deterministic brand checks.
- `backend/gemini_analyzer.py` — Gemini request handling, contextual analysis, evidence validation, timeouts, and retry logic.
- `backend/document_ingestion.py` — supported-file validation, extraction, and candidate evidence identification.
- `backend/routers/documents.py` — evidence/document ingestion endpoints.
- `backend/routers/reviews.py` — content review, finding actions, final decisions, and collaborative workflow endpoints.
- `backend/routers/insights.py` — governance analytics derived from stored review data.
- `backend/routers/archive.py`, `facts.py`, `guidelines.py`, `sources.py`, and `terminology.py` — archive and brand-knowledge API routes.

## 9. Technology stack

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Build/dev server | Vite |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Backend | Python 3.12, FastAPI |
| Database | PostgreSQL |
| ORM and driver | SQLAlchemy, psycopg2-binary |
| AI | Google Gemini API, `gemini-3.1-flash-lite` |
| Document processing | pypdf, python-docx, python-multipart |
| HTTP server | Uvicorn |
| Frontend hosting | Netlify for the tested judge-demo deployment; Vercel configuration is retained |
| Backend and database hosting | Render |
| Source control and CI | GitHub, GitHub Actions |

## 10. Testing and validation

The repository includes a Python `unittest` suite and GitHub Actions quality checks. The current backend test directory contains **86 test methods across 14 test files**. The latest PR quality workflow for the merged Round 3 implementation completed successfully.

### Backend test coverage

- CORS and API configuration.
- PDF, DOCX, and TXT extraction and invalid/empty document handling.
- Evidence candidate extraction, approval, rejection, and source provenance.
- Repeat document uploads and independent ingestion records.
- Claim-to-evidence classification, including supported, partial, unsupported, and conflicting cases.
- Gemini configuration, response validation, error states, timeout/retry behaviour, and evidence safeguards.
- Re-analysis, finding refresh/deduplication, and preservation of previous decisions.
- Final approval, Approve As-Is evidence-gap acknowledgement, terminal Reject behaviour, and correction safeguards.
- Collaborative stage assignment, return-for-changes, creator-only revision, resubmission, and final-stage approval requirements.
- Governance insights and suggestion decision audit attribution.

### Frontend and CI checks

- TypeScript check using `npm run lint` (`tsc --noEmit`).
- Vite production build using `npm run build`.
- GitHub Actions runs the backend suite against PostgreSQL and performs frontend type-checking and build validation.

[View the successful GitHub Actions quality run](https://github.com/adoraeden/brandguard-ai/actions/runs/43406768882).

### Local test commands

Run these from the repository root unless a different working directory is shown:

```powershell
# Frontend type-check and production build
npm run lint
npm run build

# Backend test suite
cd backend
python -m unittest discover -s tests -v
```

## 11. Screenshots

The following gallery shows the current Round 3 application screens. All images are stored in `docs/screenshots/` in the source repository.

### Command Centre

The Command Centre gives the selected demo persona an overview of governance activity and a suggested next step.

![Command Centre overview](docs/screenshots/command-centre-overview.png)

![Command Centre guided journey](docs/screenshots/command-centre-guided-journey.png)

### Pending Reviews

The pending queue shows reviews awaiting human evaluation, reviewer assignments, review status, and unresolved finding counts.

![Pending Reviews](docs/screenshots/pending-reviews.png)

### Review Studio

The Review Studio is where reviewers inspect findings and evidence, act on correction suggestions, and record review decisions.

![Review Studio](docs/screenshots/review-studio.png)

### Evidence Ingestion

Evidence Ingestion accepts PDF, DOCX, and TXT source material. The extraction workflow identifies candidate facts and guidelines while retaining source provenance for human confirmation.

![Evidence Ingestion — upload and source list](docs/screenshots/evidence-ingestion-upload.png)

![Evidence Ingestion — extracted evidence candidates](docs/screenshots/evidence-ingestion-candidates.png)

### Brand Intelligence

Brand Intelligence is the workspace for approved guidelines, terminology, facts, and knowledge sources used during content evaluation.

![Brand Intelligence](docs/screenshots/brand-intelligence.png)

### Decision Ledger / Decision Archive

The Decision Ledger preserves completed review outcomes, reviewer sign-off, findings, and audit history.

![Decision Ledger](docs/screenshots/decision-ledger.png)

### Governance Insights

Governance Insights summarises review activity, evidence quality, recorded finding decisions, recurring terms, finding categories, and guideline clarification opportunities.

![Governance Insights — overview](docs/screenshots/governance-insights-overview.png)

![Governance Insights — trends and recurring issues](docs/screenshots/governance-insights-trends.png)

**Gallery:** 10 screenshots across 7 application areas — Command Centre (2), Pending Reviews (1), Review Studio (1), Evidence Ingestion (2), Brand Intelligence (1), Decision Ledger (1), and Governance Insights (2).


## 12. Setup and installation

### Prerequisites

- Git.
- Node.js 22 or a compatible current Node.js release, with npm.
- Python 3.12.
- PostgreSQL (local instance or a hosted PostgreSQL connection string).
- A Google Gemini API key for contextual AI analysis.

### 12.1 Clone the repository

```powershell
git clone https://github.com/adoraeden/brandguard-ai.git
cd brandguard-ai
```

### 12.2 Configure and start the backend

Create and activate a Python virtual environment:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
pip install -r requirements.txt
```

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Open `backend/.env` and set the values for your environment:

```env
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DATABASE
GEMINI_API_KEY=your_gemini_api_key
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000
```

Make sure the PostgreSQL database exists and is reachable. The FastAPI application initialises its tables and inserts demonstration brand records when the relevant tables are empty.

Start the backend from the `backend` directory:

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The local API health endpoint is `http://127.0.0.1:8000/health`.

### 12.3 Configure and start the frontend

Open a second terminal at the repository root:

```powershell
cd ..
npm ci
npm run dev:frontend
```

Vite serves the frontend at `http://localhost:5173` by default. During local development, the frontend API client defaults to `http://127.0.0.1:8000`, so keep the FastAPI backend running in the other terminal.

> **Important:** use `npm run dev:frontend` for the React/Vite frontend in this FastAPI-backed application. The separate `npm run dev` script starts the repository's TypeScript Express server and is not the documented local setup for the current PostgreSQL/FastAPI application.

### 12.4 Optional frontend API configuration

For an environment where the API is hosted separately, set `VITE_API_BASE_URL` to the FastAPI base URL before building the frontend. Leave it unset for local development to use the documented default API address.

### 12.5 Environment variable summary

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string used by FastAPI/SQLAlchemy. |
| `GEMINI_API_KEY` | For AI analysis | Server-side credential for Google Gemini. Deterministic checks can be reported separately when Gemini is unavailable. |
| `CORS_ORIGINS` | Recommended | Comma-separated browser origins allowed to call the API. Include the local Vite origin during development. |
| `VITE_API_BASE_URL` | Optional | Frontend API base URL when the FastAPI service is hosted on a different origin. |

**Security:** keep `.env` files, Gemini API keys, database credentials, and other secrets out of Git. Do not expose the Gemini key in frontend code. Use `.env.example` only as a template, never as a place for real credentials.

## 13. Limitations and responsible use

BrandGuard AI is a functional hackathon prototype, not a production-certified governance, legal, or compliance system.

- **Demo identity is not production authentication:** the persona selector does not provide secure account authentication, true organisation-level tenant separation, or production-grade role-based access control. The personas operate in one shared fictional demo workspace.
- **Evidence is bounded by the knowledge base:** evidence validation evaluates supplied approved records and source matches. It cannot guarantee complete semantic entailment or establish the truth of every external claim.
- **AI can be wrong:** Gemini may produce incomplete or incorrect suggestions. Its output is validated and remains advisory; human review is required.
- **External service dependency:** contextual analysis depends on Google Gemini availability, API limits, network access, and valid server-side configuration.
- **Document extraction boundaries:** PDF, DOCX, and TXT are supported. Password-protected PDFs, damaged or empty files, and scanned image-only PDFs that require OCR are not supported by the current extraction path.
- **No automatic publication:** reviewed content is not automatically posted to a website, social platform, or content-management system.
- **No visual or accessibility analysis:** image/logo checks and full accessibility auditing remain future work.
- **Demo data is fictional:** the included AuraCloud content is sample material for demonstrating the review workflow and must not be interpreted as real customer or product information.
- **Sensitive information:** do not upload confidential organisational material to the public demo. When Gemini analysis is enabled, relevant review content and context are sent to Google's Gemini API; review the organisation's data-handling requirements before using real confidential content.

An analysis that returns no findings is not a guarantee that content is completely safe, factual, legally compliant, or fully aligned with every brand requirement.

## 14. Roadmap

Potential next steps beyond the current hackathon prototype include:

1. **Stronger semantic evidence reasoning:** improve claim decomposition, source entailment checks, confidence calibration, uncertainty explanations, and false-positive reduction.
2. **Production authentication and workspace isolation:** implement secure accounts, server-enforced roles, organisation-level tenancy, and auditable access controls.
3. **Richer source lifecycle management:** add source versioning, expiry/review dates, superseded-source handling, and approval history.
4. **Broader document support:** explore OCR for scanned PDFs and additional structured document formats with clear extraction-quality reporting.
5. **Visual and accessibility review:** evaluate logos, approved colours, layouts, image guidance, alternative text, and readability.
6. **Workflow integrations:** connect review decisions to content-management, campaign, and publishing tools without removing human approval.
7. **Expanded governance analytics:** support configurable reporting, time-based comparisons, and organisation-specific governance metrics.

## 15. Project links and submission materials

- **Live judge demo:** [BrandGuard AI — Netlify demo](https://6af6d89c934044e6d0f0197f--famous-granita-dc4978.netlify.app/)
- **Source repository:** [adoraeden/brandguard-ai](https://github.com/adoraeden/brandguard-ai)
- **Merged Round 3 implementation PR:** [Pull request #3](https://github.com/adoraeden/brandguard-ai/pull/3)
- **Quality workflow:** [GitHub Actions run #147 — successful](https://github.com/adoraeden/brandguard-ai/actions/runs/43406768882)
- **Final Round 3 project PDF:** add the final exported PDF to the repository and link it here before submission.

## 16. Individual contribution

BrandGuard AI is an individual project submitted under the official team name `adoraeden07`. Adora Sandeep Eden is the sole participant and team leader, responsible for the project from proposal to implementation: problem framing, product planning, interface design, architecture, frontend and backend development, Gemini integration, database design, evidence ingestion, workflow implementation, testing, deployment, documentation, and demonstration.

---

*BrandGuard AI — Making brand reviews more traceable, explainable, and human-controlled.*
