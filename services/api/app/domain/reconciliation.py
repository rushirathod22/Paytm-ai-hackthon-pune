from decimal import Decimal
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ReconciliationItem(BaseModel):
    transaction_id: str
    order_id: str
    provider_txn_id: str
    amount: Decimal
    fee: Decimal = Decimal("0.00")
    tax: Decimal = Decimal("0.00")
    status: str
    source_type: str

class SettlementEntryItem(BaseModel):
    entry_id: str
    transaction_id: Optional[str] = None
    amount: Decimal
    entry_type: str
    source_type: str

class ReconciliationResult(BaseModel):
    is_reconciled: bool
    status: str # "MATCHED", "DISCREPANCY_DETECTED", "INSUFFICIENT_EVIDENCE"
    gross_successful_amount: Decimal
    total_refunds: Decimal
    total_fees: Decimal
    total_tax: Decimal
    expected_net: Decimal
    observed_settlement: Decimal
    discrepancy_amount: Decimal
    missing_transaction_ids: List[str] = Field(default_factory=list)
    reconciled_transaction_ids: List[str] = Field(default_factory=list)
    source_provenance: List[str] = Field(default_factory=list)
    calculation_trace: List[str] = Field(default_factory=list)
    explanation: str

class ReconciliationEngine:
    """
    Deterministic domain service calculating expected net vs observed settlement.
    Strictly uses Python Decimal to eliminate floating point rounding errors.
    """

    @staticmethod
    def calculate(
        transactions: List[ReconciliationItem],
        settlement_entries: List[SettlementEntryItem],
        currency: str = "INR"
    ) -> ReconciliationResult:
        if not transactions:
            return ReconciliationResult(
                is_reconciled=False,
                status="INSUFFICIENT_EVIDENCE",
                gross_successful_amount=Decimal("0.00"),
                total_refunds=Decimal("0.00"),
                total_fees=Decimal("0.00"),
                total_tax=Decimal("0.00"),
                expected_net=Decimal("0.00"),
                observed_settlement=Decimal("0.00"),
                discrepancy_amount=Decimal("0.00"),
                explanation="No transaction records provided for reconciliation."
            )

        gross = Decimal("0.00")
        total_fees = Decimal("0.00")
        total_tax = Decimal("0.00")
        total_refunds = Decimal("0.00")
        provenance = set()
        calculation_trace = []

        valid_transactions = []
        for txn in transactions:
            provenance.add(txn.source_type)
            if txn.status == "SUCCESS":
                gross += txn.amount
                total_fees += txn.fee
                total_tax += txn.tax
                valid_transactions.append(txn)
                calculation_trace.append(f"Included capture txn {txn.order_id}: +{txn.amount} (Fee: -{txn.fee}, Tax: -{txn.tax})")
            else:
                calculation_trace.append(f"Excluded non-success txn {txn.order_id} with status '{txn.status}'")

        expected_net = gross - total_refunds - total_fees - total_tax

        observed_settlement = Decimal("0.00")
        settled_txn_ids = set()

        for entry in settlement_entries:
            provenance.add(entry.source_type)
            if entry.entry_type == "PAYMENT":
                observed_settlement += entry.amount
                if entry.transaction_id:
                    settled_txn_ids.add(entry.transaction_id)
            elif entry.entry_type == "REFUND":
                observed_settlement -= entry.amount
            elif entry.entry_type == "FEE_ADJUSTMENT":
                observed_settlement -= entry.amount

        calculation_trace.append(f"Summed {len(settlement_entries)} settlement entries for batch = {observed_settlement}")

        discrepancy = expected_net - observed_settlement

        missing_txns = []
        reconciled_txns = []
        for txn in valid_transactions:
            if txn.transaction_id not in settled_txn_ids:
                missing_txns.append(txn.transaction_id)
            else:
                reconciled_txns.append(txn.transaction_id)

        is_reconciled = (discrepancy == Decimal("0.00"))
        status = "MATCHED" if is_reconciled else "DISCREPANCY_DETECTED"

        if is_reconciled:
            explanation = f"Settlement exactly matches eligible captures. Expected {expected_net} {currency}, Observed {observed_settlement} {currency}."
        else:
            explanation = (
                f"Discrepancy detected: Expected settlement of {expected_net} {currency} "
                f"exceeds observed batch settlement of {observed_settlement} {currency} by {discrepancy} {currency}. "
                f"{len(missing_txns)} transaction(s) pending settlement entry."
            )

        return ReconciliationResult(
            is_reconciled=is_reconciled,
            status=status,
            gross_successful_amount=gross,
            total_refunds=total_refunds,
            total_fees=total_fees,
            total_tax=total_tax,
            expected_net=expected_net,
            observed_settlement=observed_settlement,
            discrepancy_amount=discrepancy,
            missing_transaction_ids=missing_txns,
            reconciled_transaction_ids=reconciled_txns,
            source_provenance=list(provenance),
            calculation_trace=calculation_trace,
            explanation=explanation
        )
