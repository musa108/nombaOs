import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(247,168,37,0.08) 0%, #0A0B0F 60%)' }}>

      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
          style={{ background: '#F7A825', color: '#0A0B0F' }}>N</div>
        <span className="text-2xl font-semibold tracking-tight">NombaOS</span>
      </div>

      <h1 className="text-5xl md:text-6xl font-bold text-center max-w-2xl leading-tight mb-4">
        Your Business,{' '}
        <span style={{ color: '#F7A825' }}>Powered by AI</span>
      </h1>
      <p className="text-lg text-slate-400 text-center max-w-xl mb-10">
        Manage sales, send invoices, transfer money and get business insights — 
        all through natural conversation. No dashboards needed.
      </p>

      <div className="flex gap-4">
        <Link href="/sign-up"
          className="px-7 py-3 rounded-xl font-semibold text-[#0A0B0F] transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#F7A825' }}>
          Get Started Free
        </Link>
        <Link href="/sign-in"
          className="px-7 py-3 rounded-xl font-semibold border transition-all hover:bg-white/5"
          style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          Sign In
        </Link>
      </div>

      {/* Feature pills */}
      <div className="mt-16 flex flex-wrap gap-3 justify-center max-w-lg">
        {[
          '💬 Chat-driven', '₦ Nomba Payments', '📊 Live Analytics',
          '🧾 Auto Invoicing', '📦 Inventory', '🔔 Smart Alerts',
        ].map(f => (
          <span key={f} className="px-4 py-2 rounded-full text-sm text-slate-300"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {f}
          </span>
        ))}
      </div>
    </main>
  );
}
