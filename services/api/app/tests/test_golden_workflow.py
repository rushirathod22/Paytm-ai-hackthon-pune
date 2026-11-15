import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from services.api.app.main import app
from services.api.app.db.seed import seed_data

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    from services.api.app.db.session import engine, Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await seed_data()

@pytest.mark.asyncio
async def test_golden_workflow_end_to_end():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health Check
        health_resp = await client.get("/api/v1/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["ok"] is True
        assert health_resp.json()["data"]["status"] == "healthy"

        # 2. Merchant Demo Login
        login_resp = await client.post("/api/v1/auth/demo-login", json={"role": "MERCHANT"})
        assert login_resp.status_code == 200
        token = login_resp.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. List Transactions (Verify seeded ₹15,000 across 3 orders)
        txn_resp = await client.get("/api/v1/transactions", headers=headers)
        assert txn_resp.status_code == 200
        txns = txn_resp.json()["data"]
        assert len(txns) == 3

        # 4. Ingest Merchant Complaint via Chat Workspace
        complaint_payload = {
            "message": "Hi, my payment of ₹6,000 for Order #ORD-8821 is missing from today's settlement batch.",
            "channel": "CHAT"
        }
        agent_resp = await client.post("/api/v1/agent/messages", json=complaint_payload, headers=headers)
        assert agent_resp.status_code == 200
        agent_data = agent_resp.json()["data"]
        
        assert agent_data["intent"] == "SETTLEMENT_MISMATCH"
        assert float(agent_data["evidence"]["reconciliation"]["discrepancy_amount"]) == 6000.00
        assert agent_data["case"] is not None
        case_id = agent_data["case"]["id"]
        case_num = agent_data["case"]["case_number"]

        # 5. Premature Closure Check (Verify Trust Rule: cannot resolve unverified)
        verify_fail_resp = await client.post(f"/api/v1/cases/{case_id}/verify", headers=headers)
        assert verify_fail_resp.status_code == 200
        assert verify_fail_resp.json()["ok"] is False # Must fail because ledger hasn't credited the transaction yet!
        assert "Independent Verification FAIL" in verify_fail_resp.json()["data"]["reason"]

        # 6. Supervisor Login
        sup_login_resp = await client.post("/api/v1/auth/demo-login", json={"role": "SUPERVISOR"})
        assert sup_login_resp.status_code == 200
        sup_token = sup_login_resp.json()["data"]["access_token"]
        sup_headers = {"Authorization": f"Bearer {sup_token}"}

        # 7. Supervisor Approves Remediation
        approve_resp = await client.post(
            f"/api/v1/cases/{case_id}/approve",
            json={"action": "APPROVE_REMEDIATION", "notes": "Approved synthetic settlement payout of ₹6,000."},
            headers=sup_headers
        )
        assert approve_resp.status_code == 200
        assert approve_resp.json()["ok"] is True

        # 8. Post-Approval Independent Verification
        verify_success_resp = await client.post(f"/api/v1/cases/{case_id}/verify", headers=sup_headers)
        assert verify_success_resp.status_code == 200
        verify_data = verify_success_resp.json()["data"]
        assert verify_data["verified"] is True
        assert verify_data["status"] == "RESOLVED"
        assert "Independent Verification PASS" in verify_data["reason"]

        # 9. Verify Case Detail and Chronological Timeline
        case_detail_resp = await client.get(f"/api/v1/cases/{case_id}", headers=sup_headers)
        assert case_detail_resp.status_code == 200
        case_detail = case_detail_resp.json()["data"]
        assert case_detail["status"] == "RESOLVED"
        assert len(case_detail["events"]) >= 3
