'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { RefreshCw, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

const TYPE_FILTERS = ['ALL', 'CREDIT', 'DEBIT', 'TRANSFER'] as const;
const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

const TYPE_ICON: Record<string, any> = {
  CREDIT: ArrowDownLeft,
  DEBIT: ArrowUpRight,
  TRANSFER: ArrowLeftRight,
};
const TYPE_COLOR: Record<string, string> = {
  CREDIT: '#34d399',
  DEBIT: '#f87171',
  TRANSFER: '#60a5fa',
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [txResult, reportResult] = await Promise.all([
        api.getTransactions(filter !== 'ALL' ? { type: filter } : {}),
        api.getSalesReport(period),
      ]);
      setTransactions(txResult.transactions);
      setReport(reportResult);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, period]);

  async function sync() {
    setSyncing(true);
    try {
      await api.syncNombaTransactions();
      await load();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-slate-400 text-sm mt-0.5">All payments synced from Nomba</p>
        </div>
        <button onClick={sync} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync from Nomba'}
        </button>
      </div>

      {/* Period selector + report */}
      <div className="flex gap-2 mb-4">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition"
            style={{
              background: period === p.key ? '#F7A825' : 'rgba(255,255,255,0.04)',
              color: period === p.key ? '#0A0B0F' : '#94a3b8',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {report && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Mini label="Revenue" value={formatCurrency(report.revenue)} color="#34d399" />
          <Mini label="Expenses" value={formatCurrency(report.expenses)} color="#f87171" />
          <Mini label="Profit" value={formatCurrency(report.profit)} color="#F7A825" />
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-2 mb-4">
        {TYPE_FILTERS.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={{
              background: filter === t ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: filter === t ? '#fff' : '#64748b',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading…</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No transactions found. Try syncing from Nomba.
          </div>
        ) : (
          transactions.map((tx, i) => {
            const Icon = TYPE_ICON[tx.type] || ArrowDownLeft;
            const color = TYPE_COLOR[tx.type];
            return (
              <div key={tx.id || i} className="flex items-center gap-4 px-5 py-4"
                style={{
                  background: '#12141A',
                  borderBottom: i < transactions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}20` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {tx.description || tx.customer?.name || `${tx.type} Transaction`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(tx.createdAt)} · {tx.reference}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color }}>
                    {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <p className="text-xs text-slate-500">{tx.status}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#12141A', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
