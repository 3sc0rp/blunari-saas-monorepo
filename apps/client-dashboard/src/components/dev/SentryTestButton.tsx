import React from 'react';

export default function SentryTestButton() {
  if (!import.meta.env.DEV) return null;
  return (
    <button
      onClick={() => {
        // Intentional error to test Sentry capture
        throw new Error('Sentry test error: manual trigger');
      }}
      className="px-3 py-2 rounded bg-red-100 text-red-700 border border-red-300"
    >
      Trigger Sentry Error
    </button>
  );
}
