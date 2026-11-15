import React, { useState } from 'react';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  UploadCloud,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Bot,
  ExternalLink,
  ChevronRight,
  Calculator,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { opsApi } from '../services/api';
import { InvestigationReport } from '../types';

interface SettlementInvestigationPageProps {
  onOpenConsole: (caseId?: string) => void;
  onOpenChatWithQuery?: (query: string) => void;
}

export const SettlementInvestigationPage: React.FC<SettlementInvestigationPageProps> = ({
  onOpenConsole,
  onOpenChatWithQuery,
}) => {
  // Form State
  const [merchantId] = useState('PAYTM_STAGE_MID_8819');
  const [category, setCategory] = useState<string>('MISSING_SETTLEMENT');
  const [expectedAmount, setExpectedAmount] = useState('6000.00');
  const [actualCredit, setActualCredit] = useState('9000.00');
  const [dateRange, setDateRange] = useState('2026-11-14 to 2026-11-15');
  const [transactionId, setTransactionId] = useState('ORD-8821');
  const [settlementId, setSettlementId] = useState('SETTL-20261114-01');
  const [utrReference, setUtrReference] = useState('UTR-HDFC-9912048');
  const [description, setDescription] = useState(
    'My ₹6,000 payment for Order #ORD-8821 was captured via Paytm UPI QR, but held from today\'s daily bank settlement batch.'
  );

  // Bank statement upload mock state
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  // Investigation Lifecycle State
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalateSuccess, setEscalateSuccess] = useState(false);

  const categories = [
    { id: 'MISSING_SETTLEMENT', label: 'Missing settlement', desc: 'Payment captured but entire payout missing' },
    { id: 'PARTIAL_SETTLEMENT', label: 'Partial settlement', desc: 'Received less amount than gross captures' },
    { id: 'DELAYED_SETTLEMENT', label: 'Delayed settlement', desc: 'Settlement cycle delayed past 07:00 AM' },
    { id: 'INCORRECT_AMOUNT', label: 'Incorrect settlement amount', desc: 'Unexpected variance between gross & net' },
    { id: 'UNKNOWN_DEDUCTION', label: 'Unknown deduction', desc: 'Unexplained fee, tax, or chargeback hold' },
  ];

  const loadingStages = [
    'Authenticating merchant tenant scope (PAYTM_STAGE_MID_8819)...',
    'Fetching captured transactions from Paytm Staging Gateway...',
    'Fetching daily settlement batch records & entries...',
    'Checking refund disputes, chargebacks, and MDR commission rates...',
    'Executing deterministic Python Decimal reconciliation engine...',
    'Synthesizing audit evidence report & provenance trail...',
  ];

  const handleStartInvestigation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsInvestigating(true);
    setErrorMsg(null);
    setReport(null);
    setEscalateSuccess(false);

    // Run visual stage stepper
    for (let i = 0; i < loadingStages.length; i++) {
      setActiveStage(i);
      await new Promise((r) => setTimeout(r, 450));
    }

    try {
      const res = await opsApi.investigateSettlement({
        complaint_category: category,
        expected_amount: parseFloat(expectedAmount) || 6000.0,
        actual_credited_amount: actualCredit ? parseFloat(actualCredit) : undefined,
        transaction_id: transactionId || undefined,
        settlement_id: settlementId || undefined,
        utr_reference: utrReference || undefined,
        complaint_description: description,
      });

      if (res.ok) {
        setReport(res.data);
      } else {
        setErrorMsg(res.error?.message || 'Investigation could not be completed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to Settlement Investigation engine.');
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleEscalateToSupervisor = async () => {
    if (!report) return;
    setIsEscalating(true);
    try {
      const res = await opsApi.escalateInvestigation(
        report.investigation_id,
        'Merchant requested priority supervisor review for unexplained settlement difference.'
      );
      if (res.ok) {
        setEscalateSuccess(true);
      }
    } catch (e) {
      console.error('Escalation failed:', e);
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-paytm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#E8F8FE] text-[#002970] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#00BAF2]/30 uppercase tracking-wide">
              Autonomous Operations
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-emerald-700 font-semibold text-xs font-mono">
              Deterministic Decimal Reconciler
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#002970] mt-1.5 flex items-center space-x-2.5">
            <Calculator className="w-6 h-6 text-[#00BAF2]" />
            <span>Settlement Investigation & Evidence Centre</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Let OpsSaathi investigate missing settlements and payment discrepancies using authorized records.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-slate-400 font-mono">Authenticated Merchant</p>
            <p className="text-xs font-bold text-[#002970]">Sharma Sweets & Chaat</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#002970] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            SS
          </div>
        </div>
      </div>

      {/* Main Container */}
      {!report && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-paytm p-6 sm:p-8">
          <form onSubmit={handleStartInvestigation} className="space-y-6">
            {/* Step 1: Category Selector */}
            <div>
              <label className="block text-xs font-bold text-[#002970] uppercase tracking-wider mb-2">
                1. Select Complaint Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      category === c.id
                        ? 'bg-[#E8F8FE] border-[#00BAF2] shadow-sm'
                        : 'bg-[#F8FAFC] border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#002970]">{c.label}</span>
                      {category === c.id && <CheckCircle2 className="w-4 h-4 text-[#00BAF2]" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Investigation Parameters */}
            <div>
              <label className="block text-xs font-bold text-[#002970] uppercase tracking-wider mb-2">
                2. Complaint & Settlement Parameters
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Merchant ID */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Merchant ID (Prefilled)
                  </label>
                  <input
                    type="text"
                    value={merchantId}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* Expected Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Expected Settlement Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    required
                    placeholder="e.g. 6000.00"
                    className="w-full bg-[#F4F7FB] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#002970] focus:outline-none focus:border-[#00BAF2]"
                  />
                </div>

                {/* Actual Bank Credit */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Actual Bank Credited Amount (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualCredit}
                    onChange={(e) => setActualCredit(e.target.value)}
                    placeholder="e.g. 9000.00"
                    className="w-full bg-[#F4F7FB] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#00BAF2]"
                  />
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Settlement Date Range
                  </label>
                  <input
                    type="text"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full bg-[#F4F7FB] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#00BAF2]"
                  />
                </div>

                {/* Transaction ID */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Order / Transaction ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. ORD-8821"
                    className="w-full bg-[#F4F7FB] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#00BAF2]"
                  />
                </div>

                {/* Settlement ID */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Settlement Batch Ref (Optional)
                  </label>
                  <input
                    type="text"
                    value={settlementId}
                    onChange={(e) => setSettlementId(e.target.value)}
                    placeholder="e.g. SETTL-20261114-01"
                    className="w-full bg-[#F4F7FB] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#00BAF2]"
                  />
                </div>

                {/* UTR Reference */}
                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Bank UTR / Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={utrReference}
                    onChange={(e) => setUtrReference(e.target.value)}
                    placeholder="e.g. UTR-HDFC-9912048"
                    className="w-full bg-[#F4F7FB] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#00BAF2]"
                  />
                </div>
              </div>
            </div>

            {/* Optional Redacted Bank Statement Upload Dropzone */}
            <div>
              <label className="block text-xs font-bold text-[#002970] uppercase tracking-wider mb-2">
                3. Optional Supporting Bank Statement (Redacted)
              </label>
              <div className="border-2 border-dashed border-slate-200 hover:border-[#00BAF2] rounded-2xl p-5 text-center transition-colors bg-[#F8FAFC]">
                <UploadCloud className="w-8 h-8 text-[#002970] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-700">
                  {uploadedFile || 'Drag and drop your redacted bank passbook/statement (PDF/PNG)'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Security Guarantee: Never upload passwords, PINs, or CVVs. Only credits and UTR are extracted.
                </p>
                <button
                  type="button"
                  onClick={() => setUploadedFile('HDFC_Bank_Statement_Nov15_Redacted.pdf')}
                  className="mt-3 text-xs font-bold text-[#002970] bg-[#E8F8FE] hover:bg-[#d8f2fd] px-3.5 py-1.5 rounded-full border border-[#00BAF2]/30 transition-all"
                >
                  {uploadedFile ? 'Statement Attached (HDFC_Redacted.pdf)' : 'Simulate Statement Upload'}
                </button>
              </div>
            </div>

            {/* Complaint Description */}
            <div>
              <label className="block text-xs font-bold text-[#002970] uppercase tracking-wider mb-1">
                4. Complaint Description & Specific Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe what occurred, customer payment details, or missing amounts..."
                className="w-full bg-[#F4F7FB] border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 focus:outline-none focus:border-[#00BAF2]"
              />
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Loading Stepper Animation */}
            {isInvestigating && (
              <div className="bg-[#002970] text-white p-5 rounded-3xl space-y-3 shadow-md animate-fade-in">
                <div className="flex items-center space-x-2.5">
                  <Bot className="w-5 h-5 text-[#00BAF2] animate-spin" />
                  <span className="font-bold text-sm text-[#00BAF2]">
                    OpsSaathi AI Multi-Agent LangGraph Workflow Executing...
                  </span>
                </div>
                <div className="space-y-1.5 text-xs font-mono text-sky-100 pl-2">
                  {loadingStages.map((stg, idx) => {
                    const isDone = idx < activeStage;
                    const isCurrent = idx === activeStage;
                    return (
                      <div key={idx} className="flex items-center space-x-2">
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <span className="w-3.5 h-3.5 flex items-center justify-center text-[#00BAF2] font-bold shrink-0">
                            ›
                          </span>
                        ) : (
                          <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-500 shrink-0">
                            •
                          </span>
                        )}
                        <span className={isCurrent ? 'text-white font-bold' : isDone ? 'text-emerald-200' : 'text-slate-400'}>
                          {stg}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="submit"
                disabled={isInvestigating}
                className="bg-[#002970] hover:bg-[#001d52] disabled:opacity-50 text-white font-bold px-8 py-3.5 rounded-full text-xs sm:text-sm flex items-center space-x-2 shadow-paytm transition-all cursor-pointer"
              >
                <span>Investigate Settlement</span>
                <ArrowRight className="w-4 h-4 text-[#00BAF2]" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Investigation Results Report Card */}
      {report && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Bar: Summary Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-paytm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="text-xs font-mono font-bold text-[#002970] bg-[#E8F8FE] px-3 py-1 rounded-full border border-[#00BAF2]/30">
                    Investigation #{report.investigation_id}
                  </span>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold font-mono ${
                      report.reconciliation.is_reconciled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {report.reconciliation.status}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-[#002970] mt-2">
                  Settlement Evidence & Audit Report
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tenant: <span className="font-semibold text-slate-800">{report.merchant_name}</span> •
                  Category: <span className="font-semibold text-slate-800">{report.complaint_category}</span> •
                  Date: <span className="font-mono text-slate-600">{new Date(report.created_at).toLocaleString()}</span>
                </p>
              </div>

              {/* Case Badge & Quick Routing */}
              {report.case_number && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center space-x-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      Support Case Created
                    </span>
                    <span className="font-bold text-[#002970] font-mono text-sm">
                      {report.case_number}
                    </span>
                  </div>
                  <button
                    onClick={() => onOpenConsole(report.case_id)}
                    className="bg-[#002970] hover:bg-[#001d52] text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center space-x-1"
                  >
                    <span>View in Ops Console</span>
                    <ExternalLink className="w-3 h-3 text-[#00BAF2]" />
                  </button>
                </div>
              )}
            </div>

            {/* AI Explanation Banner */}
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#E8F8FE] to-[#F0FAFF] border border-[#BCE8FC] text-slate-800 text-xs sm:text-sm leading-relaxed">
              <div className="flex items-center space-x-2 text-[#002970] font-bold text-xs uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-[#00BAF2]" />
                <span>OpsSaathi Verified AI Explanation</span>
              </div>
              <p className="text-slate-700">{report.ai_explanation}</p>
            </div>
          </div>

          {/* Financial Reconciliation Breakdown Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-paytm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#002970] flex items-center space-x-2">
                  <Calculator className="w-5 h-5 text-[#00BAF2]" />
                  <span>Deterministic Decimal Financial Reconciliation</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified using Python Decimal domain engine. Zero floating-point roundoff.
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-[#E8F8FE] text-[#002970] px-3 py-1 rounded-full border border-[#00BAF2]/30">
                INR Precision
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#F4F7FB] text-slate-600 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Reconciliation Ledger Component</th>
                    <th className="px-6 py-3.5 text-right">Amount (₹)</th>
                    <th className="px-6 py-3.5">Audit Evaluation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="px-6 py-3.5 font-sans font-medium">Successful Eligible Payments (+)</td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-700 font-sans">
                      ₹{report.reconciliation.eligible_payments}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-sans">Sum of verified captures</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 font-sans font-medium">Refund Deductions (-)</td>
                    <td className="px-6 py-3.5 text-right text-rose-700 font-sans font-semibold">
                      -₹{report.reconciliation.refund_deductions}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-sans">Customer refunds debited</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 font-sans font-medium">Chargeback Deductions (-)</td>
                    <td className="px-6 py-3.5 text-right text-rose-700 font-sans font-semibold">
                      -₹{report.reconciliation.chargeback_deductions}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-sans">Customer dispute holds</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 font-sans font-medium">Paytm Platform Commission (-)</td>
                    <td className="px-6 py-3.5 text-right text-slate-600 font-sans">
                      -₹{report.reconciliation.commission_deductions}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-sans">0% MDR for Paytm UPI QR</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 font-sans font-medium">Applicable Taxes (GST 18%) (-)</td>
                    <td className="px-6 py-3.5 text-right text-slate-600 font-sans">
                      -₹{report.reconciliation.tax_deductions}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-sans">Taxes on fees</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 font-sans font-medium">Other Adjustments (±)</td>
                    <td className="px-6 py-3.5 text-right text-slate-600 font-sans">
                      ₹{report.reconciliation.other_adjustments}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-sans">Manual adjustments</td>
                  </tr>
                  <tr className="bg-[#E8F8FE] font-bold text-[#002970]">
                    <td className="px-6 py-4 font-sans text-sm">Expected Net Settlement</td>
                    <td className="px-6 py-4 text-right text-base font-sans text-[#002970]">
                      ₹{report.reconciliation.expected_net}
                    </td>
                    <td className="px-6 py-4 text-xs font-sans">Calculated target disbursement</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-6 py-3.5 font-sans font-medium">Actual Bank Credit (Observed)</td>
                    <td className="px-6 py-3.5 text-right font-bold text-[#002970] font-sans">
                      ₹{report.reconciliation.actual_bank_credit}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-sans">Deposited into HDFC Bank ****4819</td>
                  </tr>
                  <tr className={report.reconciliation.is_reconciled ? 'bg-emerald-50 text-emerald-900 font-bold' : 'bg-rose-50 text-rose-900 font-bold'}>
                    <td className="px-6 py-4 font-sans text-sm">Settlement Difference / Discrepancy</td>
                    <td className="px-6 py-4 text-right text-base font-sans">
                      ₹{report.reconciliation.discrepancy_amount}
                    </td>
                    <td className="px-6 py-4 text-xs font-sans">
                      {report.reconciliation.is_reconciled ? 'Balanced 100%' : 'Missing amount pending release'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Python Calculation Trace Log */}
            {report.reconciliation.calculation_trace && (
              <div className="bg-[#002970] text-sky-100 p-4 text-xs font-mono border-t border-slate-800">
                <span className="text-sky-300 font-bold uppercase text-[10px] tracking-wider block mb-1">
                  Deterministic Domain Calculation Trace
                </span>
                <div className="space-y-1">
                  {report.reconciliation.calculation_trace.map((tr, idx) => (
                    <p key={idx} className="flex items-start space-x-1.5 opacity-90">
                      <span className="text-[#00BAF2]">›</span>
                      <span>{tr}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Evidence Sources & Timeline Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Evidence Sources */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-paytm">
              <h3 className="text-base font-bold text-[#002970] mb-3 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#00BAF2]" />
                <span>Verified Evidence Sources</span>
              </h3>

              <div className="space-y-3">
                {report.evidence_records.map((ev, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#002970]">{ev.description}</span>
                      <span className="text-[10px] font-mono font-bold bg-[#E8F8FE] text-[#002970] px-2 py-0.5 rounded-full border border-[#00BAF2]/30">
                        {ev.source_type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-500 font-mono text-[11px] pt-1">
                      <span>Ref: {ev.reference_id}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{ev.verification_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Chronological Evidence Timeline */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-paytm">
              <h3 className="text-base font-bold text-[#002970] mb-3 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#00BAF2]" />
                <span>Investigation Execution Timeline</span>
              </h3>

              <div className="space-y-3">
                {report.timeline.map((stg, idx) => (
                  <div key={idx} className="flex items-start space-x-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-[#E8F8FE] text-[#002970] font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-[#002970]">{stg.stage.replace(/_/g, ' ')}</p>
                      <p className="text-slate-600 mt-0.5 leading-snug">{stg.details}</p>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        {new Date(stg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer: Escalation & Controls */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-paytm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#002970]">Next Permitted Action:</p>
              <p className="text-xs text-slate-600 mt-0.5">{report.next_permitted_action}</p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setReport(null)}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                New Investigation
              </button>

              {!report.reconciliation.is_reconciled && !escalateSuccess && (
                <button
                  onClick={handleEscalateToSupervisor}
                  disabled={isEscalating}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-6 py-2.5 rounded-full text-xs shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isEscalating ? 'Escalating...' : 'Escalate to Supervisor'}</span>
                </button>
              )}

              {escalateSuccess && (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-4 py-2 rounded-full border border-emerald-300 flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Escalated to Settlement Operations</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
