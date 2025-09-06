// Initializes Sentry only if VITE_SENTRY_DSN is provided and we're in production.
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const env = import.meta.env.MODE;
const isProd = env === 'production';

// Only initialize Sentry in production environment and if DSN is provided
if (dsn && isProd) {
  try {
    Sentry.init({
      dsn,
      integrations: [
        Sentry.browserTracingIntegration({
          // Disable automatic instrumentation that might be blocked
          traceFetch: false,
          traceXHR: false,
        }),
      ],
      tracesSampleRate: 0.1,
      tracePropagationTargets: [
        /^https:\/\/[a-zA-Z0-9.-]+\.blunari\.(ai|io|dev)/,
      ],
      environment: env,
      // Capture only errors, not performance data in case of ad blockers
      beforeSend(event, hint) {
        // If we're in development, don't send
        if (!isProd) {
          return null;
        }
        return event;
      },
    });
  } catch (error) {
    console.debug('Sentry initialization failed (likely blocked by ad blocker):', error);
    // Fail silently in production
  }
} else {
  console.debug('Sentry not initialized:', { dsn: !!dsn, env, isProd });
}

export {};
