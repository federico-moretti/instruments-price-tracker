# Thomann Price Check

Monitors Thomann wishlists for price and availability changes, stores history, and sends notifications via Discord or Telegram.

## Setup

1. Install dependencies:

   ```bash
   npm install
   npx playwright install chromium
   ```

2. Copy `.env.example` to `.env` and configure:

   - `WISHLISTS` — JSON array of wishlist URLs (preferred)
   - `WISHLIST_URL` — single wishlist URL (fallback)
   - `NOTIFY_PROVIDER` — `discord` or `telegram` (optional)
   - `DISCORD_WEBHOOK_URL` — Discord webhook (required when provider is `discord`)
   - `TELEGRAM_BOT_TOKEN` — Telegram bot token (required when provider is `telegram`)
   - `TELEGRAM_CHAT_ID` — Telegram chat ID (required when provider is `telegram`)

## Usage

```bash
npm run check:local   # run locally with .env
npm test              # unit tests
npm run test:notify   # send a sample notification
```

Notifications are sent daily with the full product list. Price and availability changes are highlighted in the message. History is recorded only when values change.

## CI

GitHub Actions runs daily at 08:00 UTC, executes the scraper, and commits updated `data/prices.json` and `data/history.jsonl`.

Required repository configuration:

- Variable: `WISHLISTS`
- Variable: `NOTIFY_PROVIDER` (`discord` or `telegram`)
- Secret (Discord): `DISCORD_WEBHOOK_URL`
- Secrets (Telegram): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
