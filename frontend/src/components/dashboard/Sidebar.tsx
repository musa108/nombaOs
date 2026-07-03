'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { api } from '@/lib/api';
import {
  MessageSquare, BarChart3, Receipt, Users,
  Package, Home, Bell,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/chat', label: 'AI Assistant', icon: MessageSquare, accent: true },
  { href: '/dashboard/transactions', label: 'Transactions', icon: BarChart3 },
  { href: '/dashboard/invoices', label: 'Invoices', icon: Receipt },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/products', label: 'Products', icon: Package },
];

export default function Sidebar({ business }: { business?: any }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.getUnreadCount()
      .then(n => setUnreadCount(typeof n === 'number' ? n : 0))
      .catch(() => {});
    const interval = setInterval(() => {
      api.getUnreadCount()
        .then(n => setUnreadCount(typeof n === 'number' ? n : 0))
        .catch(() => {});
    }, 60_000); // poll every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: '#0E1016', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: '#F7A825', color: '#0A0B0F' }}>N</div>
        <div>
          <div className="text-sm font-semibold leading-tight">NombaOS</div>
          {business && (
            <div className="text-xs text-slate-500 truncate max-w-[120px]">{business.businessName}</div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, accent }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? (accent ? 'rgba(247,168,37,0.12)' : 'rgba(255,255,255,0.07)') : 'transparent',
                color: active ? (accent ? '#F7A825' : '#E8E9ED') : '#64748b',
              }}>
              <Icon size={16} className={active && accent ? 'text-[#F7A825]' : ''} />
              {label}
              {label === 'AI Assistant' && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: 'rgba(247,168,37,0.2)', color: '#F7A825' }}>AI</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Notification bell */}
      <div className="px-4 pb-2">
        <button
          onClick={() => {
            api.markAllNotificationsRead().then(() => setUnreadCount(0)).catch(() => {});
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition relative">
          <Bell size={15} />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center"
              style={{ background: '#F7A825', color: '#0A0B0F' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 truncate">{business?.businessName || 'My Business'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
