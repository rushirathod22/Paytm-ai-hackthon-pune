# OpsSaathi AI: Comprehensive Test Plan

## 1. Unit Testing Strategy
- **Decimal Reconciliation (`tests/test_reconciliation.py`):**
  - Verify exact arithmetic with decimal precision (`15000.00 - 9000.00 = 6000.00`).
  - Verify no floating-point rounding anomalies.
  - Verify missing records return `INSUFFICIENT_EVIDENCE`.
- **Policy Engine (`tests/test_policy.py`):**
  - Verify `READ_TRANSACTION` returns `ALLOW`.
  - Verify `CREATE_SUPPORT_CASE` returns `ALLOW`.
  - Verify `INITIATE_REFUND` returns `REQUIRE_HUMAN_APPROVAL` or `DENY`.
  - Verify `RESOLVE_CASE` without verification pass returns `DENY`.
- **Case State Machine (`tests/test_case_lifecycle.py`):**
  - Valid transitions: `NEW -> INVESTIGATING -> ACTION_REQUIRED -> AWAITING_APPROVAL -> IN_PROGRESS -> VERIFYING -> RESOLVED`.
  - Invalid transitions raise `StateTransitionError`.
- **Tenant Scoping & Security (`tests/test_security_tenant.py`):**
  - Prevent cross-merchant IDOR. A merchant user cannot query transactions or cases belonging to another merchant.

## 2. Integration Testing Strategy
- **LangGraph Tool Invocations (`tests/test_langgraph_tools.py`):**
  - Verify typed tools: `find_transactions`, `get_settlement_entries`, `calculate_discrepancy`, `create_support_case`, `verify_resolution`.
  - Verify idempotency keys on case creation.
- **Paytm Webhook Adapter (`tests/test_paytm_webhook.py`):**
  - Verify checksum verification with valid and invalid signatures.
  - Verify duplicate event rejection.
- **Fallback Resilience (`tests/test_fallback_resilience.py`):**
  - Simulate missing LLM key or offline mode; system uses deterministic fallback logic without crashing.

## 3. End-to-End Golden Workflow Test (`tests/test_golden_workflow.py`)
1. Demo merchant logs in.
2. Ingests complaint: "₹6,000 payment missing from settlement".
3. AI agent performs backend tool lookup and deterministic discrepancy calculation.
4. Explains evidence with source label `SYNTHETIC_DEMO`.
5. Creates support case idempotent with status `AWAITING_APPROVAL` or `ACTION_REQUIRED`.
6. Support supervisor logs in and approves remediation.
7. Verification service runs fresh read against ledger.
8. Case marks `RESOLVED` only after fresh read succeeds.
