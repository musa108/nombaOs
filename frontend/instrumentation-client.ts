import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 100% of traces in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay: capture 10% of sessions, 100% with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text/inputs to avoid capturing sensitive merchant data
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
});

// Required for Sentry to instrument client-side navigation in Next.js App Router
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
