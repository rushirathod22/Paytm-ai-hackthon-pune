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
    status: str # "MATCHED", "PARTIALLY_MATCHED", "AMOUNT_MISMATCH", "DISCREPANCY_DETECTED", "SETTLEMENT_PENDING", "BANK_CREDIT_UNCONFIRMED", "INSUFFICIENT_EVIDENCE", "REQUIRES_HUMAN_REVIEW"
    gross_successful_amount: Decimal
    eligible_payments: Decimal = Decimal("0.00")
    total_refunds: Decimal
    total_chargebacks: Decimal = Decimal("0.00")
    total_commission: Decimal = Decimal("0.00")
    total_fees: Decimal
    total_tax: Decimal
    total_adjustments: Decimal = Decimal("0.00")
    expected_net: Decimal
    observed_settlement: Decimal
    actual_bank_credit: Decimal = Decimal("0.00")
    discrepancy_amount: Decimal
    settlement_difference: Decimal = Decimal("0.00")
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
        chargebacks: Decimal = Decimal("0.00"),
        commission: Decimal = Decimal("0.00"),
        other_adjustments: Decimal = Decimal("0.00"),
        actual_bank_credit: Optional[Decimal] = None,
        currency: str = "INR"
    ) -> ReconciliationResult:
        if not transactions:
            return ReconciliationResult(
                is_reconciled=False,
                status="INSUFFICIENT_EVIDENCE",
                gross_successful_amount=Decimal("0.00"),
                eligible_payments=Decimal("0.00"),
                total_refunds=Decimal("0.00"),
                total_chargebacks=chargebacks,
                total_commission=commission,
                total_fees=Decimal("0.00"),
                total_tax=Decimal("0.00"),
                total_adjustments=other_adjustments,
                expected_net=Decimal("0.00"),
                observed_settlement=Decimal("0.00"),
                actual_bank_credit=actual_bank_credit or Decimal("0.00"),
                discrepancy_amount=Decimal("0.00"),
                settlement_difference=Decimal("0.00"),
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

        if chargebacks > Decimal("0.00"):
            calculation_trace.append(f"Deducted chargebacks: -{chargebacks}")
        if commission > Decimal("0.00"):
            calculation_trace.append(f"Deducted platform commission: -{commission}")
        if other_adjustments != Decimal("0.00"):
            calculation_trace.append(f"Applied net adjustments: +{other_adjustments}")

        # Expected Net Settlement = Eligible Payments - Refunds - Chargebacks - Commission - Taxes + Adjustments
        expected_net = gross - total_refunds - chargebacks - commission - total_fees - total_tax + other_adjustments

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
                total_refunds += entry.amount
            elif entry.entry_type == "FEE_ADJUSTMENT":
                observed_settlement -= entry.amount

        calculation_trace.append(f"Summed {len(settlement_entries)} settlement entries for batch = {observed_settlement}")

        discrepancy = expected_net - observed_settlement
        effective_credit = actual_bank_credit if actual_bank_credit is not None else observed_settlement
        settlement_difference = expected_net - effective_credit

        missing_txns = []
        reconciled_txns = []
        for txn in valid_transactions:
            if txn.transaction_id not in settled_txn_ids:
                missing_txns.append(txn.transaction_id)
            else:
                reconciled_txns.append(txn.transaction_id)

        is_reconciled = (discrepancy == Decimal("0.00")) and (settlement_difference == Decimal("0.00"))
        
        # Categorize deterministic reconciliation status
        if is_reconciled:
            status = "MATCHED"
            explanation = f"Settlement exactly matches eligible captures. Expected {expected_net} {currency}, Verified Credit {effective_credit} {currency}."
        elif len(reconciled_txns) > 0 and len(missing_txns) > 0:
            status = "PARTIALLY_MATCHED"
            explanation = (
                f"Partial settlement identified: Expected {expected_net} {currency}, observed {observed_settlement} {currency}. "
                f"{len(reconciled_txns)} order(s) settled, {len(missing_txns)} order(s) pending settlement release."
            )
        elif chargebacks > Decimal("0.00"):
            status = "REQUIRES_HUMAN_REVIEW"
            explanation = f"Settlement held or adjusted due to ₹{chargebacks} in active chargeback disputes."
        elif actual_bank_credit is not None and actual_bank_credit != observed_settlement:
            status = "BANK_CREDIT_UNCONFIRMED"
            explanation = f"Batch marked settled at ₹{observed_settlement}, but reported bank credit is ₹{actual_bank_credit}. UTR confirmation required."
        elif observed_settlement == Decimal("0.00") and gross > 0:
            status = "SETTLEMENT_PENDING"
            explanation = f"Eligible payments of {gross} {currency} captured, but no settlement batch has been generated."
        else:
            status = "AMOUNT_MISMATCH"
            explanation = (
                f"Settlement discrepancy detected: Expected {expected_net} {currency} exceeds observed {observed_settlement} {currency} "
                f"by {discrepancy} {currency}."
            )

        return ReconciliationResult(
            is_reconciled=is_reconciled,
            status=status,
            gross_successful_amount=gross,
            eligible_payments=gross,
            total_refunds=total_refunds,
            total_chargebacks=chargebacks,
            total_commission=commission,
            total_fees=total_fees,
            total_tax=total_tax,
            total_adjustments=other_adjustments,
            expected_net=expected_net,
            observed_settlement=observed_settlement,
            actual_bank_credit=effective_credit,
            discrepancy_amount=discrepancy,
            settlement_difference=settlement_difference,
            missing_transaction_ids=missing_txns,
            reconciled_transaction_ids=reconciled_txns,
            source_provenance=list(provenance),
            calculation_trace=calculation_trace,
            explanation=explanation
        )
