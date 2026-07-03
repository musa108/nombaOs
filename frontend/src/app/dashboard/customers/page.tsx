'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, X, Loader2, Crown } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [all, top] = await Promise.all([
        api.getCustomers(search || undefined),
        api.getTopCustomers(),
      ]);
      setCustomers(all);
      setTopCustomers(top.slice(0, 5));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-slate-400 text-sm mt-0.5">{customers.length} total customers</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#0A0B0F] transition hover:opacity-90"
          style={{ background: '#F7A825' }}>
          <Plus size={14} /> Add Customer
        </button>
      </div>

      {/* Top customers */}
      {topCustomers.length > 0 && (
        <div className="mb-6 rounded-2xl p-5" style={{ background: '#12141A', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Crown size={14} className="text-[#F7A825]" />
            <h2 className="font-semibold text-sm">Top Customers</h2>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {topCustomers.map((c: any, i: number) => (
              <div key={c.id} className="rounded-xl p-3" style={{ background: '#0E1016' }}>
                <p className="text-xs text-slate-500 mb-1">#{i + 1}</p>
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-[#F7A825] font-semibold mt-1">
                  {formatCurrency(Number(c.total_spent || 0))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: '#12141A', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* List */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading…</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No customers found.</div>
        ) : (
          customers.map((c: any, i: number) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-4"
              style={{
                background: '#12141A',
                borderBottom: i < customers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: 'rgba(247,168,37,0.12)', color: '#F7A825' }}>
                {c.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-slate-500">{c.email || c.phone || 'No contact info'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{c._count?.transactions || 0} transactions</p>
                <p className="text-xs text-slate-500">{c._count?.invoices || 0} invoices</p>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && <AddCustomerModal onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  );
}

function AddCustomerModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name) return;
    setLoading(true);
    try {
      await api.createCustomer({ name, email: email || undefined, phone: phone || undefined });
      onAdded();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#15171F', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Add Customer</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Customer name *"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.08)' }} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.08)' }} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (optional)"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.08)' }} />
          <button onClick={submit} disabled={loading || !name}
            className="w-full py-2.5 rounded-xl font-semibold text-[#0A0B0F] flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-40"
            style={{ background: '#F7A825' }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            Add Customer
          </button>
        </div>
      </div>
    </div>
  );
}
