import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { PostHogProvider } from '@/components/PostHogProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Auxo — AI Merchant Operating System',
  description: 'Manage your business through natural conversation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="bg-[#0A0B0F] text-white antialiased">
          {/* PostHogProvider must be inside ClerkProvider so it can access
              useUser() to identify the merchant in PostHog. It must be a
              Client Component wrapper around the server-rendered children. */}
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
