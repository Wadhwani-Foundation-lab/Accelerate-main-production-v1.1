import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || 'https://ad5d44af3844587d894637afe11c44e4@o4508539300020224.ingest.us.sentry.io/4511076123934720';

const isEnabled = import.meta.env.PROD;

if (isEnabled) {
    Sentry.init({
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE || 'production',
        integrations: [
            Sentry.browserTracingIntegration(),
        ],
        tracesSampleRate: 0.2,
    });
}

export { Sentry };
