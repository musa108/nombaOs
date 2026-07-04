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

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? 'nombaos@1.0.0',
    tracesSampleRate:
      process.env.NODE_ENV === 'production'
        ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.2)
        : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.prismaIntegration(),
      Sentry.redisIntegration(),
      Sentry.googleGenAIIntegration(),
      Sentry.nestIntegration(),
    ],
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
      }
      return event;
    },
  });
}
