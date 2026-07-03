'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Next.js App Router global error page.
 * This file is required for @sentry/nextjs to capture unhandled client-side
 * errors that propagate to the root layout. Without it, React's error boundary
 * at the app root silently swallows errors before Sentry can capture them.
 *
 * See: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#react-render-errors-in-app-router
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#0A0B0F] text-white flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md px-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-4"
            style={{ background: '#F7A825', color: '#0A0B0F' }}>!</div>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-slate-400 text-sm mb-6">
            This error has been reported automatically. Try refreshing, or contact support if the issue persists.
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-[#0A0B0F] transition hover:opacity-90"
            style={{ background: '#F7A825' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
