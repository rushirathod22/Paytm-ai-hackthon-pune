# OpsSaathi AI: PRD Reference & Requirement Traceability Matrix

**Product:** OpsSaathi AI  
**Tagline:** Don't just respond. Investigate. Act. Verify.  
**Team:** Two Bits  
**Event:** Paytm Build for India AI Hackathon – Pune Finale  
**Date:** 15 November 2026 | Partex.AI, Hinjawadi, Pune  
**Version:** 1.0  

---

## 1. Executive Summary & MVP Focus
OpsSaathi AI is an autonomous merchant operations teammate for payment platforms. Instead of acting as a generic conversational chatbot that merely dispenses advice, it connects to backend systems, runs deterministic financial reconciliations, evaluates security/risk policies, creates trackable support cases, pauses for human approval on sensitive actions, coordinates via synchronized chat and browser voice, and verifies state changes before marking issues resolved.

### Golden Scenario
A merchant identifies that a successful customer payment of ₹6,000 (out of ₹15,000 total captured transactions) is missing from their daily settlement batch (where only ₹9,000 has settled). OpsSaathi investigates, explains the synthetic demo ledger status with complete provenance, creates an idempotent case assigned to Settlement Operations, requires human supervisor approval for financial remediations, updates the ledger, and runs an independent verification check to prove resolution.

---

## 2. Requirement Traceability Matrix

| ID | Requirement Description | Implementation Component | Status | Acceptance Verification |
|---|---|---|---|---|
| **FR-01** | **Identity & Tenant Scope**: Authenticated demo merchant. Queries scoped server-side. | `services/api/app/core/auth.py`, DB filters | IMPLEMENTED | Verified user context; IDOR prevention test |
| **FR-02** | **Issue Intake**: Chat/voice complaint parsing. Extract amount, ref, date. Never fabricate facts. | `services/api/app/agents/nodes.py`, LangGraph supervisor | IMPLEMENTED | Missing details prompt clarification |
| **FR-03** | **Intent Routing**: Classify into PAYMENT_STATUS, SETTLEMENT_MISMATCH, REFUND_STATUS, QR_DEVICE, OTHER. | `services/api/app/agents/nodes.py` | IMPLEMENTED | Intent routing unit test |
| **FR-04** | **Transaction Lookup**: Read records via tenant-scoped backend tools only. | `services/api/app/tools/transaction_tools.py` | IMPLEMENTED | Query returns scoped DB transactions |
| **FR-05** | **Reconciliation**: Python `Decimal` domain logic: `expected_net - observed`. | `services/api/app/domain/reconciliation.py` | IMPLEMENTED | Exact math test (no float imprecision) |
| **FR-06** | **Evidence Summary**: Display records checked, status, calculation, data sources. | `services/api/app/agents/nodes.py`, UI Evidence Card | IMPLEMENTED | Evidence payload has source provenance |
| **FR-07** | **Policy Evaluation**: ALLOW, DENY, REQUIRE_HUMAN_APPROVAL with reason codes. | `services/api/app/domain/policy.py` | IMPLEMENTED | Policy tests for sensitive actions |
| **FR-08** | **Case Creation**: Idempotent case creation with category, queue, priority, audit refs. | `services/api/app/domain/case_service.py` | IMPLEMENTED | Duplicate request returns existing case |
| **FR-09** | **Human Approval**: Support role approves/rejects with audit trail; backend re-evaluates. | `services/api/app/api/v1/cases.py`, `approvals` table | IMPLEMENTED | 403 on merchant trying to approve |
| **FR-10** | **Case Timeline**: Chronological events, actions, approvals, messages. Hide internal notes. | `case_events` table, `api/v1/cases.py` | IMPLEMENTED | Merchant vs Support visibility check |
| **FR-11** | **Voice Session**: Web Speech API / Sarvam STT/TTS with shared state and audio controls. | `apps/web/src/components/VoiceSession.tsx` | IMPLEMENTED | Real-time speech transcription & speak |
| **FR-12** | **Shared Context**: Voice resumes same conversation and active case as chat. | `conversations` table, shared `conversation_id` | IMPLEMENTED | Chat and voice seamlessly switch context |
| **FR-13** | **Follow-up**: Persisted follow-up timestamp and background worker polling. | `services/api/app/workers/followup_worker.py` | IMPLEMENTED | Scheduled follow-up triggers notification |
| **FR-14** | **Verification**: Fresh DB read; only explicit passing criteria permit `RESOLVED`. | `services/api/app/domain/verification.py` | IMPLEMENTED | Case cannot close prematurely |
| **FR-15** | **Audit**: Log actor, timestamp, correlation ID, action, outcome for all events. | `audit_events`, `case_events` | IMPLEMENTED | Immutable audit entries generated |
| **FR-16** | **Failure Handling**: Graceful degradation, timeout reporting, text fallback for voice. | Provider adapters with mock/deterministic fallback | IMPLEMENTED | Unplugging API keys still runs local mock |

---

## 3. Product Rules & Invariants
1. **Financial Precision:** Floating-point arithmetic is strictly prohibited in financial paths. All currency calculations use `Decimal(12, 2)`.
2. **Provenance Disclosure:** Records are explicitly labeled `PAYTM_STAGING`, `SYNTHETIC_DEMO`, or `PAYTM_PRODUCTION`.
3. **No Premature Resolution:** An agent or user cannot transition a case to `RESOLVED` without a verified `PASS` check from `verify_resolution`.
4. **Security Boundary:** LLMs cannot execute raw SQL, authorize payouts, bypass tenant scopes, or request merchant banking credentials/PINs.
