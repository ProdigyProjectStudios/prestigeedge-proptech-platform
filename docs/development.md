# PrestigeEdge · Development and review

## Requirements

- Node.js 22+ and npm.
- PostgreSQL reachable through the project's Neon serverless driver.
- An explicit `JWT_SECRET`.
- The Replit-managed Anthropic connection for live AI features.
- A Stripe test secret key: the current subscription module initializes at startup and requires `STRIPE_SECRET_KEY`, even when you are not exercising payments.

`DATABASE_URL` is mandatory at module initialization. Startup checks connectivity before serving requests. A blank database does not automatically receive a sample portfolio or administrator account.

## Install and configure

```bash
npm ci
cp .env.example .env
# Populate .env securely. Never commit it.
set -a
source .env
set +a
```

The current scripts do not automatically load `.env`. The commands above use a POSIX shell to export it before starting the application. In Replit, use project Secrets/environment configuration instead.

The environment template uses blank placeholders, not working credentials. For command-line use, enter values using shell-compatible quoting.

## Prepare development data

Review [shared/schema.ts](../shared/schema.ts) and configure a disposable development database:

```bash
npm run db:push
```

This uses Drizzle schema push, not a checked-in versioned migration history. Review its proposed changes. Do not run against production or client data as part of a documentation walkthrough.

There is no automated portfolio seed step in the active startup flow. Create fictional accounts and listings through the application's supported workflows; use `MNA-2047` for the included Deal Room scenario. Do not reuse credentials from older marketing or handover material.

## Run

```bash
npm run dev
```

Default port: `5000`. Routes:

| Path | Experience |
| --- | --- |
| `/` | Public property experience |
| `/property/:id` | Property details |
| `/login` | Account access |
| `/dashboard` | Authenticated buyer workspace |
| `/admin` | Role-controlled agency workspace |
| `/deal-room` | Standalone transaction demonstration |

No public production URL is asserted in this package. The workspace preview is not a published deployment URL.

## Environment reference

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Active runtime/Drizzle database connection; `NEON_DATABASE_URL` is not read as an automatic alias |
| `JWT_SECRET` | JWT signing; set explicitly rather than using the source fallback |
| `JWT_EXPIRES_IN` | Optional token lifetime; source default is seven days |
| `PORT`, `NODE_ENV` | Runtime port/environment |
| `FRONTEND_URL` | Production CORS origin |
| `APP_URL` | Application URL used by supporting services |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Managed Anthropic credential |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Managed Anthropic API base |
| `GOOGLE_MAPS_API_KEY` | Browser maps integration; restrict its origin/API permissions |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | SMTP configuration |
| `STRIPE_SECRET_KEY` | Required at startup by the current subscription module; use a test key for review |

`GITHUB_TOKEN` is repository-maintenance access, not an application requirement. Never include it in application templates, screenshots, logs, exports, or Git remotes.

## Build and review

```bash
npm run check
npm run build
npm start
```

`build` creates the Vite client and bundled Express entry point. Build success is separate from type-check success. Production requires valid database/configuration and suitable persistent media storage.

Uploads currently live under `uploads/` and are served from local disk. Do not assume ephemeral deployment filesystems preserve newly uploaded assets.

## Verification scope

See [the publication record](publication.md) for outcomes measured during repository preparation. No live AI request, paid-provider test, database mutation, or browser sign-in test is required simply to prepare documentation.
