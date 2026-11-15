import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Building2,
  AlertTriangle,
  Volume2,
  CalendarClock,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Clock,
  Bot,
  ExternalLink,
  ChevronRight,
  Sparkles,
  PhoneCall,
  DownloadCloud
} from 'lucide-react';
import { opsApi } from '../services/api';
import { Transaction, SettlementBatch, SupportCase } from '../types';

interface MerchantDashboardProps {
  onOpenChatWithQuery: (query: string) => void;
  onOpenConsole: () => void;
  onOpenInvestigation?: () => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  onOpenChatWithQuery,
  onOpenConsole,
  onOpenInvestigation,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settlements, setSettlements] = useState<SettlementBatch[]>([]);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [txnsRes, setsRes, casesRes] = await Promise.all([
        opsApi.getTransactions(),
        opsApi.getSettlements(),
        opsApi.listCases(),
      ]);

      if (txnsRes.ok) setTransactions(txnsRes.data);
      if (setsRes.ok) setSettlements(setsRes.data);
      if (casesRes.ok) setCases(casesRes.data);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const totalCaptured = transactions
    .filter((t) => t.status === 'SUCCESS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSettled = settlements.reduce((sum, s) => sum + Number(s.net), 0);
  const discrepancy = totalCaptured - totalSettled;

  return (
    <div className="space-y-6 pb-12">
      {/* Merchant Profile Banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-paytm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#002970] to-[#00BAF2] flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-[#002970]/10">
            SS
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-[#002970]">Sharma Sweets & Chaat</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Verified Paytm Merchant
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 font-mono">
              <span>MID: PAYTM_STAGE_MID_8819</span>
              <span>•</span>
              <span>Terminal: Soundbox 4G Pro</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">T+1 Daily Settlement Cycle</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (onOpenInvestigation) {
                onOpenInvestigation();
              } else {
                onOpenChatWithQuery(
                  'My ₹6,000 payment for Order #ORD-8821 is missing from today\'s settlement batch.'
                );
              }
            }}
            className="bg-[#00BAF2] hover:bg-[#00a3d4] text-[#002970] font-bold px-5 py-2.5 rounded-full text-xs sm:text-sm flex items-center space-x-2 shadow-sm transition-all"
          >
            <Bot className="w-4 h-4 text-[#002970]" />
            <span>Investigate Settlement</span>
          </button>
        </div>
      </div>

      {/* TOP SECTION: Left Operations Services Grid + Right Sky-Blue Hero Feature (Matching Paytm Website Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Services Card (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-paytm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#002970]">
                Merchant Operations & Payment Collection
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time Paytm for Business operations monitoring and ledger integrity
              </p>
            </div>
            <span className="text-[11px] font-mono bg-[#E8F8FE] text-[#002970] px-3 py-1 rounded-full font-bold">
              3 Live Captured Txns
            </span>
          </div>

          {/* Icon Service Row matching the Paytm website screenshot */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
            {/* Service 1 */}
            <div
              onClick={() => onOpenChatWithQuery('Show my payment capture summary for today.')}
              className="group p-3 rounded-2xl hover:bg-[#F4F7FB] transition-all cursor-pointer flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#E8F8FE] group-hover:bg-[#00BAF2] flex items-center justify-center text-[#002970] group-hover:text-white transition-all shadow-xs mb-2">
                <QrCode className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight">Paytm QR / UPI</span>
              <span className="text-[10px] text-slate-500 mt-0.5 font-mono">₹15,000 Capt.</span>
            </div>

            {/* Service 2 */}
            <div
              onClick={() => onOpenChatWithQuery('Show today\'s bank settlement batches.')}
              className="group p-3 rounded-2xl hover:bg-[#F4F7FB] transition-all cursor-pointer flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#E8F8FE] group-hover:bg-[#00BAF2] flex items-center justify-center text-[#002970] group-hover:text-white transition-all shadow-xs mb-2">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight">Settlement Batch</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 font-mono">₹9,000 Paid</span>
            </div>

            {/* Service 3: Discrepancy Highlight */}
            <div
              onClick={() => {
                if (onOpenInvestigation) {
                  onOpenInvestigation();
                } else {
                  onOpenChatWithQuery(
                    'Investigate the ₹6,000 discrepancy between captured payments and settlement batch.'
                  );
                }
              }}
              className="group p-3 rounded-2xl hover:bg-amber-50 transition-all cursor-pointer flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 group-hover:bg-amber-500 flex items-center justify-center text-amber-800 group-hover:text-white transition-all shadow-xs mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-amber-900 leading-tight">Discrepancy</span>
              <span className="text-[10px] text-amber-800 font-bold mt-0.5 font-mono">₹6,000 Held</span>
            </div>

            {/* Service 4 */}
            <div className="group p-3 rounded-2xl hover:bg-[#F4F7FB] transition-all cursor-pointer flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F8FE] group-hover:bg-[#00BAF2] flex items-center justify-center text-[#002970] group-hover:text-white transition-all shadow-xs mb-2">
                <Volume2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight">Soundbox 4G</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Voice Alerts ON</span>
            </div>

            {/* Service 5 */}
            <div
              onClick={onOpenConsole}
              className="group p-3 rounded-2xl hover:bg-[#F4F7FB] transition-all cursor-pointer flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#E8F8FE] group-hover:bg-[#00BAF2] flex items-center justify-center text-[#002970] group-hover:text-white transition-all shadow-xs mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight">OpsSaathi Cases</span>
              <span className="text-[10px] text-[#002970] font-semibold mt-0.5 font-mono">
                {cases.length} Tracked
              </span>
            </div>

            {/* Service 6 */}
            <div
              onClick={() => onOpenChatWithQuery('Explain how deterministic Decimal reconciliation works.')}
              className="group p-3 rounded-2xl hover:bg-[#F4F7FB] transition-all cursor-pointer flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#E8F8FE] group-hover:bg-[#00BAF2] flex items-center justify-center text-[#002970] group-hover:text-white transition-all shadow-xs mb-2">
                <CalendarClock className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight">Trust Verifier</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Fresh DB Read</span>
            </div>
          </div>
        </div>

        {/* Right Hero Feature Card (4 cols) matching the sky blue card in the screenshot */}
        <div className="lg:col-span-4 bg-gradient-to-br from-[#E8F8FE] to-[#D5F2FD] rounded-3xl p-6 border border-[#BCE8FC] shadow-paytm flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#002970] bg-white/70 px-2.5 py-1 rounded-full border border-[#00BAF2]/30">
              Discrepancy Investigation
            </span>
            <h3 className="text-xl font-extrabold text-[#002970] mt-3 leading-snug">
              Missing ₹6,000 in Today's Settlement?
            </h3>
            <p className="text-xs text-slate-700 mt-2 leading-relaxed">
              Order #ORD-8821 was successfully captured via Paytm UPI, but held from today's batch. OpsSaathi AI can coordinate with human supervisors to release your funds.
            </p>
          </div>

          <div className="mt-5 relative z-10">
            <button
              onClick={() =>
                onOpenChatWithQuery(
                  'My ₹6,000 payment for Order #ORD-8821 is missing from today\'s settlement batch.'
                )
              }
              className="bg-[#002970] hover:bg-[#001d52] text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-full flex items-center justify-center space-x-2 shadow-md transition-all w-full"
            >
              <span>Investigate with AI Brain</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Decorative background watermark */}
          <div className="absolute -bottom-8 -right-8 opacity-10 pointer-events-none">
            <QrCode className="w-44 h-44 text-[#002970]" />
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: Quick Action Strips (Matching the two horizontal pill strips in the screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strip 1: Settlement Issue */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#E8F8FE] flex items-center justify-center text-[#002970] shrink-0">
              <Bot className="w-6 h-6 text-[#00BAF2]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#002970]">
                Payment captured but settlement missing?
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Check discrepancy, audit evidence, and create a trackable case
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              onOpenChatWithQuery(
                'My ₹6,000 payment for Order #ORD-8821 is missing from today\'s settlement batch.'
              )
            }
            className="shrink-0 rounded-full border border-[#00BAF2] text-[#002970] hover:bg-[#E8F8FE] font-bold text-xs px-4 py-2 transition-all flex items-center space-x-1"
          >
            <span>Ask OpsSaathi</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#00BAF2]" />
          </button>
        </div>

        {/* Strip 2: Supervisor Approval */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#002970]">
                Supervisor approval required?
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Review Case OPS-2026-0001 to release ₹6,000 into the ledger
              </p>
            </div>
          </div>
          <button
            onClick={onOpenConsole}
            className="shrink-0 rounded-full border border-amber-500 text-amber-900 hover:bg-amber-50 font-bold text-xs px-4 py-2 transition-all flex items-center space-x-1"
          >
            <span>Review Case</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
          </button>
        </div>
      </div>

      {/* BOTTOM SECTION: 3 Pastel Promo Style Cards (Matching the 3 cards in the screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Light Peach / Yellow */}
        <div className="bg-[#FFF9F0] rounded-3xl p-6 border border-[#FFE7C4] shadow-paytm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-amber-900">
              <span className="uppercase tracking-wider">Paytm UPI Gross Volume</span>
              <CreditCard className="w-4 h-4 text-amber-700" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#002970] mt-3">
              ₹{totalCaptured.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              3 successful payment captures recorded today from customer QR scans.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-950 font-medium">
            <span>ORD-8819, ORD-8820, ORD-8821</span>
            <span className="font-bold text-[#002970]">100% Captured</span>
          </div>
        </div>

        {/* Card 2: Light Sky Blue */}
        <div className="bg-[#EBF5FE] rounded-3xl p-6 border border-[#CDE5FC] shadow-paytm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#002970]">
              <span className="uppercase tracking-wider">Settled Bank Batch</span>
              <TrendingUp className="w-4 h-4 text-[#00BAF2]" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#002970] mt-3">
              ₹{totalSettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              Batch BATCH-2026-1114-01 deposited into your merchant bank account.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-sky-200/60 flex items-center justify-between text-xs text-slate-700 font-medium">
            <span>ORD-8819 (₹5k), ORD-8820 (₹4k)</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">
              SYNTHETIC_DEMO
            </span>
          </div>
        </div>

        {/* Card 3: Light Coral / Lavender */}
        <div className="bg-[#FFF0F2] rounded-3xl p-6 border border-[#FED2D8] shadow-paytm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-rose-900">
              <span className="uppercase tracking-wider">Unsettled Discrepancy</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-700 mt-3">
              ₹{discrepancy.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              Order #ORD-8821 captured successfully but missing from settlement batch.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-rose-200/60 flex items-center justify-between">
            <span className="text-xs text-rose-900 font-bold">Action Required</span>
            <button
              onClick={() =>
                onOpenChatWithQuery(
                  'My ₹6,000 payment for Order #ORD-8821 is missing from today\'s settlement batch.'
                )
              }
              className="bg-[#002970] hover:bg-[#001d52] text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center space-x-1"
            >
              <span>Investigate</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* TODAY'S CAPTURED TRANSACTIONS: Clean Paytm Style Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-paytm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#002970]">
              Today's Captured Payments (Paytm UPI & QR)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized tenant records loaded from authenticated merchant scope
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-[#E8F8FE] text-[#002970] px-3 py-1 rounded-full">
            ₹15,000.00 Gross
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F7FB] text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Order ID</th>
                <th className="px-6 py-3.5">Paytm Transaction Ref</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Capture Status</th>
                <th className="px-6 py-3.5">Settlement State</th>
                <th className="px-6 py-3.5">Data Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {transactions.map((t) => {
                const isMissing = t.order_id === 'ORD-8821' && discrepancy > 0;
                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-[#F8FAFC] transition-colors ${
                      isMissing ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-bold text-[#002970]">{t.order_id}</td>
                    <td className="px-6 py-4 text-slate-500">{t.provider_txn_id}</td>
                    <td className="px-6 py-4 font-extrabold text-[#002970] font-sans text-sm">
                      ₹{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>SUCCESS</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isMissing ? (
                        <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>MISSING IN SETTLEMENT</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 bg-sky-100 text-sky-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          <span>SETTLED IN BATCH</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded">
                        {t.source_type}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
