import pytest
from decimal import Decimal
from services.api.app.domain.reconciliation import (
    ReconciliationEngine, ReconciliationItem, SettlementEntryItem
)

def test_reconciliation_exact_decimal_match():
    txns = [
        ReconciliationItem(
            transaction_id="tx-1",
            order_id="ORD-1",
            provider_txn_id="PTM-1",
            amount=Decimal("5000.00"),
            fee=Decimal("100.00"),
            tax=Decimal("18.00"),
            status="SUCCESS",
            source_type="SYNTHETIC_DEMO"
        )
    ]
    entries = [
        SettlementEntryItem(
            entry_id="se-1",
            transaction_id="tx-1",
            amount=Decimal("4882.00"), # 5000 - 100 - 18
            entry_type="PAYMENT",
            source_type="SYNTHETIC_DEMO"
        )
    ]

    res = ReconciliationEngine.calculate(txns, entries)
    assert res.is_reconciled is True
    assert res.status == "MATCHED"
    assert res.discrepancy_amount == Decimal("0.00")
    assert res.expected_net == Decimal("4882.00")
    assert res.observed_settlement == Decimal("4882.00")

def test_golden_demo_discrepancy_calculation():
    """
    Scenario: ₹15,000 captured payments (₹5,000 + ₹4,000 + ₹6,000),
    Settlement batch only settled ₹9,000 (missing ₹6,000 from ORD-8821).
    """
    txns = [
        ReconciliationItem(
            transaction_id="tx-1",
            order_id="ORD-8819",
            provider_txn_id="PTM-1",
            amount=Decimal("5000.00"),
            status="SUCCESS",
            source_type="SYNTHETIC_DEMO"
        ),
        ReconciliationItem(
            transaction_id="tx-2",
            order_id="ORD-8820",
            provider_txn_id="PTM-2",
            amount=Decimal("4000.00"),
            status="SUCCESS",
            source_type="SYNTHETIC_DEMO"
        ),
        ReconciliationItem(
            transaction_id="tx-3",
            order_id="ORD-8821",
            provider_txn_id="PTM-3",
            amount=Decimal("6000.00"),
            status="SUCCESS",
            source_type="SYNTHETIC_DEMO"
        )
    ]
    entries = [
        SettlementEntryItem(
            entry_id="se-1",
            transaction_id="tx-1",
            amount=Decimal("5000.00"),
            entry_type="PAYMENT",
            source_type="SYNTHETIC_DEMO"
        ),
        SettlementEntryItem(
            entry_id="se-2",
            transaction_id="tx-2",
            amount=Decimal("4000.00"),
            entry_type="PAYMENT",
            source_type="SYNTHETIC_DEMO"
        )
    ]

    res = ReconciliationEngine.calculate(txns, entries)
    assert res.is_reconciled is False
    assert res.status in ["PARTIALLY_MATCHED", "DISCREPANCY_DETECTED"]
    assert res.expected_net == Decimal("15000.00")
    assert res.observed_settlement == Decimal("9000.00")
    assert res.discrepancy_amount == Decimal("6000.00")
    assert "tx-3" in res.missing_transaction_ids
    assert len(res.missing_transaction_ids) == 1

def test_reconciliation_excludes_failed_transactions():
    txns = [
        ReconciliationItem(
            transaction_id="tx-1",
            order_id="ORD-1",
            provider_txn_id="PTM-1",
            amount=Decimal("2000.00"),
            status="FAILED",
            source_type="SYNTHETIC_DEMO"
        )
    ]
    res = ReconciliationEngine.calculate(txns, [])
    assert res.gross_successful_amount == Decimal("0.00")
    assert res.expected_net == Decimal("0.00")
