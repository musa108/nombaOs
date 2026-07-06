'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSync } from '@/hooks/useAuthSync';
import { api } from '@/lib/api';

const INDUSTRIES = [
  'Retail', 'Food & Beverages', 'Fashion', 'Electronics',
  'Healthcare', 'Education', 'Logistics', 'Real Estate',
  'Agriculture', 'Beauty & Personal Care', 'Entertainment', 'Other',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { synced } = useAuthSync();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    industry: '',
    nombaAccountId: '',
  });

  async function handleSubmit() {
    if (!form.businessName || !form.industry) return;
    setLoading(true);
    try {
      await api.setupBusiness(form);
      router.push('/dashboard');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!synced) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#F7A825] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(247,168,37,0.06) 0%, #0A0B0F 60%)' }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-4"
            style={{ background: '#F7A825', color: '#0A0B0F' }}>N</div>
          <h1 className="text-2xl font-bold">Set up your business</h1>
          <p className="text-slate-400 mt-1">Let's get NombaOS configured for you</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: '#12141A', border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Business Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Business Name *</label>
            <input
              type="text"
              placeholder="e.g. Musa Enterprises"
              value={form.businessName}
              onChange={e => setForm({ ...form, businessName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 transition"
              style={{
                background: '#1A1D27',
                border: '1px solid rgba(255,255,255,0.08)',
                '--tw-ring-color': '#F7A825',
              } as any}
            />
          </div>

          {/* Industry */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Industry *</label>
            <div className="grid grid-cols-3 gap-2">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind}
                  onClick={() => setForm({ ...form, industry: ind })}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: form.industry === ind ? '#F7A825' : 'rgba(255,255,255,0.04)',
                    color: form.industry === ind ? '#0A0B0F' : '#94a3b8',
                    border: form.industry === ind ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  }}>
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Nomba Account (optional) */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nomba Account ID <span className="text-slate-500 font-normal">(optional — add later)</span>
            </label>
            <input
              type="text"
              placeholder="Your Nomba merchant account ID"
              value={form.nombaAccountId}
              onChange={e => setForm({ ...form, nombaAccountId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
              style={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !form.businessName || !form.industry}
            className="w-full py-3 rounded-xl font-semibold text-[#0A0B0F] transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#F7A825' }}>
            {loading ? 'Setting up…' : 'Launch NombaOS →'}
          </button>
        </div>
      </div>
    </div>
  );
}
