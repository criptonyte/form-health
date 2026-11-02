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

Overview is the single body chart home, with an optional calorie journal card and recent weigh-ins. Weight and Body fat use segmented controls inside the chart, alongside matching fixed 30/60/90-day controls. No custom duration, daily-detail toggle or point-navigation row is shown.

Weight dots are daily means; the line is a trailing seven-calendar-day mean. Body-fat dots and the trailing 14-day line use medians to soften isolated spikes. At least three measured days are needed for a smoothed value. Missing days are never interpolated; weight lines break across gaps longer than three days, body-fat lines across gaps longer than seven days. Axes stay consistent between preset durations using the available 90-day history.

The compact period-change summary compares the first and last smoothing windows in the selected duration. Weight requires three measured days in each week; body fat requires seven in each fortnight. Insufficient coverage withholds the direction. Body-fat change uses percentage points (`pp`). This describes endpoint averages, not a regression or proof of fat loss. The small chart info control explains the active method.

Inter Latin variable 100–900 is bundled locally, with its SIL OFL licence, in `browser-public/fonts/` and precached offline. There are no font-provider requests. The drawer remains 246 CSS pixels, capped on narrower screens. Primary navigation is Overview and optional Calories. Desktop uses a main chart column with a separate journal/readings rail; at larger widths the latest reading, smoothed value and change share one summary row. Main content has a maximum width instead of stretching across the screen.

## Dates, calories and notifications

Timezone follows the device automatically. Withings timestamps are grouped into device-local dates; manual log dates are preserved. Calories need only an amount, with the local date and time prefilled and editable for historical logging. Manual logs are not restricted by the Withings 90-day display filter.

Calorie logging is on by default, including for legacy profiles. Preferences can disable it completely: its navigation, summary and entry controls disappear, with previous entries retained. The API rejects new calorie entries while disabled. The journal shows logged intake without a target allowance, remaining-calorie calculation, progress bar or success/failure colors. Old target fields remain in storage only for compatibility.

Preferences offers an opt-in **latest weight notification**, independent of calorie logging. It uses the latest individual, real Withings weight reading, not sample data, a daily average, body fat or calories. The notification gives the value in kg and its measurement date, without trend judgments. A monochrome numeric badge attempts to show the one-decimal weight in Android’s status bar. The OS/browser controls rendering, grouping and dismissal. A web app cannot show only a status-bar icon without its notification, force Samsung’s filtering settings or guarantee an ongoing/non-dismissible notice.

Updates are silent with a stable tag. A persisted reading key avoids re-posting the same reading after it has been dismissed; a new or corrected latest reading can replace it. **Show again** explicitly resets this marker. Disabling closes Form’s weight notice. The previous Form water notice is also closed when the app next runs with notification permission. There is no background Withings sync; the weight updates when Form syncs while open. Permission is requested only by a direct user action. Actual Samsung icon rendering needs a phone check.
