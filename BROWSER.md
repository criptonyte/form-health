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

Open https://criptonyte.github.io/form-health/ in Chrome. Form creates an encrypted local vault and remembers its non-extractable CryptoKey in IndexedDB, so it opens automatically on this browser. An older password-based vault requests its passphrase once for migration. The device screen lock protects everyday access; anyone using this browser can open Form. The UI has no backup, restore, CSV weight import or manual weight entry.

Clearing site data or switching browsers/devices removes access to local logs and Withings credentials. Measurements remain in Withings and can be imported again after reconnecting. Calories and water exist only in browser storage. Data is scoped to the browser origin, not the GitHub account; other Pages projects on this same origin share an origin boundary. Encryption does not protect against malicious code running on that origin.

The manifest has an explicit `/form-health/` identity, start URL and scope; its worker ignores sibling app paths. Install through Chrome’s Add to Home screen / Install app menu. After the first online load, the interface, bundled font and logs work offline. Sync requires internet. The app cannot guarantee background synchronization or pinned Android status icons.

## Withings connection

1. Create a personal Withings developer app.
2. Set its callback to `https://criptonyte.github.io/form-health/oauth-callback.html`.
3. Enter your own Client ID and Client Secret in Form’s Connections screen. They stay encrypted locally, never in repository files.
4. Connect and authorize measurement access (`user.metrics`) on Withings.
5. Sync the last 90 days. The scale must have uploaded readings to Withings first. Form also syncs while open if its last sync is over an hour old.

The callback opens the remembered vault, validates expiring single-use state, exchanges the code directly with Withings and saves tokens before reporting success. It can complete without the original window or opener. Reopening Form reads the connection; an existing instance also polls for completion. Wrong-browser storage, expiry, denied access and token errors receive explicit messages.

Requests use HTTPS POSTs, credentials omitted, and bearer tokens in the form body rather than URLs. There is no CORS proxy or shared developer secret. This is a personal bring-your-own-credentials design. Automated tests cover OAuth completion, state rejection, token refresh and measurement parsing; actual Withings authorization and Android behavior need owner-device verification.

## Reading the chart

Overview is the single body chart home, with calorie and water summaries below it. Weight and Body fat use underline tabs inside the chart, alongside fixed 30/60/90-day controls. No custom duration, daily-detail toggle or point-navigation row is shown.

Weight dots are daily means; the line is a trailing seven-calendar-day mean. Body-fat dots and the trailing 14-day line use medians to soften isolated spikes. At least three measured days are needed for a smoothed value. Missing days are never interpolated; weight lines break across gaps longer than three days, body-fat lines across gaps longer than seven days. Axes stay consistent between preset durations using the available 90-day history.

The compact period-change summary compares the first and last smoothing windows in the selected duration. Weight requires three measured days in each week; body fat requires seven in each fortnight. Insufficient coverage withholds the direction. Body-fat change uses percentage points (`pp`). This describes endpoint averages, not a regression or proof of fat loss. The small chart info control explains the active method.

Inter Latin variable 100–900 is bundled locally, with its SIL OFL licence, in `browser-public/fonts/` and precached offline. There are no font-provider requests. The drawer remains 246 CSS pixels, capped on narrower screens. Primary navigation is Overview, Calories and Water.

## Dates, calories and water

Timezone follows the device automatically. Withings timestamps are grouped into device-local dates; manual log dates are preserved. Calories need only an amount, with the local date and time prefilled and editable for historical logging. Manual logs are not restricted by the Withings 90-day display filter.

Preferences contains editable targets and an opt-in water notification. It uses silent replacement with a stable tag and a numeric millilitre badge. Android controls the final icon and dismissal; a pinned number is not guaranteed. Updates happen after logging or foreground day changes; no closed-app midnight reset is claimed. Tapping opens Water. Disabling closes the notice. Permission is requested only through an explicit user action.
