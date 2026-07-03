import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Required for self-hosted Docker deployments (frontend/Dockerfile)
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Replaces deprecated disableLogger — tree-shakes Sentry debug logging in prod
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
