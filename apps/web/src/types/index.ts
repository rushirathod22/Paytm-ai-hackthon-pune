export type UserRole = 'MERCHANT' | 'SUPPORT_AGENT' | 'SUPERVISOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Merchant {
  id: string;
  display_name: string;
  masked_phone: string;
  external_mid: string;
  status: string;
}

export interface Transaction {
  id: string;
  order_id: string;
  provider_txn_id: string;
  amount: string;
  fee: string;
  tax: string;
  currency: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  txn_time: string;
  source_type: 'PAYTM_STAGING' | 'SYNTHETIC_DEMO' | 'PAYTM_PRODUCTION';
}

export interface SettlementBatch {
  id: string;
  batch_ref: string;
  date: string;
  gross: string;
  fees: string;
  refunds: string;
  net: string;
  status: string;
  source_type: string;
  entries_count: number;
}

export interface SupportCase {
  id: string;
  case_number: string;
  merchant_id: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'NEW' | 'TRIAGED' | 'INVESTIGATING' | 'ACTION_REQUIRED' | 'AWAITING_APPROVAL' | 'IN_PROGRESS' | 'PENDING_EXTERNAL' | 'VERIFYING' | 'RESOLVED' | 'ESCALATED';
  queue: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface CaseEvent {
  id: string;
  actor: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  visibility: 'MERCHANT_VISIBLE' | 'INTERNAL_ONLY';
  payload: Record<string, any>;
  created_at: string;
}

export interface Approval {
  id: string;
  action: string;
  requested_by: string;
  decided_by: string | null;
  decision: 'PENDING' | 'APPROVED' | 'REJECTED';
  status: string;
  reason: string | null;
  created_at: string;
}

export interface CaseDetail extends SupportCase {
  events: CaseEvent[];
  approvals: Approval[];
}

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  created_at?: string;
  evidence?: any;
  case?: any;
}

export interface InvestigationReport {
  investigation_id: string;
  merchant_id: string;
  merchant_name: string;
  complaint_category: string;
  status: string;
  case_id?: string;
  case_number?: string;
  reconciliation: {
    is_reconciled: boolean;
    status: string;
    gross_payments: string;
    eligible_payments: string;
    refund_deductions: string;
    chargeback_deductions: string;
    commission_deductions: string;
    tax_deductions: string;
    other_adjustments: string;
    expected_net: string;
    observed_settlement: string;
    actual_bank_credit: string;
    discrepancy_amount: string;
    settlement_difference: string;
    missing_orders: string[];
    calculation_trace: string[];
    explanation: string;
  };
  evidence_records: {
    evidence_type: string;
    source_type: string;
    reference_id: string;
    description: string;
    timestamp: string;
    verification_status: string;
    details: Record<string, any>;
  }[];
  timeline: {
    stage: string;
    timestamp: string;
    status: string;
    details: string;
  }[];
  ai_explanation: string;
  next_permitted_action: string;
  created_at: string;
}
