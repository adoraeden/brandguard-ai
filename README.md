# BrandGuard AI — Brand Governance & Content Review Platform

BrandGuard AI helps enterprise organizations ensure that their public marketing, product communications, and external copy stay strictly consistent with approved brand guidelines, terminology standards, audited technical facts, and messaging policies before publication.

---

## 1. System Architecture

```
[ Marketing Draft Submission ]
              │
              ▼
┌────────────────────────────────────────────────────────┐
│             HYBRID REVIEW WORKSPACE ENGINE             │
│                                                        │
│  1. Deterministic Rule Engine (Exact Matching)         │
│     - Restricted terminology catalogue                 │
│     - Prohibited phrase checks                         │
│     - Known contradictory claims vs factsheets         │
│                                                        │
│  2. Gemini 3.8 Flash Engine (Contextual Reasoning)     │
│     - Tone of voice and hyperbolic rhetoric audit      │
│     - Ethical AI & worker augmentation boundaries      │
│     - Intent-preserving suggestion generation          │
│     - Traceable evidence & source grounding            │
└───────────────────────────────────┬────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────┐
│             HUMAN GOVERNANCE WORKSPACE                 │
│  - Inspect matched exact text and policy citation      │
│  - Accept, edit custom, or reject suggestions          │
│  - Reviewer decision sign-off and audit ledger         │
└────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Visual Design**: **Spatial Intelligence — Light-Mode Intelligence Workspace**
  - Sophisticated light palette: Cool white (`#F8FAFC`, `#F9FBFE`), soft grey (`#F1F5F9`), Cobalt & Electric Blue primary identity (`#1D4ED8`, `#2563EB`), Teal secondary data accent (`#0D9488`), and restrained Coral/Amber warnings.
  - Spatial Information Architecture: Radial Governance Integrity gauge, interactive inline pins (`[P-1]`, `[P-2]`) linking text to evidence cards, category domain filters, and chronological audit ledger.
  - Layered surfaces, ambient micro-grid background, frosted glass headers, and zero repetitive generic metric cards.

---

## 3. Four Core Experience Modules

1. **Overview (Governance Command Centre)**: Real-time governance health, stored rules & terminology counts, active review pipeline, recurring violation trends, and 1-click test scenarios for AuraCloud Technologies.
2. **Review Studio**: Split-view interactive review workspace. Flagged text spans, detailed category classification, source citations, intent-preserving suggestions, inline editing, and human sign-off.
3. **Brand Intelligence**: CRUD central management for Brand Guidelines, Terminology Catalogue, Audited Technical Factsheets, and Primary Knowledge Sources.
4. **Decision Archive**: Filterable historical ledger of all reviews with full audit trail of human reviewer decisions and notes.
5. **Governance Insights**: Data-driven recommendations to clarify and update brand guidelines based on recurring author mistakes.

---

## 4. Local Run Instructions

### FastAPI + React Development

Configure `backend/.env` with `DATABASE_URL` using the `postgresql+psycopg2://` scheme and, optionally, `GEMINI_API_KEY`. The API loads this file before building the SQLAlchemy engine. The FastAPI backend must be running for the React UI to load or save data.

PowerShell (from the repository root):
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal, from the repository root:

```bash
npm install
npm run dev
# Opens http://localhost:3000. API requests go to http://127.0.0.1:8000.
```

For a direct Vite development server, run `npm run dev:frontend` and use `http://localhost:5173`; configure `VITE_API_BASE_URL` at build time when the FastAPI origin is remote. The `server.ts` Express server remains in the repository for existing workflows, but the React API client now targets FastAPI.

---

## 5. Demonstration Workspace

The platform is pre-loaded with realistic, coherent demonstration data for **AuraCloud Technologies** (an enterprise intelligent workflow and cloud governance provider).
- Official Product Name: `AuraCloud Workspace` (Restricted: `Aura Cloud App`)
- Ethical AI: Positioned as an intelligent workflow platform augmenting human teams, not "fully autonomous employee replacement".
- Uptime SLA: Contractually audited `99.95%` (Prohibited: `100% zero downtime`).
- Security: `SOC-2 Type II certified and AES-256 encrypted` (Prohibited: `military-grade unhackable shield`).
