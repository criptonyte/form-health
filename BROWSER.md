# Form — GitHub Pages + your phone

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

Open https://criptonyte.github.io/form-health/ in Chrome. Form creates an encrypted local vault and remembers its non-extractable CryptoKey in IndexedDB, so it opens automatically on this browser. An older password-based vault requests its passphrase once for migration. The device screen lock protects everyday access; anyone using this browser can open Form. The UI has no backup, restore, CSV weight import, manual weight entry or water tracking. Existing water records remain compatible with storage; new water entry is disabled.

Clearing site data or switching browsers/devices removes access to local logs and Withings credentials. Measurements remain in Withings and can be imported again after reconnecting. Calories and water exist only in browser storage. Data is scoped to the browser origin, not the GitHub account; other Pages projects on this same origin share an origin boundary. Encryption does not protect against malicious code running on that origin.

The manifest has an explicit `/form-health/` identity, start URL and scope; its worker ignores sibling app paths. Install through Chrome’s Add to Home screen / Install app menu. After the first online load, the interface, bundled font and logs work offline. Sync requires internet. Withings synchronization runs while the app is open.

## Withings connection

1. Create a personal Withings developer app.
2. Set its callback to `https://criptonyte.github.io/form-health/oauth-callback.html`.
3. Enter your own Client ID and Client Secret in Form’s Connections screen. They stay encrypted locally, never in repository files.
4. Connect and authorize measurement access (`user.metrics`) on Withings.
5. Sync the last 90 days. The scale must have uploaded readings to Withings first. Form also syncs while open if its last sync is over an hour old.

The callback opens the remembered vault, validates expiring single-use state, exchanges the code directly with Withings and saves tokens before reporting success. It can complete without the original window or opener. Reopening Form reads the connection; an existing instance also polls for completion. Wrong-browser storage, expiry, denied access and token errors receive explicit messages.

Requests use HTTPS POSTs, credentials omitted, and bearer tokens in the form body rather than URLs. There is no CORS proxy or shared developer secret. This is a personal bring-your-own-credentials design. Automated tests cover OAuth completion, state rejection, token refresh and measurement parsing; actual Withings authorization and Android behavior need owner-device verification.

## Reading the chart

Overview opens with a compact date line and one weight card, an optional calorie journal and three previous readings. The weight card keeps Sync and the 30/60/90-day controls in its title row; the latest weight and body fat percentage appear together above the chart. A new browser starts at 30 days and remembers the selected range locally. Dots are quieter in longer views. Tapping near a chart dot opens a compact reading strip with previous and next controls. Keyboard users can focus the chart and use arrow keys or Enter. Changing the period clears the selection.

Weight dots are daily means; the line is a trailing seven-calendar-day mean. At least three measured days are needed for a smoothed value. Missing days are never interpolated; the line breaks across gaps longer than three days. Axes stay consistent between preset durations using the available 90-day history.

The UI does not present a calculated body-change verdict. The latest body fat value comes from the most recent available estimate and shows its own date, which may differ from the latest weight date.

Fraunces provides the `form.` wordmark; Inter is used for page, card and dialog headings, measurements, controls and small text. Both are bundled locally with their SIL OFL licences in `browser-public/fonts/` and precached offline. The Fraunces 1.0 Latin display subset fixes softness to 40, wonk to 1 and optical size to 48, retaining variable weights 300–700. The upstream font is from google/fonts (blob 8210f9488d3c732359a9292dd09aca3f2bae830e). There are no font-provider requests. The installed app icon is a full-bleed `f.` monogram with the mark inside Android's mask-safe area; `scripts/generate-form-icon.py` creates both PNG sizes. A compact header labels Connection status, Install and Settings. There is one page with no sidebar or bottom tabs. The calorie journal shows today's entries and deletion controls, followed by read-only totals for the seven completed days before today. Days with no logs say "No entries" rather than zero calories. On phones today's entries scroll with the page; on desktop a long list scrolls within its card. Desktop uses a main chart column with a separate journal/readings rail. Main content has a maximum width instead of stretching across the screen.

## Dates and calories

Timezone follows the device automatically. Withings timestamps are grouped into device-local dates; manual log dates are preserved. Calories need only an amount, with the local date and time prefilled and editable for historical logging. Manual logs are not restricted by the Withings 90-day display filter.

Calorie logging is on by default, including for legacy profiles. Preferences can disable it completely: its summary, history and entry controls disappear, with previous entries retained. The API rejects new calorie entries while disabled. The journal shows logged intake without a target allowance, remaining-calorie calculation, progress bar or success/failure colors. Old target fields remain in storage only for compatibility.

Notifications have been removed. The app never requests permission or posts weight or water notices. Cleanup on app load and service-worker activation dismisses existing Form notices without touching other apps or local records. Legacy preference fields are inert and remain readable for compatibility.
