import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import (
    Column, String, Boolean, DateTime, Date, Numeric, ForeignKey, Text, JSON, Integer
)
from sqlalchemy.orm import relationship
from services.api.app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

def get_utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="MERCHANT") # MERCHANT, SUPPORT_AGENT, SUPERVISOR
    hashed_password = Column(String(255), nullable=False, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    merchant_memberships = relationship("MerchantUser", back_populates="user", cascade="all, delete-orphan")

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    external_mid = Column(String(100), unique=True, nullable=True, index=True)
    display_name = Column(String(255), nullable=False)
    masked_phone = Column(String(30), nullable=False)
    status = Column(String(50), nullable=False, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    users = relationship("MerchantUser", back_populates="merchant", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="merchant", cascade="all, delete-orphan")
    settlement_batches = relationship("SettlementBatch", back_populates="merchant", cascade="all, delete-orphan")
    cases = relationship("SupportCase", back_populates="merchant", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="merchant", cascade="all, delete-orphan")

class MerchantUser(Base):
    __tablename__ = "merchant_users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False)
    role = Column(String(50), nullable=False, default="OWNER")
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    user = relationship("User", back_populates="merchant_memberships")
    merchant = relationship("Merchant", back_populates="users")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    provider = Column(String(50), nullable=False, default="PAYTM")
    provider_txn_id = Column(String(100), nullable=False, index=True)
    order_id = Column(String(100), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    status = Column(String(50), nullable=False) # SUCCESS, PENDING, FAILED
    fee = Column(Numeric(12, 2), default=Decimal("0.00"))
    tax = Column(Numeric(12, 2), default=Decimal("0.00"))
    txn_time = Column(DateTime(timezone=True), nullable=False)
    source_type = Column(String(50), nullable=False, default="SYNTHETIC_DEMO") # PAYTM_STAGING, SYNTHETIC_DEMO
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    merchant = relationship("Merchant", back_populates="transactions")
    settlement_entries = relationship("SettlementEntry", back_populates="transaction")

class SettlementBatch(Base):
    __tablename__ = "settlement_batches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    batch_ref = Column(String(100), nullable=False, index=True)
    date = Column(Date, nullable=False)
    gross = Column(Numeric(12, 2), nullable=False)
    fees = Column(Numeric(12, 2), nullable=False)
    refunds = Column(Numeric(12, 2), nullable=False)
    net = Column(Numeric(12, 2), nullable=False)
    commission = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    tax = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    chargebacks = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    adjustments = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    utr = Column(String(100), nullable=True, default="UTR-PTM-20261114-4819")
    status = Column(String(50), nullable=False, default="SETTLED") # SETTLED, PENDING, PROCESSING
    source_type = Column(String(50), nullable=False, default="SYNTHETIC_DEMO")
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    merchant = relationship("Merchant", back_populates="settlement_batches")
    entries = relationship("SettlementEntry", back_populates="batch", cascade="all, delete-orphan")

class SettlementEntry(Base):
    __tablename__ = "settlement_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    batch_id = Column(String(36), ForeignKey("settlement_batches.id"), nullable=False, index=True)
    transaction_id = Column(String(36), ForeignKey("transactions.id"), nullable=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    entry_type = Column(String(50), nullable=False, default="PAYMENT") # PAYMENT, REFUND, FEE_ADJUSTMENT
    status = Column(String(50), nullable=False, default="SETTLED") # SETTLED, PENDING_REVIEW
    source_type = Column(String(50), nullable=False, default="SYNTHETIC_DEMO")
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    batch = relationship("SettlementBatch", back_populates="entries")
    transaction = relationship("Transaction", back_populates="settlement_entries")

class SupportCase(Base):
    __tablename__ = "support_cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    case_number = Column(String(50), unique=True, nullable=False, index=True)
    category = Column(String(50), nullable=False) # SETTLEMENT_MISMATCH, PAYMENT_STATUS, REFUND_STATUS, OTHER
    priority = Column(String(20), nullable=False, default="HIGH") # LOW, MEDIUM, HIGH, URGENT
    status = Column(String(50), nullable=False, default="NEW") # NEW, TRIAGED, INVESTIGATING, AWAITING_APPROVAL, IN_PROGRESS, PENDING_EXTERNAL, VERIFYING, RESOLVED, ESCALATED, CANCELLED
    queue = Column(String(50), nullable=False, default="SETTLEMENT_OPS")
    summary = Column(Text, nullable=False)
    idempotency_key = Column(String(100), unique=True, nullable=False, index=True)
    followup_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    merchant = relationship("Merchant", back_populates="cases")
    events = relationship("CaseEvent", back_populates="case", cascade="all, delete-orphan", order_by="CaseEvent.created_at")
    approvals = relationship("Approval", back_populates="case", cascade="all, delete-orphan")

class CaseEvent(Base):
    __tablename__ = "case_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("support_cases.id"), nullable=False, index=True)
    actor = Column(String(100), nullable=False)
    event_type = Column(String(50), nullable=False) # STATUS_CHANGE, AGENT_ACTION, APPROVAL_REQUESTED, APPROVAL_GRANTED, APPROVAL_REJECTED, VERIFICATION_ATTEMPT, NOTE_ADDED
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=True)
    visibility = Column(String(20), nullable=False, default="MERCHANT_VISIBLE") # MERCHANT_VISIBLE, INTERNAL_ONLY
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    case = relationship("SupportCase", back_populates="events")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    channel = Column(String(30), nullable=False, default="CHAT") # CHAT, VOICE
    active_case_id = Column(String(36), ForeignKey("support_cases.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    merchant = relationship("Merchant", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
    agent_runs = relationship("AgentRun", back_populates="conversation")
    calls = relationship("Call", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String(30), nullable=False) # USER, ASSISTANT, SYSTEM
    content = Column(Text, nullable=False)
    transcript_ref = Column(String(100), nullable=True)
    meta = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    conversation = relationship("Conversation", back_populates="messages")

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    case_id = Column(String(36), ForeignKey("support_cases.id"), nullable=True)
    provider = Column(String(50), nullable=False, default="GEMINI")
    model = Column(String(100), nullable=False, default="gemini-2.5-flash")
    status = Column(String(50), nullable=False, default="RUNNING") # RUNNING, SUCCESS, FAILED
    trace_id = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    conversation = relationship("Conversation", back_populates="agent_runs")
    tool_executions = relationship("ToolExecution", back_populates="agent_run", cascade="all, delete-orphan")

class ToolExecution(Base):
    __tablename__ = "tool_executions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    agent_run_id = Column(String(36), ForeignKey("agent_runs.id"), nullable=False, index=True)
    tool = Column(String(100), nullable=False)
    input_hash = Column(String(100), nullable=False)
    output_ref = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="SUCCESS")
    latency_ms = Column(Integer, default=0)
    idempotency_key = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    agent_run = relationship("AgentRun", back_populates="tool_executions")

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("support_cases.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    requested_by = Column(String(100), nullable=False)
    decided_by = Column(String(100), nullable=True)
    decision = Column(String(50), nullable=False, default="PENDING") # PENDING, APPROVED, REJECTED
    reason = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="AWAITING")
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    case = relationship("SupportCase", back_populates="approvals")

class Call(Base):
    __tablename__ = "calls"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    consent = Column(Boolean, nullable=False, default=True)
    started_at = Column(DateTime(timezone=True), default=get_utc_now)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    outcome = Column(String(50), nullable=False, default="COMPLETED") # COMPLETED, ABANDONED, ERROR
    audio_ref = Column(String(255), nullable=True)

    conversation = relationship("Conversation", back_populates="calls")

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider = Column(String(50), nullable=False, default="PAYTM")
    event_id = Column(String(100), unique=True, nullable=False, index=True)
    signature_valid = Column(Boolean, nullable=False)
    payload_hash = Column(String(100), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    status = Column(String(50), nullable=False, default="PROCESSED") # PROCESSED, DUPLICATE, FAILED
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    trace_id = Column(String(100), nullable=False, index=True)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

class SettlementEvidence(Base):
    __tablename__ = "settlement_evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    settlement_batch_id = Column(String(36), ForeignKey("settlement_batches.id"), nullable=True, index=True)
    investigation_id = Column(String(36), nullable=True, index=True)
    evidence_type = Column(String(50), nullable=False) # TRANSACTION, SETTLEMENT_BATCH, BANK_STATEMENT, RECONCILIATION, TELEMETRY
    source_type = Column(String(50), nullable=False, default="SYNTHETIC_DEMO") # PAYTM_STAGING, SYNTHETIC_DEMO, MERCHANT_REPORTED
    reference_id = Column(String(100), nullable=True, index=True) # order_id, batch_ref, UTR
    is_verified = Column(Boolean, nullable=False, default=True)
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

class ReconciliationResultRecord(Base):
    __tablename__ = "reconciliation_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    investigation_id = Column(String(36), nullable=True, index=True)
    settlement_batch_id = Column(String(36), ForeignKey("settlement_batches.id"), nullable=True, index=True)
    gross_payments = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    eligible_payments = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    refund_deductions = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    chargeback_deductions = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    commission_deductions = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    tax_deductions = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    other_adjustments = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    expected_net = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    actual_bank_credit = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    settlement_difference = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    reconciliation_status = Column(String(50), nullable=False, default="MATCHED") # MATCHED, PARTIALLY_MATCHED, AMOUNT_MISMATCH, SETTLEMENT_PENDING, BANK_CREDIT_UNCONFIRMED, INSUFFICIENT_EVIDENCE, REQUIRES_HUMAN_REVIEW
    calculation_trace = Column(JSON, nullable=False, default=list)
    source_provenance = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

class InvestigationRun(Base):
    __tablename__ = "investigation_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    case_id = Column(String(36), ForeignKey("support_cases.id"), nullable=True, index=True)
    complaint_category = Column(String(50), nullable=False) # MISSING_SETTLEMENT, PARTIAL_SETTLEMENT, DELAYED_SETTLEMENT, INCORRECT_AMOUNT, UNKNOWN_DEDUCTION
    expected_amount = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    actual_credited_amount = Column(Numeric(12, 2), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    transaction_id = Column(String(100), nullable=True)
    settlement_id = Column(String(100), nullable=True)
    utr_reference = Column(String(100), nullable=True)
    complaint_description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="COMPLETED") # COMPLETED, ESCALATED, WAITING_FOR_HUMAN, RESOLVED
    summary_explanation = Column(Text, nullable=False)
    evidence_summary = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

class MonitoringAlert(Base):
    __tablename__ = "monitoring_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False) # SETTLEMENT_DELAY, SETTLEMENT_MISMATCH, DEVICE_CONNECTIVITY, UNUSUAL_REFUND
    severity = Column(String(20), nullable=False, default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    evidence = Column(JSON, nullable=False, default=dict)
    recommended_action = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="ACTIVE") # ACTIVE, ACKNOWLEDGED, RESOLVED
    detected_at = Column(DateTime(timezone=True), default=get_utc_now)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, default="INVESTIGATION") # INVESTIGATION, APPROVAL, SETTLEMENT, ALERT, CASE
    reference_id = Column(String(100), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
