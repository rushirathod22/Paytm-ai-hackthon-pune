# OpsSaathi AI: Autonomous Merchant Operations Teammate

> **Paytm Build for India AI Hackathon – Pune Finale**  
> **Team Two Bits** | 15 November 2026  
> *Don't just respond. Investigate. Act. Verify.*

---

## 🚀 Overview

OpsSaathi AI is an enterprise-grade autonomous operations teammate engineered for merchant payment and settlement operations. When a merchant notices a discrepancy between captured payments and their bank settlement batch, OpsSaathi AI:
1. **Intakes issues** via synchronized Text Chat and In-Browser Speech (STT/TTS).
2. **Retrieves authorized transaction records** using tenant-scoped backend tools.
3. **Calculates discrepancies deterministically** using Python `Decimal` logic—never delegating arithmetic to LLM guesswork.
4. **Enforces policy gates**, halting sensitive financial remediation pending human supervisor sign-off.
5. **Creates and tracks idempotent support cases** with chronological audit timelines.
6. **Performs independent verification** against fresh ledger reads before transitioning tickets to `RESOLVED`.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Web Speech API.
- **Backend:** FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), Alembic.
- **Database:** PostgreSQL 16 (production/Docker) & SQLite (zero-dependency local test run).
- **AI Agent:** Google Gemini API (`gemini-2.5-flash`), Typed Allowlisted Tools, Deterministic Mock Fallback.
- **Voice Engine:** In-Browser Web Speech API + Sarvam AI STT/TTS adapter.
- **Payment Adapters:** Paytm Payments Staging & Checksum Validator + Synthetic Settlement Ledger (`SYNTHETIC_DEMO`).

---

## 🏁 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Docker & Docker Compose (optional for local containerized deployment)

### 2. Backend Setup
```bash
# In workspace root:
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r services/api/requirements.txt
```

### 3. Frontend Setup
```bash
cd apps/web
npm install
npm run dev
```

### 4. Running Backend
```bash
# Run FastAPI server
uvicorn services.api.app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🧪 Running Automated Tests
```bash
pytest services/api/app/tests -v
```

---

## 📑 Core Documentation
- [PRD Reference & Requirements Matrix](docs/PRD_REFERENCE.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [API Contracts](docs/API_CONTRACTS.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Integration Status](docs/INTEGRATION_STATUS.md)
- [Test Plan](docs/TEST_PLAN.md)
- [Demo Runbook](docs/DEMO_RUNBOOK.md)
