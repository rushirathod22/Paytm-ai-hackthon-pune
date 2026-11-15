# OpsSaathi AI: Finale Demo Runbook (4–5 Minutes)

**Target Audience:** Hackathon Judges, Merchant Operations Evaluators  
**Tagline:** Don't just respond. Investigate. Act. Verify.

---

## Pre-Flight Check (1 Minute Before Pitch)
1. Ensure backend service is running on `http://localhost:8000`.
2. Ensure frontend service is running on `http://localhost:5173`.
3. Verify `/api/v1/health` returns `{"ok": true, "data": {"status": "healthy"}}`.
4. Browser microphone permissions granted.

---

## 4-Minute Presentation Script

### Act 1: The Merchant Dashboard (0:00 - 0:45)
- **Visual:** Open Merchant Workspace. Log in as "Sharma Sweets & Chaat" (`MERCHANT`).
- **Narration:**
  > "Every day, thousands of merchants look at their settlement ledger and panic when a payment they accepted isn't reflected in their bank payout. Generic chatbots explain settlement policies in 500 words, but they can't investigate. OpsSaathi AI is an autonomous merchant operations teammate."
- **Action:** Point out recent transactions (₹15,000 accepted today) vs settlement summary (only ₹9,000 deposited, missing ₹6,000).

### Act 2: Conversational & Voice Intake (0:45 - 1:45)
- **Visual:** Click microphone or type in the OpsSaathi chat panel.
- **Utterance:**
  > "Hi OpsSaathi, I accepted a payment of ₹6,000 earlier today for Order #ORD-8821, but it is not in my settlement batch."
- **Narration:**
  > "Notice that speech and text share the exact same backend agent brain and conversation context. The AI classifies the intent as `SETTLEMENT_MISMATCH` and calls backend verification tools."
- **Action:** Show the live agent thinking and tool trace unfolding.

### Act 3: Evidence Grounding & Deterministic Reconciliation (1:45 - 2:45)
- **Visual:** Investigation Card appears with source provenance tag: `SYNTHETIC_DEMO`.
- **Narration:**
  > "Rule 1 of OpsSaathi: Never let an LLM hallucinate financial figures. Our domain reconciliation engine uses Python Decimal arithmetic. Here, it found Payment `TXN-8821` of ₹6,000 was captured successfully, but held in batch queue due to a settlement cutoff. It displays exact evidence with complete provenance."

### Act 4: Policy Gate & Human Approval (2:45 - 3:30)
- **Visual:** Case `CASE-2026-0042` created. Action requires supervisor approval.
- **Narration:**
  > "Rule 2: AI teammates cannot autonomously move funds. The policy engine marks this action as `REQUIRE_HUMAN_APPROVAL`."
- **Action:** Switch to the Operations Console as `SUPERVISOR`. Review evidence and click **Approve Remediation**.

### Act 5: Independent Verification & Closure (3:30 - 4:30)
- **Visual:** Support console / Chat view triggers **Verify Resolution**.
- **Narration:**
  > "A support ticket is not a financial resolution. OpsSaathi does not say 'Resolved' just because an agent clicked approve. It executes a fresh database read to confirm the ₹6,000 has settled. Only upon `PASS` does the case transition to `RESOLVED`."
- **Action:** Show timeline updated with audit hash and green `RESOLVED` status badge.
