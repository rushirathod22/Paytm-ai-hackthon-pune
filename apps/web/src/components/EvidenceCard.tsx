import React from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Database,
  Radio,
  Wifi,
  Battery,
  Volume2,
  Clock,
  CreditCard,
  Building,
  RotateCcw,
  Smartphone
} from 'lucide-react';

interface EvidenceCardProps {
  evidence: {
    intent?: string;
    order_id_queried?: string;
    transactions_found?: number;
    data_source?: string;
    source_provenance?: string[];
    reconciliation?: {
      status: string;
      expected_net: string | number;
      observed_settlement: string | number;
      discrepancy_amount: string | number;
      calculation_trace?: string[];
      explanation?: string;
    };
    device?: {
      device_id: string;
      model: string;
      battery_level: string;
      battery_status: string;
      network_sim: string;
      signal_strength: string;
      speaker_status: string;
      firmware_version: string;
      last_audio_broadcast: string;
      iot_ping: string;
    };
    transaction?: {
      order_id: string;
      amount: string;
      status: string;
      payment_method: string;
      customer_vpa?: string;
      bank_rrn?: string;
      settlement_status: string;
      timestamp?: string;
    };
    refund?: {
      refund_id: string;
      order_id: string;
      amount: string;
      status: string;
      arn: string;
      refund_mode: string;
    };
    merchant_profile?: {
      mid: string;
      business: string;
      phone: string;
      settlement_cycle: string;
      settlement_bank: string;
    };
    batch?: {
      batch_id: string;
      settled_amount: string;
      bank_account: string;
      settlement_time: string;
      included_orders: string[];
      pending_orders?: string[];
    };
  };
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence }) => {
  // 1. RECONCILIATION EVIDENCE CARD (for SETTLEMENT_MISMATCH)
  if (evidence.reconciliation && evidence.intent === 'SETTLEMENT_MISMATCH') {
    const recon = evidence.reconciliation;
    const isDiscrepancy = Number(recon.discrepancy_amount) > 0;

    return (
      <div className="mt-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-slate-800">
        <div className="bg-[#F8FAFC] border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-[#E8F8FE] flex items-center justify-center text-[#002970]">
              <Calculator className="w-3.5 h-3.5 text-[#00BAF2]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#002970]">
              Deterministic Decimal Reconciliation
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
              {evidence.data_source || 'SYNTHETIC_DEMO'}
            </span>
            <span className="text-[10px] font-mono bg-[#E8F8FE] text-[#002970] border border-[#00BAF2]/30 px-2 py-0.5 rounded-full font-bold">
              PAYTM_STAGING
            </span>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white">
          <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Expected Net</p>
            <p className="text-lg font-extrabold text-[#002970] font-sans mt-0.5">
              ₹{Number(recon.expected_net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Sum of eligible captures</p>
          </div>

          <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Observed Settlement</p>
            <p className="text-lg font-extrabold text-[#002970] font-sans mt-0.5">
              ₹{Number(recon.observed_settlement).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Settled batch entries</p>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              isDiscrepancy
                ? 'bg-[#FFF0F2] border-[#FED2D8] text-rose-950'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <p className="text-xs font-bold flex items-center justify-between">
              <span>Discrepancy</span>
              {isDiscrepancy ? (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </p>
            <p className="text-lg font-extrabold text-rose-700 font-sans mt-0.5">
              ₹{Number(recon.discrepancy_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] opacity-80 mt-1">
              {isDiscrepancy ? 'Pending settlement release' : 'Balanced batch'}
            </p>
          </div>
        </div>

        {recon.calculation_trace && recon.calculation_trace.length > 0 && (
          <div className="bg-[#002970] text-sky-100 p-3.5 text-xs font-mono border-t border-slate-800">
            <div className="flex items-center space-x-1.5 text-sky-300 mb-1.5 text-[11px]">
              <Database className="w-3.5 h-3.5 text-[#00BAF2]" />
              <span className="font-bold tracking-wider uppercase">Python Decimal Domain Trace</span>
            </div>
            <ul className="space-y-1 text-[11px]">
              {recon.calculation_trace.map((trace, idx) => (
                <li key={idx} className="text-sky-100/90 flex items-start space-x-1.5">
                  <span className="text-[#00BAF2]">›</span>
                  <span>{trace}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // 2. SOUNDBOX / IOT DEVICE DIAGNOSTICS CARD (for QR_DEVICE_ISSUE)
  if (evidence.device) {
    const dev = evidence.device;
    return (
      <div className="mt-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-slate-800">
        <div className="bg-[#F8FAFC] border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-[#E8F8FE] flex items-center justify-center text-[#002970]">
              <Radio className="w-3.5 h-3.5 text-[#00BAF2] animate-pulse" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#002970]">
              Paytm Soundbox 4G • Live IoT Telemetry
            </span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
            IOT_ONLINE
          </span>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
              <Wifi className="w-3.5 h-3.5 text-[#00BAF2]" />
              <span className="font-medium text-[11px]">4G SIM Signal</span>
            </div>
            <p className="font-bold text-[#002970]">{dev.signal_strength}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{dev.network_sim}</p>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
              <Battery className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium text-[11px]">Battery</span>
            </div>
            <p className="font-bold text-emerald-700">{dev.battery_level}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{dev.battery_status}</p>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
              <Volume2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-medium text-[11px]">Speaker Audio</span>
            </div>
            <p className="font-bold text-slate-800">{dev.speaker_status}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Hardware OK</p>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span className="font-medium text-[11px]">Last Broadcast</span>
            </div>
            <p className="font-bold text-[#002970] text-[11px] truncate">{dev.last_audio_broadcast}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{dev.iot_ping}</p>
          </div>
        </div>

        <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Device ID: <strong className="font-mono text-slate-700">{dev.device_id}</strong></span>
          <span>Firmware: <strong className="font-mono text-slate-700">{dev.firmware_version}</strong></span>
        </div>
      </div>
    );
  }

  // 3. TRANSACTION DETAILS CARD (for PAYMENT_STATUS)
  if (evidence.transaction) {
    const txn = evidence.transaction;
    return (
      <div className="mt-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-slate-800">
        <div className="bg-[#F8FAFC] border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-[#E8F8FE] flex items-center justify-center text-[#002970]">
              <CreditCard className="w-3.5 h-3.5 text-[#00BAF2]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#002970]">
              Paytm Core Payment Verification
            </span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
            {txn.status}
          </span>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 font-medium text-[11px]">Order ID</p>
            <p className="font-extrabold text-[#002970] font-mono mt-0.5">{txn.order_id}</p>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 font-medium text-[11px]">Captured Amount</p>
            <p className="font-extrabold text-emerald-700 text-sm mt-0.5">{txn.amount}</p>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 font-medium text-[11px]">Payment Mode</p>
            <p className="font-bold text-slate-800 mt-0.5">{txn.payment_method}</p>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 font-medium text-[11px]">Settlement State</p>
            <p className={`font-bold mt-0.5 ${txn.settlement_status === 'SETTLED' ? 'text-emerald-700' : 'text-amber-800'}`}>
              {txn.settlement_status}
            </p>
          </div>
        </div>

        {txn.bank_rrn && (
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Bank RRN: {txn.bank_rrn}</span>
            <span>VPA: {txn.customer_vpa || 'customer@paytm'}</span>
          </div>
        )}
      </div>
    );
  }

  // 4. REFUND CARD (for REFUND_STATUS)
  if (evidence.refund) {
    const rfd = evidence.refund;
    return (
      <div className="mt-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-slate-800">
        <div className="bg-[#F8FAFC] border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-[#E8F8FE] flex items-center justify-center text-[#002970]">
              <RotateCcw className="w-3.5 h-3.5 text-[#00BAF2]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#002970]">
              Paytm Refund Audit Record
            </span>
          </div>
          <span className="text-[10px] font-mono bg-blue-50 text-blue-800 border border-blue-300 px-2 py-0.5 rounded-full font-bold">
            {rfd.status}
          </span>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3 bg-white text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-[11px]">Refund ID</p>
            <p className="font-mono font-bold text-[#002970] mt-0.5">{rfd.refund_id}</p>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-[11px]">Associated Order</p>
            <p className="font-mono font-bold text-slate-800 mt-0.5">{rfd.order_id}</p>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-[11px]">Amount</p>
            <p className="font-bold text-rose-700 mt-0.5">{rfd.amount}</p>
          </div>
        </div>
      </div>
    );
  }

  // 5. MERCHANT PROFILE & SETTLEMENT INFO (for OTHER)
  if (evidence.merchant_profile) {
    const mp = evidence.merchant_profile;
    return (
      <div className="mt-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-slate-800">
        <div className="bg-[#F8FAFC] border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-[#E8F8FE] flex items-center justify-center text-[#002970]">
              <Building className="w-3.5 h-3.5 text-[#00BAF2]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#002970]">
              Paytm Merchant Account & Payout Profile
            </span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
            ACTIVE_ACCOUNT
          </span>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-[11px]">Store Name</p>
            <p className="font-bold text-[#002970] mt-0.5">{mp.business}</p>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-[11px]">Registered Mobile</p>
            <p className="font-bold text-emerald-700 mt-0.5">{mp.phone}</p>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-[11px]">Payout Schedule</p>
            <p className="font-bold text-slate-800 mt-0.5">{mp.settlement_cycle}</p>
          </div>
        </div>
      </div>
    );
  }

  // 6. SETTLEMENT BATCH CARD (for batch inquiries)
  if (evidence.batch) {
    const b = evidence.batch;
    return (
      <div className="mt-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-slate-800">
        <div className="bg-[#F8FAFC] border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-[#E8F8FE] flex items-center justify-center text-[#002970]">
              <Building className="w-3.5 h-3.5 text-[#00BAF2]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#002970]">
              Paytm Bank Settlement Batch Record
            </span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
            BATCH_DEPOSITED
          </span>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-[11px]">Batch Number</p>
            <p className="font-mono font-bold text-[#002970] mt-0.5">{b.batch_id}</p>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-[11px]">Total Settled</p>
            <p className="font-extrabold text-emerald-700 text-sm mt-0.5">{b.settled_amount}</p>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-[11px]">Target Bank</p>
            <p className="font-bold text-slate-800 mt-0.5">{b.bank_account}</p>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-[11px]">Disbursement Time</p>
            <p className="font-bold text-slate-800 mt-0.5">{b.settlement_time}</p>
          </div>
        </div>
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-semibold">Included Orders:</span>
            <span className="font-mono text-emerald-700 font-bold">{b.included_orders.join(', ')}</span>
          </div>
          {b.pending_orders && b.pending_orders.length > 0 && (
            <div className="flex items-center space-x-1.5 text-amber-800">
              <span className="font-semibold">Unbatched:</span>
              <span className="font-mono font-bold bg-amber-100 px-2 py-0.5 rounded">{b.pending_orders.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
