// Initializes Sentry only if VITE_SENTRY_DSN is provided and we're in production or staging.
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const env = import.meta.env.MODE;

if (dsn && (env === 'production' || env === 'staging')) {
  Sentry.init({
    dsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/[a-zA-Z0-9.-]+\.blunari\.(ai|io|dev)/,
      // Do NOT propagate tracing headers to Supabase Functions to avoid CORS preflight header requirements
      // /^https:\/\/.*\.(supabase)\.(co|io|in)/, // intentionally excluded
      /^https:\/\/.*\.(ingest\.sentry)\.(co|io|in)/,
    ],
    environment: env,
  });
}

export {};
