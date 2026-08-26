# Dues

A simple, local-first tracker for money and things you **borrow** or **lend** — built with React Native, Expo and TypeScript. No account, no backend, no internet required.

```
Open app → pick a person → Borrowed/Lent → Money/Item → save.
Default currency is preselected; override it per entry if you like.
```

## Features

- **Money dues** — partial payments with full history; paid / remaining always derived from real records
- **Item dues** — optional quantity tracking (e.g. *5 books*) or status-based tracking (e.g. *laptop + charger*); quantity is never forced
- **All ISO 4217 fiat currencies** (~160) with correct symbols and decimal precision (`¥1,000`, `৳1,000.00`, `د.ك1.000`); ambiguous symbols disambiguated by code (`$100 USD`)
- **Per-entry currency freeze** — changing the default currency never rewrites existing dues
- **Dashboard grouped by currency** — BDT, USD, EUR totals are never merged; borrowed vs lent item counts by status
- **People** — reusable directory with search, per-person outstanding totals in every currency
- **Filters & sorting** — All/Borrowed/Lent/Money/Items/Active/Unpaid/Partially Paid/Partially Returned/Settled/Overdue/Archived; amounts are only compared within the same currency
- **Offline search** — person, item name, note, amount, currency code
- **Reminders** — daily / weekly / monthly / custom weekdays at any time, using local notifications only; reminders for multiple dues at the same time are merged into one grouped notification; scheduling fully rebuilds on every change so duplicates/orphans are impossible
- **Due dates & Overdue** — optional due dates; overdue state computed live and highlighted (never color-only: icon + label)
- **Archive** — hide settled dues without deleting them
- **Delete safety** — confirmation dialogs plus an Undo snackbar (soft-delete window); deleting a person cascades with an explicit warning
- **Backup & restore** — versioned JSON export via share sheet; import validates everything first and offers Merge or explicit Replace — never silent overwrite
- **Light / Dark / System theme** with a centralized design system

## Run it

```bash
npm install
npx expo start        # then press a | i, or scan with Expo Go
```

Other scripts: `npm run typecheck`.

## Data model

SQLite (via `expo-sqlite`) with `people → dues → payments / item_returns` foreign keys, a `categories` table, key-value `settings`, and a `reminder_registry` that mirrors every scheduled notification. Money is stored as **integer minor units** keyed to each currency's decimal digits — no floating point anywhere.

Statuses are derived, not stored: `paid = Σ payments ≥ total`, `returned = Σ returns ≥ quantity`, overdue = past date ∧ outstanding. The non-quantity item status is the only user-set status, expressed as history records.

## Project structure

```
src/
├── components/     UI primitives, sheets, DueCard…
├── screens/        dashboard · dues · people · settings screens
├── navigation/     bottom tabs + native stack
├── database/       db bootstrap, migrations, repositories
├── models/         pure business logic (money · items · status · aggregates · reminders)
├── services/       backup/export/import · validation · ids
├── notifications/  permissions · grouping · scheduler
├── context/        SettingsProvider · DataProvider
├── theme/          palettes · spacing · typography · ThemeModeProvider
├── constants/      full ISO 4217 dataset · default categories
└── types/ utils/
```

## Privacy

Everything stays on the device. Reminders use Expo local notifications only — no push tokens, no server. Back up regularly via **Settings → Data → Export**.

## Notes

- **Expo Go**: since SDK 53, Expo Go cannot deliver scheduled notifications on Android. The app detects Expo Go and disables reminders gracefully with an explanation — for working reminders use a development build:
  ```bash
  npx expo run:android   # or: npx expo run:ios
  ```
- Notification reminders require permission; if it's granted later, schedules reconcile automatically on next app open/change.
- On Windows, the Hermes compiler binary shipped inside `react-native/sdks/hermesc` may predate class-private-field support, so `expo export --no-bytecode` may be needed locally (the JS bundle itself builds fine). EAS/cloud builds are unaffected.
