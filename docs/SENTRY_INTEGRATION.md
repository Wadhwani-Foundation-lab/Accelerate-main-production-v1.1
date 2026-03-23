# Sentry Integration

Sentry is used for error monitoring and performance tracking across the Accelerate platform. Frontend and backend use **separate Sentry projects** for cleaner triage and alerting.

## Projects

| Project | Scope | DSN Project ID | Tracks |
|---------|-------|---------------|--------|
| `accelerate-dev-fe` | Frontend | `4511076123934720` | JS errors, UI crashes, browser performance |
| `accelerate-dev-be` | Backend | `4511052614991872` | API errors, server exceptions |

Sentry org: `o4508539300020224`

## Frontend (`@sentry/react`)

**Config**: `src/config/sentry.ts`

- DSN: `https://ad5d44af3844587d894637afe11c44e4@o4508539300020224.ingest.us.sentry.io/4511076123934720`
- Override via `VITE_SENTRY_DSN` env variable
- **Only enabled in production builds** (`import.meta.env.PROD`)
- Browser tracing integration enabled
- Trace sample rate: 20%

**User context**: Set automatically in `src/context/AuthContext.tsx`
- On login / session restore: `Sentry.setUser({ id, email, username })`
- On logout: `Sentry.setUser(null)`
- This means every error captured includes the affected user's identity

**Error boundary**: `src/components/ErrorBoundary.tsx` catches React rendering errors and reports them to Sentry.

## Backend (`@sentry/node`)

**Config**: `backend/src/config/sentry.ts`

- DSN: `https://dcc007455b48230eccfbc42371397f2c@o4508539300020224.ingest.us.sentry.io/4511052614991872`
- Override via `SENTRY_DSN` env variable
- **Enabled when `NODE_ENV !== 'development'`** (runs on deployed dev/prod servers)
- `sendDefaultPii: true` — captures IP addresses and request data

**Error handler**: `backend/src/middleware/errorHandler.ts` captures unhandled Express errors.

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SENTRY_DSN` | Frontend `.env` | Override frontend DSN (optional) |
| `SENTRY_DSN` | Backend `.env` | Override backend DSN (optional) |

## How It Works

1. Sentry SDK initializes on app startup
2. Errors are automatically captured (unhandled exceptions, rejected promises)
3. User context is attached after login so errors show who was affected
4. Data is sent to the appropriate Sentry project (frontend or backend)
5. View errors, performance, and user impact at https://sentry.io

## Future Improvements

- **Release tracking**: Tag builds with git SHA for regression detection
- **Source maps upload**: Upload during CI/CD build for readable frontend stack traces
- **Backend tracing**: Add `tracesSampleRate` and Express tracing integration
- **Alerts**: Configure Slack/email notifications for new or spiking errors
- **Separate prod projects**: Create `accelerate-prod-fe` and `accelerate-prod-be` to isolate prod monitoring from dev noise
