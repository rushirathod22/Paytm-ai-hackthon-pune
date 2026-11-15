import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Check,
  RotateCw,
  ArrowRight,
  UserCheck,
  FileCheck,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { opsApi } from '../services/api';
import { SupportCase, CaseDetail } from '../types';

interface OperationsConsoleProps {
  onSelectCase: (caseId: string) => void;
  selectedCaseId?: string | null;
  onTriggerCallback?: (event: any) => void;
  currentRole?: string;
}

export const OperationsConsole: React.FC<OperationsConsoleProps> = ({
  onSelectCase,
  selectedCaseId,
  onTriggerCallback,
  currentRole = 'SUPERVISOR',
}) => {
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [activeCase, setActiveCase] = useState<CaseDetail | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ passed: boolean; message: string } | null>(null);

  useEffect(() => {
    loadCases();
  }, [filter]);

  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetail(selectedCaseId);
    } else if (cases.length > 0 && !activeCase) {
      loadCaseDetail(cases[0].id);
    }
  }, [selectedCaseId, cases]);

  const loadCases = async () => {
    setIsLoading(true);
    try {
      const res = await opsApi.listCases(filter === 'ALL' ? undefined : filter);
      if (res.ok) {
        setCases(res.data);
      }
    } catch (e) {
      console.error('Error loading cases:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCaseDetail = async (id: string) => {
    try {
      const res = await opsApi.getCaseDetail(id);
      if (res.ok) {
        setActiveCase(res.data);
        setVerifyMessage(null);
      }
    } catch (e) {
      console.error('Error loading case detail:', e);
    }
  };

  const handleApprove = async () => {
    if (!activeCase) return;
    setActionLoading(true);
    try {
      const res = await opsApi.approveCase(activeCase.id, approvalNotes);
      if (res.ok) {
        setShowApprovalModal(false);
        setApprovalNotes('');
        await loadCaseDetail(activeCase.id);
        await loadCases();
      } else {
        alert(res.error?.message || 'Approval failed');
      }
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!activeCase) return;
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await opsApi.rejectCase(activeCase.id, reason);
      if (res.ok) {
        await loadCaseDetail(activeCase.id);
        await loadCases();
      }
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!activeCase) return;
    setActionLoading(true);
    setVerifyMessage(null);
    try {
      const res = await opsApi.verifyCase(activeCase.id);
      if (res.ok && res.data.verified) {
        setVerifyMessage({
          passed: true,
          message: res.data.reason || 'Verification Passed: Fresh ledger read confirmed settlement.',
        });
        await loadCaseDetail(activeCase.id);
        await loadCases();

        if (onTriggerCallback && res.data.callback_message) {
          onTriggerCallback({
            caseId: activeCase.id,
            caseNumber: res.data.case_number || activeCase.case_number,
            message: res.data.callback_message,
            audioBase64: res.data.callback_audio_base64,
            merchantPhone: res.data.merchant_phone || '+91 9545696585',
          });
        }
      } else {
        setVerifyMessage({
          passed: false,
          message:
            res.error?.message ||
            res.data?.reason ||
            'Verification Failed: Missing transactions remain uncredited in ledger.',
        });
        await loadCaseDetail(activeCase.id);
      }
    } catch (err: any) {
      setVerifyMessage({
        passed: false,
        message: `Verification check error: ${err.message}`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Console Top Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-paytm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#002970] flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-[#00BAF2]" />
            <span>Paytm Operations & Supervisor Console</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit case queues, review evidence, approve financial remediations, and execute independent verification.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 bg-[#F4F7FB] p-1.5 rounded-full border border-slate-200/80 overflow-x-auto">
          {['ALL', 'INVESTIGATING', 'AWAITING_APPROVAL', 'IN_PROGRESS', 'RESOLVED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filter === f
                  ? 'bg-[#002970] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Cases List vs Case Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-paytm p-5 h-[640px] flex flex-col">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <span className="text-xs font-bold text-[#002970] uppercase tracking-wider">
              Assigned Cases ({cases.length})
            </span>
            <button
              onClick={loadCases}
              className="text-slate-500 hover:text-[#002970] text-xs font-semibold flex items-center space-x-1"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1">
            {cases.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#002970]" />
                <p>No cases match the selected filter.</p>
              </div>
            ) : (
              cases.map((c) => {
                const isSelected = activeCase?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCase(c.id);
                      loadCaseDetail(c.id);
                    }}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#E8F8FE] border-[#00BAF2] shadow-sm'
                        : 'bg-[#F8FAFC] border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="font-mono text-[#002970]">{c.case_number}</span>
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${
                          c.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : c.status === 'AWAITING_APPROVAL'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-sky-100 text-[#002970] border border-sky-300'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 mt-2 font-medium line-clamp-2">
                      {c.summary}
                    </p>

                    <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500 font-mono">
                      <span>Queue: {c.queue}</span>
                      <span>Priority: {c.priority}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Case Detail & Actions (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-paytm p-6 h-[640px] flex flex-col overflow-y-auto">
          {activeCase ? (
            <div className="space-y-5">
              {/* Case Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-[#002970] font-mono">
                      {activeCase.case_number}
                    </span>
                    <span
                      className={`text-xs px-3 py-0.5 rounded-full font-mono font-bold ${
                        activeCase.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : activeCase.status === 'AWAITING_APPROVAL'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-sky-100 text-[#002970] border border-sky-300'
                      }`}
                    >
                      {activeCase.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Category: <span className="font-semibold text-slate-700">{activeCase.category}</span> •
                    Queue: <span className="font-semibold text-slate-700">{activeCase.queue}</span>
                  </p>
                </div>

                {/* Top Action Controls */}
                <div className="flex items-center space-x-2">
                  {activeCase.status !== 'RESOLVED' && (
                    <button
                      onClick={() => setShowApprovalModal(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-full text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Review & Authorize Remediation</span>
                    </button>
                  )}

                  {/* Independent Verify Button */}
                  <button
                    onClick={handleVerify}
                    disabled={actionLoading}
                    className="bg-[#002970] hover:bg-[#001d52] text-white px-4 py-2 rounded-full text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4 text-[#00BAF2]" />
                    <span>Run Independent Verification</span>
                  </button>
                </div>
              </div>

              {/* Supervisor 2-Step Action Guidance */}
              {activeCase.status !== 'RESOLVED' && (
                <div className="bg-sky-50 border border-sky-200/90 p-3 rounded-2xl flex items-center space-x-2.5 text-xs text-sky-950">
                  <Sparkles className="w-4 h-4 text-[#00BAF2] shrink-0" />
                  <p>
                    <strong className="text-[#002970]">Supervisor Workflow:</strong> Step 1: Click <strong className="text-amber-800">"Review & Authorize Remediation"</strong> to release missing ₹6,000 into the synthetic ledger &rarr; Step 2: Click <strong className="text-[#002970]">"Run Independent Verification"</strong> to confirm zero-trust database check & trigger outbound phone call to <strong>+91 9545696585</strong>.
                  </p>
                </div>
              )}

              {/* Verification Message Banner */}
              {verifyMessage && (
                <div
                  className={`p-4 rounded-2xl border flex items-start space-x-3 text-xs font-medium ${
                    verifyMessage.passed
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {verifyMessage.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold text-sm">
                      {verifyMessage.passed ? 'Independent Verification PASSED' : 'Verification FAILED'}
                    </p>
                    <p className="mt-0.5">{verifyMessage.message}</p>
                    {!verifyMessage.passed && activeCase.status !== 'RESOLVED' && (
                      <p className="mt-1 text-slate-700 font-semibold bg-white/70 p-1.5 rounded-lg border border-red-200">
                        👉 Action Required: Click <span className="text-amber-800 underline cursor-pointer" onClick={() => setShowApprovalModal(true)}>Review & Authorize Remediation</span> above to credit the missing transaction to the ledger first, then re-run verification.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Summary Description */}
              <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/80">
                <p className="text-xs text-[#002970] font-bold uppercase tracking-wider mb-1">
                  Investigation Summary
                </p>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {activeCase.summary}
                </p>
              </div>

              {/* Chronological Audit Timeline */}
              <div>
                <h3 className="text-xs font-bold text-[#002970] uppercase tracking-wider mb-3">
                  Chronological Case Timeline & Audit History
                </h3>

                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {activeCase.events.map((e, idx) => (
                    <div key={e.id || idx} className="relative flex items-start space-x-3 text-xs">
                      <div className="w-7 h-7 rounded-full bg-[#002970] text-white flex items-center justify-center shrink-0 z-10 text-[10px] font-bold">
                        {idx + 1}
                      </div>

                      <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span className="font-bold text-[#002970]">{e.actor}</span>
                          <span className="font-mono text-slate-400">
                            {new Date(e.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>

                        <p className="font-semibold text-slate-800 mt-1">
                          {e.event_type}:{' '}
                          {e.from_status && e.to_status ? (
                            <span className="font-mono text-[#00BAF2]">
                              {e.from_status} → {e.to_status}
                            </span>
                          ) : (
                            e.event_type
                          )}
                        </p>

                        {e.payload?.reason && (
                          <p className="text-slate-600 mt-1 italic">"{e.payload.reason}"</p>
                        )}
                        {e.payload?.note && (
                          <p className="text-slate-600 mt-1 italic">"{e.payload.note}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400 text-xs">
              <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#002970]" />
              <p>Select a case from the queue to view audit history and take action.</p>
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && activeCase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-[#002970] text-base">
                  Authorize Financial Remediation
                </h3>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 space-y-1">
              <p className="font-bold">Supervisor Authorization Gate</p>
              <p>
                Authorizing remediation will release ₹6,000.00 for Order #ORD-8821 into the synthetic settlement ledger.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supervisor Approval Notes (Required for Audit Trail)
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="e.g. Verified captured transaction with Paytm Staging gateway. Authorized synthetic batch credit."
                className="w-full bg-[#F4F7FB] border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#00BAF2] h-24"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 rounded-full text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200"
              >
                Reject Request
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[#002970] hover:bg-[#001d52] text-white shadow-xs"
              >
                Approve & Credit Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
