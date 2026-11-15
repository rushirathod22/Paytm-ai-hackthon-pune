import pytest
from services.api.app.domain.policy import PolicyEngine, PolicyDecision

def test_safe_reads_allowed():
    res = PolicyEngine.evaluate("READ_TRANSACTION", "MERCHANT")
    assert res.decision == PolicyDecision.ALLOW
    assert res.reason_code == "SAFE_READ_OPERATION"

def test_reconciliation_allowed():
    res = PolicyEngine.evaluate("CALCULATE_DISCREPANCY", "MERCHANT")
    assert res.decision == PolicyDecision.ALLOW

def test_case_creation_allowed():
    res = PolicyEngine.evaluate("CREATE_SUPPORT_CASE", "MERCHANT")
    assert res.decision == PolicyDecision.ALLOW

def test_financial_remediation_policy():
    # Merchant cannot initiate remediation
    res_m = PolicyEngine.evaluate("INITIATE_REFUND", "MERCHANT")
    assert res_m.decision == PolicyDecision.DENY

    # Support Agent requires Supervisor approval
    res_s = PolicyEngine.evaluate("INITIATE_REFUND", "SUPPORT_AGENT")
    assert res_s.decision == PolicyDecision.REQUIRE_HUMAN_APPROVAL

    # Supervisor can authorize
    res_sup = PolicyEngine.evaluate("INITIATE_REFUND", "SUPERVISOR")
    assert res_sup.decision == PolicyDecision.ALLOW

def test_forbidden_high_risk_actions():
    res1 = PolicyEngine.evaluate("TRANSFER_FUNDS", "SUPERVISOR")
    assert res1.decision == PolicyDecision.DENY

    res2 = PolicyEngine.evaluate("CHANGE_BANK_DETAILS", "SUPERVISOR")
    assert res2.decision == PolicyDecision.DENY

def test_case_resolution_trust_rule():
    # Premature closure without verification PASS is strictly DENIED
    res_unverified = PolicyEngine.evaluate("RESOLVE_CASE", "SUPPORT_AGENT", {"is_verified": False})
    assert res_unverified.decision == PolicyDecision.DENY
    assert res_unverified.reason_code == "VERIFICATION_REQUIRED_BEFORE_CLOSURE"

    # Only verified PASS is allowed
    res_verified = PolicyEngine.evaluate("RESOLVE_CASE", "SUPPORT_AGENT", {"is_verified": True})
    assert res_verified.decision == PolicyDecision.ALLOW
