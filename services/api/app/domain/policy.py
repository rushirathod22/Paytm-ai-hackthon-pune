from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel

class PolicyDecision(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    REQUIRE_HUMAN_APPROVAL = "REQUIRE_HUMAN_APPROVAL"

class PolicyEvaluationResult(BaseModel):
    decision: PolicyDecision
    reason_code: str
    message: str
    required_role: Optional[str] = None
    audit_payload: Dict[str, Any] = {}

class PolicyEngine:
    """
    Enforces security, financial, and lifecycle policies.
    Guarantees AI agents cannot perform unauthorized actions.
    """

    @staticmethod
    def evaluate(
        action: str,
        actor_role: str,
        context: Optional[Dict[str, Any]] = None
    ) -> PolicyEvaluationResult:
        context = context or {}

        # 1. Read Operations
        if action in ["READ_TRANSACTION", "GET_MERCHANT_CONTEXT", "GET_SETTLEMENT_ENTRIES"]:
            return PolicyEvaluationResult(
                decision=PolicyDecision.ALLOW,
                reason_code="SAFE_READ_OPERATION",
                message="Read operation permitted within authenticated tenant scope."
            )

        # 2. Mathematical Reconciliation
        if action == "CALCULATE_DISCREPANCY":
            return PolicyEvaluationResult(
                decision=PolicyDecision.ALLOW,
                reason_code="DETERMINISTIC_RECONCILIATION",
                message="Deterministic calculation via domain engine permitted."
            )

        # 3. Operational Case Creation
        if action == "CREATE_SUPPORT_CASE":
            return PolicyEvaluationResult(
                decision=PolicyDecision.ALLOW,
                reason_code="LOW_RISK_CASE_CREATION",
                message="Case tracking creation permitted."
            )

        # 4. Queue Assignment
        if action == "ASSIGN_QUEUE":
            if actor_role in ["SUPPORT_AGENT", "SUPERVISOR"]:
                return PolicyEvaluationResult(
                    decision=PolicyDecision.ALLOW,
                    reason_code="AUTHORIZED_QUEUE_ASSIGNMENT",
                    message="Support role authorized to reassign queue."
                )
            return PolicyEvaluationResult(
                decision=PolicyDecision.DENY,
                reason_code="FORBIDDEN_QUEUE_ASSIGNMENT",
                message="Merchants cannot reassign internal queues.",
                required_role="SUPPORT_AGENT"
            )

        # 5. Financial Remediation / Refunds
        if action in ["INITIATE_REFUND", "EXECUTE_SETTLEMENT_PAYOUT", "APPROVE_REMEDIATION"]:
            if actor_role == "SUPERVISOR":
                return PolicyEvaluationResult(
                    decision=PolicyDecision.ALLOW,
                    reason_code="SUPERVISOR_AUTHORIZED",
                    message="Supervisor permitted to approve financial remediation."
                )
            elif actor_role == "SUPPORT_AGENT":
                return PolicyEvaluationResult(
                    decision=PolicyDecision.REQUIRE_HUMAN_APPROVAL,
                    reason_code="SUPERVISOR_APPROVAL_REQUIRED",
                    message="Support agents must escalate financial remediations to a supervisor.",
                    required_role="SUPERVISOR"
                )
            else:
                return PolicyEvaluationResult(
                    decision=PolicyDecision.DENY,
                    reason_code="FINANCIAL_ACTION_FORBIDDEN",
                    message="Merchants or autonomous agents cannot trigger financial payouts without approval.",
                    required_role="SUPERVISOR"
                )

        # 6. High Risk Operations (Out of scope)
        if action in ["TRANSFER_FUNDS", "CHANGE_BANK_DETAILS"]:
            return PolicyEvaluationResult(
                decision=PolicyDecision.DENY,
                reason_code="HIGH_RISK_ACTION_DENIED",
                message="Bank details modification and direct transfers are strictly prohibited."
            )

        # 7. Case Resolution
        if action == "RESOLVE_CASE":
            is_verified = context.get("is_verified", False)
            if not is_verified:
                return PolicyEvaluationResult(
                    decision=PolicyDecision.DENY,
                    reason_code="VERIFICATION_REQUIRED_BEFORE_CLOSURE",
                    message="Trust Rule Violation: A support ticket cannot be resolved without a verified PASS from a fresh ledger read."
                )
            return PolicyEvaluationResult(
                decision=PolicyDecision.ALLOW,
                reason_code="VERIFIED_RESOLUTION_PERMITTED",
                message="Case verification passed. Resolution allowed."
            )

        # Default Deny
        return PolicyEvaluationResult(
            decision=PolicyDecision.DENY,
            reason_code="UNRECOGNIZED_ACTION",
            message=f"Action '{action}' is not allowlisted."
        )
