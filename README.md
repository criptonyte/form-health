# Form — Personal health

A private, installable web application for weight analysis, food journaling and water tracking. Built with React, Vinext and Cloudflare D1. Hosted access uses Sign in with ChatGPT and owner-only Sites access.

## Features

- 30-, 60- and 90-day weight views; daily mean, trailing seven-calendar-day average, and weekly linear-regression trend across daily means.
- A clearly labelled demo preview, kept separate from saved records.
- Manual weight entries, food descriptions/calories and water logging. Entries and preferences persist server-side and are scoped to the authenticated user.
- Withings OAuth 2 authorization-code flow with expiring single-use state, least-privilege `user.metrics`, encrypted client credentials/tokens and rotating refresh tokens. Sync fetches a rolling 91-day buffer and the UI displays 90 calendar days.
- PWA manifest, app icons and an offline fallback. Private responses are not cached; this version requires internet for viewing and saving records. No background notifications.
- CSV export; manual entry removal; editable goals, targets and timezone.

## Withings setup

1. Open Connections inside Form and copy its callback URL (`<APP_ORIGIN>/api/withings/callback`).
2. Register a personal application at https://developer.withings.com/dashboard/ and enter the exact callback URL.
3. Enter the resulting Client ID and Client Secret into Form's private connection screen, then authorise access on Withings' website.
4. Form imports weight measurements after authorisation. Tap Sync any time; opening the app triggers a sync if the last successful sync was over an hour ago. There is no unattended/background sync in this version.

Withings account credentials and real-world OAuth need to be supplied and tested by the owner; no successful live connection is claimed before that step. Device readings must have reached Withings' cloud first.

## Runtime configuration

- D1 binding: `DB`; schema/migrations in `db/` and `drizzle/`.
- `APP_ORIGIN`: canonical HTTPS origin, used for OAuth callbacks.
- `APP_ENCRYPTION_KEY`: a server-only secret containing 64 hexadecimal characters (32 random bytes); AES-256-GCM protects Withings credentials and tokens. Keep this stable across deploys. Loss or replacement requires reconfiguring/reconnecting Withings.
- Never commit secrets or health records. Native Sites tools manage production runtime values.

Default targets (85 kg, 2,000 kcal and 2,500 ml) are editable tracking preferences, not personalised health recommendations. Weight changes do not establish body-fat changes or a calorie deficit.

## Development

Use the Sites skill helpers to install dependencies, preview, package and deploy. Run `node node_modules/typescript/bin/tsc --noEmit` for type checks and `node --experimental-strip-types --test tests/analysis.test.mjs` for analysis checks. Run `node --experimental-vm-modules --test tests/api.test.mjs` for database-backed API tests. Run `npm run db:generate` after schema edits; apply generated migrations to the local database before previewing API changes. Hosted migrations run during deployment.

Source code is stored in the private GitHub repository `criptonyte/form-health`. The live application, private access, database and runtime secrets remain hosted separately through Sites. No health records or credentials are stored in this repository.

## Verification

TypeScript checks, production build, six analysis tests, SQL migrations, and database-backed API tests for persistence, owner isolation, validation and cross-origin protection were verified locally. Browser QA was unavailable because the managed preview URL did not respond; no successful live Withings connection is claimed.
