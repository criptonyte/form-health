# Forum — GitHub Pages + your phone

The browser-only edition lives in `browser/` and builds into `docs/`. It uses browser-local IndexedDB and direct Withings requests, without a hosted backend or cloud database. The earlier Sites implementation elsewhere in this repository is separate from the Pages build.

## Build and publish

Install dependencies, then run:

```sh
node node_modules/typescript/bin/tsc --noEmit --project browser/tsconfig.json
node --experimental-strip-types --test browser-tests/*.test.mjs
node browser/build.mjs
```

Commit browser sources and generated `docs/` together. GitHub Pages uses main, `/docs`. Never commit health records, credentials, tokens, private data exports or vault backups.

## Local storage and installation

Open https://criptonyte.github.io/form-health/ in Chrome. Forum creates an encrypted local vault and remembers its non-extractable CryptoKey in IndexedDB, so it opens automatically on this browser. An older password-based vault requests its passphrase once for migration. The device screen lock protects everyday access; anyone using this browser can open Form. The UI has no backup, restore, CSV weight import, manual weight entry or water tracking. Existing water records remain compatible with storage; new water entry is disabled.

Clearing site data or switching browsers/devices removes access to local logs and Withings credentials. Measurements remain in Withings and can be imported again after reconnecting. Calories and water exist only in browser storage. Data is scoped to the browser origin, not the GitHub account; other Pages projects on this same origin share an origin boundary. Encryption does not protect against malicious code running on that origin.

The manifest has an explicit `/form-health/` identity, start URL and scope; its worker ignores sibling app paths. Install through Chrome’s Add to Home screen / Install app menu. After the first online load, the interface, bundled font and logs work offline. Sync requires internet. Withings synchronization runs while the app is open.

## Withings connection

1. Create a personal Withings developer app.
2. Set its callback to `https://criptonyte.github.io/form-health/oauth-callback.html`.
3. Enter your own Client ID and Client Secret in Forum’s Settings panel. They stay encrypted locally, never in repository files.
4. Connect and authorize measurement access (`user.metrics`) on Withings.
5. Sync the last 90 days. The scale must have uploaded readings to Withings first. Forum also syncs while open if its last sync is over an hour old.

The callback opens the remembered vault, validates expiring single-use state, exchanges the code directly with Withings and saves tokens before reporting success. It can complete without the original window or opener. Reopening Forum reads the connection; an existing instance also polls for completion. Wrong-browser storage, expiry, denied access and token errors receive explicit messages.

Requests use HTTPS POSTs, credentials omitted, and bearer tokens in the form body rather than URLs. There is no CORS proxy or shared developer secret. This is a personal bring-your-own-credentials design. Automated tests cover OAuth completion, state rejection, token refresh and measurement parsing; actual Withings authorization and Android behavior need owner-device verification.

## Reading the chart

The chart shows the last 90 calendar days. A compact Sync action sits beside the date and shows when Withings last synced. The latest weight and body fat percentage appear above the chart. Tap the chart or use the previous and next reading buttons to inspect a recorded day. Recent readings under the chart jump directly to one of the three preceding entries.

Weight dots are daily means; the line is a trailing seven-calendar-day mean. At least three measured days are needed for a smoothed value. Missing days are never interpolated; the line breaks across gaps longer than three days.

The UI does not present a calculated body-change verdict. The latest body fat value comes from the most recent available estimate and shows its own date, which may differ from the latest weight date.

Fraunces provides the `form.` wordmark; Inter is used for page, card and dialog headings, measurements, controls and small text. Both are bundled locally with their SIL OFL licences in `browser-public/fonts/` and precached offline. The Fraunces 1.0 Latin display subset fixes softness to 40, wonk to 1 and optical size to 48, retaining variable weights 300–700. The upstream font is from google/fonts (blob 8210f9488d3c732359a9292dd09aca3f2bae830e). There are no font-provider requests. The installed app uses the original `f.` monogram. `scripts/generate-form-icon.py` generates the SVG and both mask-safe PNG icons. The single Settings panel contains Withings and installation controls. The calorie journal shows today's total and entries, then compares the seven completed days before today with bars. Selecting any day shows its exact total or its empty state. The average uses days with entries. Desktop uses a main chart column with a separate journal column.

## Dates and calories

Timezone follows the device automatically. Withings timestamps are grouped into device-local dates; manual log dates are preserved. Calories need only an amount, with the local date and time prefilled and editable for historical logging. Manual logs are not restricted by the Withings 90-day display filter.

Calorie logging is always available, including for profiles that previously hid it. The journal shows logged intake and daily totals. Legacy preference and target fields remain readable for compatibility.

Notifications have been removed. The app never requests permission or posts weight or water notices. Cleanup on app load and service-worker activation dismisses existing Form notices without touching other apps or local records. Legacy preference fields are inert and remain readable for compatibility.
