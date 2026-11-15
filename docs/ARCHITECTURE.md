# OpsSaathi AI: System Architecture

## 1. High-Level Architecture Diagram

```
                 +--------------------------------------------+
                 |       MERCHANT / SUPPORT / SUPERVISOR       |
                 +--------------------------------------------+
                                       |
                   Browser (Chat / Voice / Support Console)
                                       |
                 +--------------------------------------------+
                 |            React 18 + Vite + TS            |
                 |     Tailwind CSS + shadcn/ui + Lucide      |
                 |  Web Speech API (STT/TTS) & Audio Capture  |
                 +--------------------------------------------+
                                       | HTTPS REST
                 +--------------------------------------------+
                 |              FastAPI Gateway               |
                 |  JWT Auth | Tenant Isolation | RBAC Guard  |
                 |  Rate Limiting | Correlation ID Middleware |
                 +--------------------------------------------+
                                       |
             +-------------------------+-------------------------+
             |                                                   |
+--------------------------+                         +--------------------------+
|  LangGraph Agent Runtime |                         |     Domain Services      |
|  - Intake / Clarify      |                         |  - Decimal Reconciler    |
|  - Intent Classification | <---------------------> |  - Policy Guard Engine   |
|  - Typed Tool Invocation |                         |  - Case Lifecycle Engine |
|  - Checkpoint & Resume   |                         |  - Verifier Service      |
+--------------------------+                         +--------------------------+
             |                                                   |
             +-------------------------+-------------------------+
                                       |
                 +--------------------------------------------+
                 |            PostgreSQL Database             |
                 |  16 Core Tables with UUIDs & UTC Timestamps|
                 |  Append-only Audit Trail & Case Timelines  |
                 +--------------------------------------------+
                                       |
             +-------------------------+-------------------------+
             |                                                   |
+--------------------------+                         +--------------------------+
|   Integration Adapters   |                         |    Background Workers    |
|  - Paytm Staging/Webhook |                         |  - Follow-up Scheduler   |
|  - Gemini API (LLM)      |                         |  - Webhook Consumer      |
|  - Sarvam STT/TTS API    |                         |  - Health Prober         |
|  - Synthetic Demo Ledger |                         |                          |
+--------------------------+                         +--------------------------+
```

## 2. Core Components and Responsibilities

### 2.1 Web Application (`apps/web`)
- **Merchant Experience:** Live dashboard showing active balance, settled funds, pending transactions, and direct entry into OpsSaathi Chat/Voice.
- **Voice Workspace:** Seamless bidirectional speech interaction using browser Web Speech API with fallback to Sarvam AI or typed inputs. Real-time audio waveform, transcript preview, and audio status.
- **Operations Console:** Support agent & supervisor queue with live case filter, timeline inspector, evidence viewer, and single-click approval/rejection modal.
- **Evidence Panel:** Color-coded provenance tags (`SYNTHETIC_DEMO`, `PAYTM_STAGING`) guaranteeing total transparency.

### 2.2 FastAPI API Layer (`services/api/app/api`)
- Enforces strict tenant scoping based on decoded JWT claims.
- Validates request payloads with Pydantic v2 schemas.
- Exposes RESTful endpoints for authentication, transactions, settlements, agent chat/voice, cases, approvals, and Paytm webhook callbacks.

### 2.3 Domain Services (`services/api/app/domain`)
- **Reconciliation Engine:** Pure Python service utilizing `decimal.Decimal` to calculate `expected_net`, `observed_settlement`, and `discrepancy`.
- **Policy Engine:** Evaluates operational actions (`READ_TRANSACTION`, `CALCULATE_DISCREPANCY`, `CREATE_SUPPORT_CASE`, `INITIATE_REFUND`, `RESOLVE_CASE`) returning `ALLOW`, `DENY`, or `REQUIRE_HUMAN_APPROVAL`.
- **Case Lifecycle & Verifier:** Enforces state transitions (`NEW` -> `TRIAGED` -> `INVESTIGATING` -> `ACTION_REQUIRED` / `AWAITING_APPROVAL` -> `IN_PROGRESS` -> `VERIFYING` -> `RESOLVED`). Prevents premature closure without explicit verification pass.

### 2.4 Agent Runtime (`services/api/app/agents`)
- Stateful LangGraph graph orchestrating nodes: `authenticate_session` -> `collect_issue` -> `classify_issue` -> `load_merchant_context` -> `investigate_payment` -> `retrieve_settlement_entries` -> `reconcile_deterministically` -> `prepare_evidence` -> `evaluate_policy` -> `execute_permitted_action` -> `verify_action` -> `update_case_timeline` -> `communicate`.
- Persistence via PostgreSQL checkpointer.

### 2.5 External Integrations & Fallbacks
- **Paytm Adapter:** Implements transaction status check and webhook signature validation. Official docs specify Settlement API is production-only; therefore, `SYNTHETIC_DEMO` is clearly surfaced in staging/demo modes.
- **Gemini Adapter:** Structured output using Google Generative AI with zero-shot deterministic fallback if quota or offline.
- **Sarvam Adapter:** Speech-to-text and text-to-speech adapter for Indian languages and English.
