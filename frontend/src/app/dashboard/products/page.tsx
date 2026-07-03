'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Plus, X, Loader2, AlertTriangle, Package } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'lowStock'>('all');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [list, inv] = await Promise.all([
        api.getProducts(filter === 'lowStock' ? { lowStock: true } : {}),
        api.getInventorySummary(),
      ]);
      setProducts(list);
      setSummary(inv);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage inventory and stock levels</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#0A0B0F] transition hover:opacity-90"
          style={{ background: '#F7A825' }}>
          <Plus size={14} /> Add Product
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Mini label="Total Products" value={summary.totalProducts} />
          <Mini label="Inventory Value" value={formatCurrency(summary.totalInventoryValue)} color="#F7A825" />
          <Mini label="Low Stock" value={summary.lowStockCount} color="#fbbf24" />
          <Mini label="Out of Stock" value={summary.outOfStockCount} color="#f87171" />
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {(['all', 'lowStock'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
            style={{
              background: filter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: filter === f ? '#fff' : '#64748b',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
            {f === 'lowStock' && <AlertTriangle size={11} />}
            {f === 'all' ? 'All Products' : 'Low Stock'}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading…</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Package size={28} className="mx-auto mb-2 opacity-40" />
            No products found.
          </div>
        ) : (
          products.map((p: any, i: number) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4"
              style={{
                background: '#12141A',
                borderBottom: i < products.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-slate-500">{p.category || 'Uncategorized'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(Number(p.price))}</p>
                <p className={`text-xs ${p.quantity < 10 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {p.quantity} in stock {p.quantity < 10 && '⚠️'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#12141A', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color: color || '#fff' }}>{value}</p>
    </div>
  );
}

function AddProductModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name || price <= 0) return;
    setLoading(true);
    try {
      await api.createProduct({ name, category: category || undefined, quantity, price });
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
          <h3 className="font-semibold">Add Product</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Product name *"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.08)' }} />
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.08)' }} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} placeholder="Quantity"
              className="px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.08)' }} />
            <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} placeholder="Price (₦) *"
              className="px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
          <button onClick={submit} disabled={loading || !name || price <= 0}
            className="w-full py-2.5 rounded-xl font-semibold text-[#0A0B0F] flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-40"
            style={{ background: '#F7A825' }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            Add Product
          </button>
        </div>
      </div>
    </div>
  );
}
