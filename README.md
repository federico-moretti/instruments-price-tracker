# Thomann Price Check

Monitors Thomann wishlists for price and availability changes, stores history, and sends Discord notifications.

## Setup

1. Install dependencies:

   ```bash
   npm install
   npx playwright install chromium
   ```

2. Copy `.env.example` to `.env` and configure:

   - `WISHLISTS` — JSON array of wishlist URLs (preferred)
   - `WISHLIST_URL` — single wishlist URL (fallback)
   - `NOTIFICATION_WEBHOOK` — Discord webhook (optional)

## Usage

```bash
npm run check:local   # run locally with .env
npm test              # unit tests
npm run test:notify   # send a sample Discord notification
```

Notifications are sent daily with the full product list. Price and availability changes are highlighted in the message. History is recorded only when values change.

## CI

GitHub Actions runs daily at 08:00 UTC, executes the scraper, and commits updated `data/prices.json` and `data/history.jsonl`.

Required repository configuration:

- Variable: `WISHLISTS`
- Secret: `NOTIFICATION_WEBHOOK`
