# OpsSaathi AI: API Contracts & Specifications

All API routes follow the standard JSON response envelope:
```json
{
  "ok": true,
  "data": {},
  "meta": {
    "request_id": "c1f7b029-...",
    "source_type": "SYNTHETIC_DEMO",
    "timestamp": "2026-11-15T10:00:00Z"
  },
  "error": null
}
```

Standard Error Envelope:
```json
{
  "ok": false,
  "data": null,
  "meta": {
    "request_id": "c1f7b029-...",
    "timestamp": "2026-11-15T10:00:00Z"
  },
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | FORBIDDEN | APPROVAL_REQUIRED | PROVIDER_UNAVAILABLE | RATE_LIMITED | CONFLICT",
    "message": "Human readable error detail",
    "details": {}
  }
}
```

---

## Endpoint Definitions

### Authentication & Tenant Context
- `POST /api/v1/auth/demo-login`
  - Body: `{"role": "MERCHANT" | "SUPPORT_AGENT" | "SUPERVISOR", "merchant_id": "optional-uuid"}`
  - Response: `{"access_token": "jwt...", "token_type": "bearer", "user": {...}}`
- `GET /api/v1/me`
  - Response: Active user profile, roles, and accessible merchant tenants.
- `GET /api/v1/merchants/{id}`
  - Returns tenant details, masked phone, external MID, settlement configuration.

### Transactions & Settlements
- `GET /api/v1/transactions`
  - Query params: `date_from`, `date_to`, `order_id`, `status`, `limit`, `offset`.
  - Scoped strictly to authenticated merchant.
- `GET /api/v1/transactions/{id}`
  - Detailed transaction receipt with payment provider references.
- `GET /api/v1/settlements`
  - Query params: `batch_id`, `date`.
  - Returns settlement batch summary and breakdown entries with `source_type`.

### Agent Chat & Voice Interaction
- `POST /api/v1/agent/messages`
  - Body: `{"conversation_id": "optional-uuid", "message": "My ₹6,000 payment is missing from settlement", "channel": "chat" | "voice"}`
  - Response: Agent message, intent, extracted entities, investigation evidence, actions executed, case reference.
- `POST /api/v1/voice/sessions`
  - Body: `{"conversation_id": "optional-uuid"}`
  - Initiates or resumes browser/telephony voice session; returns session ID and authorization tokens.
- `POST /api/v1/voice/transcriptions`
  - Body: `{"session_id": "uuid", "audio_transcript": "string", "conversation_id": "uuid"}`
  - Feeds speech transcription into the shared agent brain; returns text response and synthesized speech payload.

### Case Management & Human-In-The-Loop
- `GET /api/v1/cases`
  - Query params: `status`, `priority`, `queue`.
  - Returns tenant-scoped cases for merchants, or queue-wide cases for support agents.
- `POST /api/v1/cases`
  - Header: `Idempotency-Key: uuid`
  - Body: `{"category": "SETTLEMENT_MISMATCH", "priority": "HIGH", "summary": "...", "evidence": {...}}`
- `GET /api/v1/cases/{id}`
  - Detailed case record, current state, assigned queue, SLA deadlines, and audit timeline.
- `POST /api/v1/cases/{id}/approve`
  - Role requirement: `SUPPORT_AGENT` or `SUPERVISOR`.
  - Body: `{"action": "APPROVE_REMEDIATION", "notes": "Approved synthetic settlement payout"}`
- `POST /api/v1/cases/{id}/reject`
  - Body: `{"reason": "Explanation for rejection"}`
- `POST /api/v1/cases/{id}/assign`
  - Body: `{"queue": "SETTLEMENT_OPS" | "MERCHANT_HELPDESK" | "DISPUTES"}`
- `POST /api/v1/cases/{id}/verify`
  - Executes deterministic fresh DB read.
  - Returns `{"passed": true, "verification_time": "...", "status": "RESOLVED" | "IN_PROGRESS"}`.

### Paytm Webhooks & System Health
- `POST /api/v1/webhooks/paytm`
  - Header: `X-Paytm-Signature: ...`
  - Validates checksum, records webhook event, prevents replay attacks.
- `GET /api/v1/health`
  - Returns readiness/liveness of Database, Gemini LLM, Paytm Adapter, and Sarvam Voice.
