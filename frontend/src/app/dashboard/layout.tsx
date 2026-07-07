'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuthSync } from '@/hooks/useAuthSync';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { synced, business } = useAuthSync();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!synced) return;
    setChecked(true);
    if (!business) {
      router.push('/onboarding');
    }
  }, [synced, business, router]);

  if (!synced || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#F7A825] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading NombaOS…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0B0F]">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar business={business} />
      </div>

      {/* Mobile layout */}
      <div className="flex-1 min-w-0">
        {/* Mobile top bar (hamburger will open the sidebar drawer) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: '#F7A825', color: '#0A0B0F' }}>N</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">NombaOS</div>
              {business && (
                <div className="text-xs text-slate-500 truncate max-w-[140px]">{business.businessName}</div>
              )}
            </div>
          </div>

          {/* Mobile sidebar drawer trigger */}
          <Sidebar business={business} mobile />
        </div>

        <main className="flex-1 min-h-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
