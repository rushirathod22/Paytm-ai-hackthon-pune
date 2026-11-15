import pytest
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from services.api.app.main import app

@pytest.mark.asyncio
async def test_settlement_investigation_full_journey():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Reset demo to clean initial state
        await client.post("/api/v1/health/reset-demo")

        # 1. Merchant Login
        login_resp = await client.post("/api/v1/auth/demo-login", json={"role": "MERCHANT"})
        assert login_resp.status_code == 200
        token = login_resp.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Trigger Settlement Investigation
        investigate_payload = {
            "category": "MISSING_SETTLEMENT",
            "expected_amount": "6000.00",
            "order_id": "ORD-8821",
            "notes": "Payment received from customer on Soundbox but missing in bank settlement."
        }
        inv_resp = await client.post("/api/v1/settlements/investigate", json=investigate_payload, headers=headers)
        assert inv_resp.status_code == 200
        inv_data = inv_resp.json()
        assert inv_data["ok"] is True
        report = inv_data["data"]

        # 3. Verify Deterministic Math & Provenance
        assert "investigation_id" in report
        assert "reconciliation" in report
        recon = report["reconciliation"]
        assert Decimal(str(recon["discrepancy_amount"])) == Decimal("6000.00")
        assert recon["status"] in ["PARTIALLY_MATCHED", "AMOUNT_MISMATCH"]
        assert len(report["evidence_sources"]) > 0
        assert "timeline" in report
        assert len(report["timeline"]) >= 4

        # 4. Fetch Settlement Evidence
        settlements_resp = await client.get("/api/v1/settlements", headers=headers)
        assert settlements_resp.status_code == 200
        batches = settlements_resp.json()["data"]
        assert len(batches) > 0
        batch_id = batches[0]["id"]

        evidence_resp = await client.get(f"/api/v1/settlements/{batch_id}/evidence", headers=headers)
        assert evidence_resp.status_code == 200
        evidence_data = evidence_resp.json()["data"]
        assert "evidence_records" in evidence_data
        assert evidence_data["provenance"] == "SYNTHETIC_DEMO"

        # 5. Fetch Settlement Reconciliation
        batch_recon_resp = await client.get(f"/api/v1/settlements/{batch_id}/reconciliation", headers=headers)
        assert batch_recon_resp.status_code == 200
        batch_recon = batch_recon_resp.json()["data"]
        assert "calculation_trace" in batch_recon

        # 6. Escalate Investigation to Supervisor
        inv_id = report["investigation_id"]
        escalate_resp = await client.post(
            f"/api/v1/investigations/{inv_id}/escalate",
            json={"reason": "Merchant urgently requests bank transfer release"},
            headers=headers
        )
        assert escalate_resp.status_code == 200
        esc_data = escalate_resp.json()["data"]
        assert esc_data["status"] == "ESCALATED"
        assert esc_data["queue"] == "SETTLEMENT_OPS"
