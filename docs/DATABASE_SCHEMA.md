# OpsSaathi AI: Database Schema

PostgreSQL Relational Schema with 16 core entities.
All timestamps are UTC (`TIMESTAMP WITH TIME ZONE`).
All monetary values use `NUMERIC(12, 2)` to eliminate floating-point rounding errors.

---

## 1. Entities Diagram & Tables

### 1. `users`
- `id`: UUID (PK)
- `email`: VARCHAR(255) UNIQUE NOT NULL
- `name`: VARCHAR(255) NOT NULL
- `role`: VARCHAR(50) NOT NULL (`MERCHANT`, `SUPPORT_AGENT`, `SUPERVISOR`)
- `is_active`: BOOLEAN DEFAULT TRUE
- `created_at`: TIMESTAMPTZ NOT NULL
- `updated_at`: TIMESTAMPTZ NOT NULL

### 2. `merchants`
- `id`: UUID (PK)
- `external_mid`: VARCHAR(100) UNIQUE NULL (Paytm Staging MID)
- `display_name`: VARCHAR(255) NOT NULL
- `masked_phone`: VARCHAR(30) NOT NULL
- `status`: VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
- `created_at`: TIMESTAMPTZ NOT NULL
- `updated_at`: TIMESTAMPTZ NOT NULL

### 3. `merchant_users`
- `id`: UUID (PK)
- `user_id`: UUID (FK -> users.id)
- `merchant_id`: UUID (FK -> merchants.id)
- `role`: VARCHAR(50) NOT NULL
- `created_at`: TIMESTAMPTZ NOT NULL

### 4. `transactions`
- `id`: UUID (PK)
- `merchant_id`: UUID (FK -> merchants.id)
- `provider`: VARCHAR(50) NOT NULL (`PAYTM`, `MOCK`)
- `provider_txn_id`: VARCHAR(100) NOT NULL
- `order_id`: VARCHAR(100) NOT NULL
- `amount`: NUMERIC(12, 2) NOT NULL
- `currency`: VARCHAR(10) NOT NULL DEFAULT 'INR'
- `status`: VARCHAR(50) NOT NULL (`SUCCESS`, `PENDING`, `FAILED`)
- `fee`: NUMERIC(12, 2) DEFAULT 0.00
- `tax`: NUMERIC(12, 2) DEFAULT 0.00
- `txn_time`: TIMESTAMPTZ NOT NULL
- `source_type`: VARCHAR(50) NOT NULL (`PAYTM_STAGING`, `SYNTHETIC_DEMO`, `PAYTM_PRODUCTION`)
- `created_at`: TIMESTAMPTZ NOT NULL

### 5. `settlement_batches`
- `id`: UUID (PK)
- `merchant_id`: UUID (FK -> merchants.id)
- `batch_ref`: VARCHAR(100) NOT NULL
- `date`: DATE NOT NULL
- `gross`: NUMERIC(12, 2) NOT NULL
- `fees`: NUMERIC(12, 2) NOT NULL
- `refunds`: NUMERIC(12, 2) NOT NULL
- `net`: NUMERIC(12, 2) NOT NULL
- `status`: VARCHAR(50) NOT NULL (`SETTLED`, `PENDING`, `PROCESSING`)
- `source_type`: VARCHAR(50) NOT NULL (`SYNTHETIC_DEMO`, `PAYTM_PRODUCTION`)
- `created_at`: TIMESTAMPTZ NOT NULL

### 6. `settlement_entries`
- `id`: UUID (PK)
- `batch_id`: UUID (FK -> settlement_batches.id)
- `transaction_id`: UUID (FK -> transactions.id)
- `amount`: NUMERIC(12, 2) NOT NULL
- `entry_type`: VARCHAR(50) NOT NULL (`PAYMENT`, `REFUND`, `FEE_ADJUSTMENT`)
- `status`: VARCHAR(50) NOT NULL (`SETTLED`, `PENDING_REVIEW`)
- `source_type`: VARCHAR(50) NOT NULL
- `created_at`: TIMESTAMPTZ NOT NULL

### 7. `support_cases`
- `id`: UUID (PK)
- `merchant_id`: UUID (FK -> merchants.id)
- `case_number`: VARCHAR(50) UNIQUE NOT NULL
- `category`: VARCHAR(50) NOT NULL (`SETTLEMENT_MISMATCH`, `PAYMENT_STATUS`, `REFUND_STATUS`, `OTHER`)
- `priority`: VARCHAR(20) NOT NULL (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `status`: VARCHAR(50) NOT NULL (`NEW`, `TRIAGED`, `INVESTIGATING`, `AWAITING_APPROVAL`, `IN_PROGRESS`, `PENDING_EXTERNAL`, `VERIFYING`, `RESOLVED`, `ESCALATED`, `CANCELLED`)
- `queue`: VARCHAR(50) NOT NULL (`SETTLEMENT_OPS`, `SUPPORT_AGENT_QUEUE`, `SUPERVISOR_QUEUE`)
- `summary`: TEXT NOT NULL
- `idempotency_key`: VARCHAR(100) UNIQUE NOT NULL
- `followup_at`: TIMESTAMPTZ NULL
- `created_at`: TIMESTAMPTZ NOT NULL
- `updated_at`: TIMESTAMPTZ NOT NULL

### 8. `case_events`
- `id`: UUID (PK)
- `case_id`: UUID (FK -> support_cases.id)
- `actor`: VARCHAR(100) NOT NULL
- `event_type`: VARCHAR(50) NOT NULL (`STATUS_CHANGE`, `AGENT_ACTION`, `APPROVAL_REQUESTED`, `APPROVAL_GRANTED`, `APPROVAL_REJECTED`, `VERIFICATION_ATTEMPT`, `NOTE_ADDED`)
- `from_status`: VARCHAR(50) NULL
- `to_status`: VARCHAR(50) NULL
- `visibility`: VARCHAR(20) NOT NULL DEFAULT 'MERCHANT_VISIBLE' (`MERCHANT_VISIBLE`, `INTERNAL_ONLY`)
- `payload`: JSONB NOT NULL DEFAULT '{}'
- `created_at`: TIMESTAMPTZ NOT NULL

### 9. `conversations`
- `id`: UUID (PK)
- `merchant_id`: UUID (FK -> merchants.id)
- `channel`: VARCHAR(30) NOT NULL (`CHAT`, `VOICE`)
- `active_case_id`: UUID (FK -> support_cases.id) NULL
- `created_at`: TIMESTAMPTZ NOT NULL
- `updated_at`: TIMESTAMPTZ NOT NULL

### 10. `messages`
- `id`: UUID (PK)
- `conversation_id`: UUID (FK -> conversations.id)
- `role`: VARCHAR(30) NOT NULL (`USER`, `ASSISTANT`, `SYSTEM`)
- `content`: TEXT NOT NULL
- `transcript_ref`: VARCHAR(100) NULL
- `metadata`: JSONB NOT NULL DEFAULT '{}'
- `created_at`: TIMESTAMPTZ NOT NULL

### 11. `agent_runs`
- `id`: UUID (PK)
- `conversation_id`: UUID (FK -> conversations.id)
- `case_id`: UUID (FK -> support_cases.id) NULL
- `provider`: VARCHAR(50) NOT NULL (`GEMINI`, `MOCK_LLM`)
- `model`: VARCHAR(100) NOT NULL
- `status`: VARCHAR(50) NOT NULL (`RUNNING`, `SUCCESS`, `FAILED`)
- `trace_id`: VARCHAR(100) NOT NULL
- `created_at`: TIMESTAMPTZ NOT NULL

### 12. `tool_executions`
- `id`: UUID (PK)
- `agent_run_id`: UUID (FK -> agent_runs.id)
- `tool`: VARCHAR(100) NOT NULL
- `input_hash`: VARCHAR(100) NOT NULL
- `output_ref`: TEXT NOT NULL
- `status`: VARCHAR(50) NOT NULL (`SUCCESS`, `ERROR`)
- `latency_ms`: INTEGER NOT NULL DEFAULT 0
- `idempotency_key`: VARCHAR(100) NULL
- `created_at`: TIMESTAMPTZ NOT NULL

### 13. `approvals`
- `id`: UUID (PK)
- `case_id`: UUID (FK -> support_cases.id)
- `action`: VARCHAR(100) NOT NULL
- `requested_by`: VARCHAR(100) NOT NULL
- `decided_by`: VARCHAR(100) NULL
- `decision`: VARCHAR(50) NOT NULL DEFAULT 'PENDING' (`PENDING`, `APPROVED`, `REJECTED`)
- `reason`: TEXT NULL
- `status`: VARCHAR(50) NOT NULL DEFAULT 'AWAITING'
- `created_at`: TIMESTAMPTZ NOT NULL
- `updated_at`: TIMESTAMPTZ NOT NULL

### 14. `calls`
- `id`: UUID (PK)
- `conversation_id`: UUID (FK -> conversations.id)
- `consent`: BOOLEAN NOT NULL DEFAULT TRUE
- `started_at`: TIMESTAMPTZ NOT NULL
- `ended_at`: TIMESTAMPTZ NULL
- `outcome`: VARCHAR(50) NOT NULL (`COMPLETED`, `ABANDONED`, `ERROR`)
- `audio_ref`: VARCHAR(255) NULL

### 15. `webhook_events`
- `id`: UUID (PK)
- `provider`: VARCHAR(50) NOT NULL (`PAYTM`)
- `event_id`: VARCHAR(100) UNIQUE NOT NULL
- `signature_valid`: BOOLEAN NOT NULL
- `payload_hash`: VARCHAR(100) NOT NULL
- `payload`: JSONB NOT NULL
- `status`: VARCHAR(50) NOT NULL (`PROCESSED`, `DUPLICATE`, `FAILED`)
- `created_at`: TIMESTAMPTZ NOT NULL

### 16. `audit_events`
- `id`: UUID (PK)
- `actor`: VARCHAR(100) NOT NULL
- `action`: VARCHAR(100) NOT NULL
- `resource`: VARCHAR(100) NOT NULL
- `trace_id`: VARCHAR(100) NOT NULL
- `details`: JSONB NOT NULL DEFAULT '{}'
- `created_at`: TIMESTAMPTZ NOT NULL
