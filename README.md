# Mikey Investment Command Center

Permanent dashboard: https://rkarpf81.github.io/mikey-investment-dashboard/

## Source layout

- `index.html` contains the page structure and controls.
- `styles.css` contains dashboard styling.
- `js/dashboard.js` manages holdings, goals, local storage, CSV import, backup, and price snapshots.
- `js/market-status.js` owns the market-hours display.
- `scripts/update_quotes.py` publishes the timestamped price snapshot in `quotes.json`.
- `.github/workflows/` contains browser checks, quote refresh, and version stamping.

## Data boundaries

This is a public static GitHub Pages app. It has no authenticated Fidelity connection and must not contain Fidelity credentials or account numbers. A Fidelity positions CSV can be imported in the browser; the file is not uploaded. Holdings and settings stay in that browser's local storage until exported or cleared.

Prices are best-effort Yahoo Finance data fetched through `yfinance`. The updater requests 15-minute bars when available and falls back to daily closes for funds or unavailable intraday data. Provider availability, delay, and data-use rights are not guaranteed. The snapshot schedule runs hourly during the U.S. trading-day UTC window.

## Checks and publishing

Pull requests run Playwright checks and attach screenshots. Visual candidates are uploaded for review but are not committed automatically. Keep the permanent GitHub Pages URL. Merge only after browser checks pass and the published build is verified.
