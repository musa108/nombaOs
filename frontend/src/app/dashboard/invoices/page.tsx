'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreateInvoiceModal } from '@/components/chat/CreateInvoiceModal';
import { Plus, ExternalLink, Bell, CheckCircle2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#fbbf24',
  PAID: '#34d399',
  OVERDUE: '#f87171',
  CANCELLED: '#64748b',
};

const STATUS_FILTERS = ['ALL', 'PENDING', 'PAID', 'OVERDUE'];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await api.getInvoices(filter !== 'ALL' ? { status: filter } : {});
      setInvoices(result.invoices);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function markPaid(id: string) {
    setActionLoading(id);
    try {
      await api.markInvoicePaid(id);
      await load();
    } finally {
      setActionLoading(null);
    }
  }

  async function sendReminder(id: string) {
    setActionLoading(id);
    try {
      await api.sendInvoiceReminder(id);
      alert('Reminder sent!');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track and manage customer invoices</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#0A0B0F] transition hover:opacity-90"
          style={{ background: '#F7A825' }}>
          <Plus size={14} /> New Invoice
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition"
            style={{
              background: filter === s ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: filter === s ? '#fff' : '#64748b',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No invoices yet. Create your first one, or ask the AI assistant.
          </div>
        ) : (
          invoices.map((inv, i) => (
            <div key={inv.id} className="flex items-center gap-4 px-5 py-4"
              style={{
                background: '#12141A',
                borderBottom: i < invoices.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{inv.invoiceNo}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                    style={{ background: `${STATUS_COLORS[inv.status]}20`, color: STATUS_COLORS[inv.status] }}>
                    {inv.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {inv.customer?.name || 'Customer'} {inv.dueDate && `· Due ${formatDate(inv.dueDate)}`}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(inv.amount)}</p>
              <div className="flex items-center gap-1.5">
                {inv.nombaPaymentLink && (
                  <a href={inv.nombaPaymentLink} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white/5 transition" title="Payment link">
                    <ExternalLink size={14} className="text-slate-400" />
                  </a>
                )}
                {inv.status === 'PENDING' && (
                  <>
                    <button onClick={() => sendReminder(inv.id)} disabled={actionLoading === inv.id}
                      className="p-2 rounded-lg hover:bg-white/5 transition" title="Send reminder">
                      <Bell size={14} className="text-slate-400" />
                    </button>
                    <button onClick={() => markPaid(inv.id)} disabled={actionLoading === inv.id}
                      className="p-2 rounded-lg hover:bg-white/5 transition" title="Mark as paid">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <CreateInvoiceModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </div>
  );
}
