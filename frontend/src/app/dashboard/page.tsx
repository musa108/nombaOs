'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime, formatGrowth, getGrowthColor } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Users, Receipt,
  MessageSquare, ArrowRight, RefreshCw, Zap,
} from 'lucide-react';

function StatCard({ label, value, sub, trend, icon: Icon }: any) {
  const isPos = trend >= 0;
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: '#12141A', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1 text-white">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(247,168,37,0.1)' }}>
          <Icon size={16} className="text-[#F7A825]" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${getGrowthColor(trend)}`}>
          {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {formatGrowth(trend)} vs yesterday
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [dash, rev] = await Promise.all([
        api.getDashboard(),
        api.getRevenueAnalytics(),
      ]);
      setData(dash);
      setAnalytics(rev);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function syncNomba() {
    setSyncing(true);
    try {
      await api.syncNombaTransactions();
      await load();
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: '#12141A' }} />
        ))}
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Good morning, {data?.business?.businessName} 👋</h1>
          <p className="text-slate-400 text-sm mt-0.5">Here's your business overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={syncNomba} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5 disabled:opacity-50"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Nomba'}
          </button>
          <Link href="/dashboard/chat"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#0A0B0F] transition-all hover:opacity-90"
            style={{ background: '#F7A825' }}>
            <MessageSquare size={14} /> Ask AI
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(summary.todayRevenue || 0)}
          sub={`${summary.todayTransactions || 0} transactions`}
          trend={analytics?.growth?.daily}
          icon={TrendingUp}
        />
        <StatCard
          label="This Week"
          value={formatCurrency(summary.weekRevenue || 0)}
          sub={formatGrowth(analytics?.growth?.weekly || 0) + ' vs last week'}
          trend={analytics?.growth?.weekly}
          icon={Zap}
        />
        <StatCard
          label="Total Customers"
          value={summary.totalCustomers?.toLocaleString() || '0'}
          icon={Users}
        />
        <StatCard
          label="Pending Invoices"
          value={summary.pendingInvoices || '0'}
          sub="Awaiting payment"
          icon={Receipt}
        />
      </div>

      {/* Two-col: Recent Transactions + AI shortcut */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="col-span-2 rounded-2xl p-5"
          style={{ background: '#12141A', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Transactions</h2>
            <Link href="/dashboard/transactions" className="text-xs text-[#F7A825] flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {data?.recentTransactions?.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No transactions yet. <button onClick={syncNomba} className="text-[#F7A825] underline">Sync from Nomba</button>
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.recentTransactions || []).map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/3 transition">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      background: tx.type === 'CREDIT' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                      color: tx.type === 'CREDIT' ? '#34d399' : '#f87171',
                    }}>
                    {tx.type === 'CREDIT' ? '↓' : '↑'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description || tx.customer?.name || 'Transaction'}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(tx.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Chat CTA */}
        <div className="rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a1300 0%, #12141A 100%)', border: '1px solid rgba(247,168,37,0.2)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5"
            style={{ background: '#F7A825', transform: 'translate(30%, -30%)' }} />
          <div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(247,168,37,0.15)' }}>
              <MessageSquare size={18} className="text-[#F7A825]" />
            </div>
            <h3 className="font-semibold mb-2">Ask anything about your business</h3>
            <p className="text-sm text-slate-400">
              "Why are sales lower today?" or "Create invoice for ₦50,000"
            </p>
          </div>
          <Link href="/dashboard/chat"
            className="mt-6 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-[#0A0B0F] transition hover:opacity-90"
            style={{ background: '#F7A825' }}>
            Open AI Chat <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Month Revenue */}
      <div className="mt-4 rounded-2xl p-5"
        style={{ background: '#12141A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">This Month's Revenue</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(summary.monthRevenue || 0)}</p>
          </div>
          <div className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${getGrowthColor(analytics?.growth?.monthly || 0)}`}
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            {formatGrowth(analytics?.growth?.monthly || 0)} vs last month
          </div>
        </div>
      </div>
    </div>
  );
}
