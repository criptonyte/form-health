# Form — GitHub Pages + your phone

The browser-only edition lives in `browser/` and builds into `docs/`. It needs no hosted application backend, cloud database, API proxy or Android companion app. The earlier Sites backend remains in the repository as a separate implementation; it is not part of the Pages build.

## Build and publish

1. Install the repository dependencies with pnpm.
2. Run `node browser/build.mjs`.
3. Commit the browser sources and generated `docs/` files together.
4. In GitHub Settings → Pages, use **Deploy from a branch**, branch **main**, directory **/docs**.

On GitHub Free, Pages requires a public repository. Making this repository public exposes source code and its commit history; it does not publish the browser vault. Public publication needs the owner's explicit approval. The repository must never contain real health records, client credentials, access tokens or a vault backup.

## First use

Open the published HTTPS URL in Chrome on your Android phone. Create a local vault passphrase with at least ten characters. Keep the passphrase safe: there is no password-reset or cloud-recovery service. Install Form through Chrome's **Add to Home screen / Install app** menu if desired.

Records, preferences and Withings credentials/tokens are encrypted together with AES-256-GCM. The passphrase derives the non-extractable in-memory encryption key through PBKDF2-SHA-256 with 310,000 iterations and a random salt. IndexedDB stores only the encrypted envelope. Form requires the passphrase again after a reload, tab closure or manual lock. While unlocked, the app can access its plaintext records in memory. Encryption does not protect against malicious code running while the vault is unlocked; trust the code deployed from this repository.

Clearing browser site data, changing browser profiles, using a different browser/device, or losing the phone can remove access to the local records. Requesting persistent storage helps with browser eviction but is not a backup. Use **Backup & import → Save backup** regularly. Backups contain the encrypted vault, including any connection credentials; the same passphrase is needed to restore them. Restore explicitly replaces the target device's existing vault.

The data belongs to the browser origin, not a GitHub account. Other Pages projects under the same `username.github.io` origin share an origin boundary. The passphrase key is not put in localStorage or sessionStorage. Avoid untrusted scripts or other Pages apps on this origin.

## Withings connection

1. Create a personal application in the Withings developer dashboard.
2. Copy the exact callback URL from Form's **Connections** screen: the published Pages app directory followed by `oauth-callback.html`.
3. Enter your own Client ID and Client Secret into Form. They are encrypted in the local vault; never put them in source, GitHub settings or a public file.
4. Tap **Connect Withings**. Keep the original Form window open and unlocked while authorising the separate Withings login window. Allow the popup when Chrome asks.
5. Form exchanges the callback code directly with Withings and saves tokens in the vault. It requests only `user.metrics`.
6. Tap **Sync** to import the last 90 days of weight readings. Withings must already have received the readings from the scale. Opening/unlocking Form can also refresh the data if the last sync is over an hour old.

This uses a single-user, bring-your-own-developer-credentials design. It is not a general public-client OAuth design for distributing a shared secret to other users. The direct browser request path has been checked with deliberately invalid credentials: token and measurement responses were readable in Chrome. A real account's authorisation, token refresh, Android popup behaviour, and measurement sync still require end-to-end verification before live sync can be called proven. Withings can change its browser-access policies.

All token/data requests are HTTPS POSTs with `credentials: omit`; bearer tokens are in the form body, never in the URL. The current measurement endpoint recognises form-body access tokens. This avoids the Authorization-header CORS preflight, whose response does not explicitly list that header. No third-party CORS proxy is used. OAuth callback state is validated against the pending in-memory state. If Android closes the original window, reopen Form and start the connection again; no login context or secret is left in the callback page.

## Offline and imports

After one successful online installation of the service worker, the interface and hashed assets are cached for offline use. Withings requests are never cached. Entries, analysis and vault unlock work offline; syncing with Withings requires internet and an unlocked app. There is no guarantee of background sync or status-bar notifications.

Use **Backup & import → Import weight CSV** for a Withings CSV export. Extract the weight CSV if it is inside a ZIP archive. Select kg or lb explicitly; the importer validates units, previews counts, skips invalid/future rows, and avoids adding identical CSV readings twice. CSV import and live Withings sync use separate source IDs, so importing the same measurements by both methods can create duplicate measurements. Use one source for a given period.

## Verification

- Browser vault/API unit tests: `node --test browser-tests/*.test.mjs`.
- Original weight-analysis tests: `node --experimental-strip-types --test tests/analysis.test.mjs`.
- Browser-only type check: `node node_modules/typescript/bin/tsc --noEmit --jsx react-jsx --module esnext --moduleResolution bundler --target ES2022 --lib ES2023,DOM --esModuleInterop --skipLibCheck browser/ui.tsx browser/main.tsx browser/analysis.ts browser/modules.d.ts`.
- Production static build: `node browser/build.mjs`.

The internal HTTP preview cannot exercise Web Crypto vault operations: Chrome correctly requires a secure context. HTTPS Pages validation and real Withings account testing remain necessary. No browser protections should be disabled to work around the preview limit.

## Automatic opening update
The app now remembers a non-extractable AES CryptoKey in this browser’s IndexedDB, alongside the encrypted document. It opens directly on later visits; it no longer provides a separate passphrase barrier on this device. Protect access with the device screen lock. Existing passphrase-only vaults require the old passphrase once to retain their records, then remember the key. New installations create local storage automatically. Exported backups use a separate user-chosen password (10 characters minimum), and restored backups remember their key locally too. Clearing site data removes both the document and device key.

OAuth no longer treats a closed window proxy as cancellation: browser isolation can sever it during login. The callback retries its in-memory handoff and displays success only after token exchange and local persistence succeed. Keep the original app open and return promptly after approving Withings access. No callback code is persisted. Real account verification still requires the user’s Withings login.

## Body-trend display

Weight remains the initial metric. A separate body-fat view uses Withings fat-ratio percentages, including groups containing body fat without weight. Invalid or absent estimates stay absent; weight is never inferred from body fat. Existing saved records are retained. Manual weight creation is no longer available; food/water logging and optional CSV import remain.

The mobile body panel distinguishes the latest daily reading from a recent smoothed value. Weight uses daily means and a trailing seven-calendar-day mean; body fat uses daily medians and a trailing 14-calendar-day median. A smoothed point needs at least three measured days. Recent change compares the current seven/fourteen calendar days with the preceding equal period, requiring three measured days in each. This is a descriptive comparison, not a clinical confidence test. Body-fat changes use percentage points. BIA estimates can vary with hydration and measurement conditions; a median does not correct systematic measurement error. The product links to Withings' explanation.

Dots are observed days. Lines split when readings are more than three days apart for weight or seven days apart for body fat. Missing days are not filled. Chart y-limits use all available 90-day readings and remain consistent across 30/60/90-day views. Smoothing also uses preceding available history at the chart's left edge. The range does not change the calendar-anchored recent comparison. A point inspector, with previous/next buttons, distinguishes actual daily values from smoothed values. There is no longer a misleading “Trend line” toggle or a prominent whole-period regression rate.

Typography uses system sans-serif throughout. CSV export includes an explicit body-fat percentage column and correct units for body-fat-only records. `npm run test:browser` includes tests for calendar boundaries, data gaps, sparse comparisons, median behavior, fixed scales, missing/invalid fat values, and import/persistence compatibility.

## Install identity and bundled typography
Form's manifest ID is explicitly `/form-health/`, with the same start URL and scope. The previous `./` ID resolved against the start URL's origin, colliding with Currency Converter's older root identity. Currency Converter is unchanged. Form's worker also ignores sibling paths. Android installation still needs verification on the owner's phone; no site-data clearing is required for this fix.

Inter Latin variable 100–900 (Fontsource package 5.3.0, SIL OFL) is shipped in `browser-public/fonts/`, including its licence. CSS and preload reference the local file only; the worker precaches it for offline use. There are no runtime font-provider calls. The chart now contains its measurement selector, period controls and summary in one card. The mobile drawer is back to 246 CSS pixels, capped on narrower screens.

## Coverage guardrails
Body-fat recent comparisons now require seven measured days in each 14-day period. The descriptive median can still be shown from three days, labelled limited coverage; it does not produce a direction headline until both periods pass the coverage rule. Weight comparisons keep the three-days-per-week rule. Missing previous periods are named explicitly, with current and previous counts. These are transparent display rules rather than statistical or clinical confidence thresholds.

A reported Android Chromium defect (issue 572287931, duplicate of 568841400) can still prevent installing a second PWA under the same origin even with distinct manifest IDs. The install help explains this limitation and offers Samsung Internet as an unverified alternative. Browser-local data and connections do not transfer automatically: export an encrypted backup before changing browsers. No origin migration or deletion is performed.
