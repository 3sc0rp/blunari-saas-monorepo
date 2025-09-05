// Sentry initialization for client app
// Initializes only if VITE_SENTRY_DSN is provided
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

// Map build-time metadata (defined in vite.config.ts)
declare const __APP_VERSION__: string;
declare const __COMMIT_HASH__: string;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `${__APP_VERSION__}@${__COMMIT_HASH__}`,
    // Keep minimal setup as per screenshot (Error Monitoring only)
    // You can enable performance or session replay later.
    // tracesSampleRate: 0.1,
    // replaysSessionSampleRate: 0.0,
    // replaysOnErrorSampleRate: 0.0,
    // Optionally include PII if desired: sendDefaultPii: false,
    beforeSend(event) {
      // Example: redact large contexts
      if (event.request && event.request.headers) {
        delete (event.request.headers as Record<string, unknown>)['authorization'];
      }
      return event;
    },
  });
}

export { Sentry };
