'use client';
import { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';

export function TransferConfirmModal({
  details,
  onClose,
  onConfirmed,
}: {
  details: { amount: number; beneficiaryAccountNumber: string; beneficiaryBankCode: string; narration: string };
  onClose: () => void;
  onConfirmed: (result: any) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.confirmTransfer(details);
      onConfirmed(result);
    } catch (e: any) {
      setError(e.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 fade-up"
        style={{ background: '#15171F', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(251,191,36,0.12)' }}>
              <AlertTriangle size={16} className="text-amber-400" />
            </div>
            <h3 className="font-semibold">Confirm Transfer</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl p-4 mb-4 space-y-2.5" style={{ background: '#0E1016' }}>
          <Row label="Amount" value={formatCurrency(details.amount)} highlight />
          <Row label="To Account" value={details.beneficiaryAccountNumber} />
          <Row label="Bank Code" value={details.beneficiaryBankCode} />
          <Row label="Narration" value={details.narration} />
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg text-xs text-red-400" style={{ background: 'rgba(248,113,113,0.1)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#0A0B0F] flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-60"
            style={{ background: '#F7A825' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? 'Processing…' : 'Confirm & Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-[#F7A825] text-base font-bold' : 'text-slate-200'}`}>
        {value}
      </span>
    </div>
  );
}
