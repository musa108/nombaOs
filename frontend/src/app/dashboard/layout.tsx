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
          <p className="text-sm text-slate-500">Loading Auxo…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar business={business} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
