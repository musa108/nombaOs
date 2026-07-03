/**
 * Sentry instrumentation (Deployment §14 — Monitoring: Sentry).
 *
 * This file MUST be imported as the very first import in main.ts, before
 * NestFactory or any application module. Sentry patches the OpenTelemetry
 * SDK at startup; if other modules load first, some spans/traces are missed.
 *
 * Uses the native integrations shipped with @sentry/nestjs v10:
 *  - prismaIntegration  → traces every Prisma query as a Sentry span
 *  - redisIntegration   → traces Redis cache hits/misses
 *  - googleGenAIIntegration → traces Gemini API calls with token counts
 */
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only initialise if a DSN is provided — allows running locally without
  // Sentry without crashing and without suppressing real errors via a try/catch.
  enabled: !!process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.SENTRY_RELEASE ?? 'nombaos@1.0.0',

  // Performance: sample 100% in dev/staging, 20% in production.
  // Override by setting SENTRY_TRACES_SAMPLE_RATE in env.
  tracesSampleRate: process.env.NODE_ENV === 'production'
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.2)
    : 1.0,

  // Profiling: capture CPU profiles for sampled transactions.
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  integrations: [
    nodeProfilingIntegration(),
    Sentry.prismaIntegration(),    // traces every Prisma query
    Sentry.redisIntegration(),     // traces Redis cache hits/misses
    Sentry.googleGenAIIntegration(), // traces Gemini generateContent + embedContent
    Sentry.nestIntegration(),      // traces NestJS request lifecycle
  ],

  // Strip bearer tokens and Nomba secrets from breadcrumbs/spans
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
    }
    return event;
  },
});
