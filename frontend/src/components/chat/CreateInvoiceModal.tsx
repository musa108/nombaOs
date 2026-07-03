'use client';
import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Item { description: string; quantity: number; unitPrice: number; }

export function CreateInvoiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  function updateItem(idx: number, field: keyof Item, value: any) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  async function submit() {
    if (!customerName || total <= 0) return;
    setLoading(true);
    setError(null);
    try {
      await api.createInvoice({
        customerName,
        customerEmail: customerEmail || undefined,
        amount: total,
        items: items.filter(i => i.description),
        dueDate: dueDate || undefined,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: '#15171F', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold">New Invoice</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer Name *">
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Musa Enterprises" className="input" />
            </Field>
            <Field label="Email (optional)">
              <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                placeholder="customer@email.com" className="input" />
            </Field>
          </div>

          <Field label="Due Date (optional)">
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input" />
          </Field>

          <div>
            <label className="text-xs text-slate-400 mb-2 block">Items</label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                    placeholder="Item description" className="input flex-1" />
                  <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                    placeholder="Qty" className="input w-16" />
                  <input type="number" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                    placeholder="Price" className="input w-24" />
                  {items.length > 1 && (
                    <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-red-400 px-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }])}
              className="mt-2 flex items-center gap-1 text-xs text-[#F7A825] hover:underline">
              <Plus size={12} /> Add item
            </button>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: '#0E1016' }}>
            <span className="text-sm text-slate-400">Total</span>
            <span className="text-lg font-bold text-[#F7A825]">₦{total.toLocaleString()}</span>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button onClick={submit} disabled={loading || !customerName || total <= 0}
            className="w-full py-3 rounded-xl font-semibold text-[#0A0B0F] flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-40"
            style={{ background: '#F7A825' }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .input {
          background: #1A1D27;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          color: white;
          outline: none;
          width: 100%;
        }
        .input::placeholder { color: #64748b; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
