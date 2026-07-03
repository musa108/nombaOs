'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

// Initialise once on the client — posthog-js is a singleton
if (typeof window !== 'undefined') {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (key && !posthog.__loaded) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
      // Capture page views automatically on route changes
      capture_pageview: true,
      capture_pageleave: true,
      // Session replay: 10% of sessions, 100% with errors (mirrors Sentry config)
      session_recording: {
        maskAllInputs: true,          // mask payment amounts, account numbers
        maskTextSelector: '[data-sensitive]', // opt-in mask for any sensitive element
      },
      // Disable in dev unless explicitly set
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.opt_out_capturing();
      },
    });
  }
}

/**
 * Identifies the current Clerk user in PostHog so events are tied to the
 * right merchant. Runs inside the provider so usePostHog() works.
 */
function PostHogIdentifier() {
  const { user, isLoaded } = useUser();
  const ph = usePostHog();

  useEffect(() => {
    if (!isLoaded || !user || !ph) return;

    ph.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName ?? user.firstName,
      createdAt: user.createdAt,
    });
  }, [isLoaded, user, ph]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogIdentifier />
      {children}
    </PHProvider>
  );
}

// Convenience hook — re-exported so pages don't import posthog-js directly
export { usePostHog as useAnalytics };
