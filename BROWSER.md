# Forum calorie tracker

The [GitHub Pages app](https://criptonyte.github.io/form-health/) opens directly to the calorie journal. The journal shows today's total, a seven-day chart and today's entries. Select a bar to see that date's total. The weekly average uses earlier days with entries. Log an amount in kcal and adjust the prefilled date and time to add a past entry. Deleting an entry offers Undo.

## Local storage and installation

Use the same browser and app URL to keep your existing entries. Forum opens the existing encrypted IndexedDB vault using the key remembered on this device. An older passphrase-protected vault asks for the passphrase once. Legacy records remain encrypted in the vault. Anyone using this browser can open the journal, so everyday access relies on your device screen lock.

In Chrome, choose **Install app** on the website or use **Add to Home screen** from Chrome's menu. The installed app keeps its existing identity and works offline after the first online load. If an **Update available** banner appears, tap **Refresh**. Clearing site data or switching browsers or devices removes access to your local entries. Calendar dates and times follow the device.

## Build and publish

Install dependencies and run:

```sh
pnpm check:browser
pnpm test:browser
pnpm build:browser
```

Commit the browser sources and generated `docs/` together. GitHub Pages publishes from `main`, directory `/docs`. Keep health records, credentials and private exports out of Git.
