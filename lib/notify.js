import { formatPrice } from './storage.js';

const TELEGRAM_MAX_LENGTH = 4096;

export function splitTelegramMessage(message) {
  if (message.length <= TELEGRAM_MAX_LENGTH) {
    return [message];
  }

  const chunks = [];
  let remaining = message;

  while (remaining.length > TELEGRAM_MAX_LENGTH) {
    let splitAt = remaining.lastIndexOf('\n', TELEGRAM_MAX_LENGTH);

    if (splitAt <= 0) {
      splitAt = TELEGRAM_MAX_LENGTH;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).replace(/^\n/, '');
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

function getNotifyProvider() {
  const provider = process.env.NOTIFY_PROVIDER;

  if (typeof provider !== 'string' || provider.length === 0) {
    return null;
  }

  return provider;
}

async function sendDiscordMessage(message) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (typeof webhookUrl !== 'string' || webhookUrl.length === 0) {
    console.warn('DISCORD_WEBHOOK_URL is not set; skipping notification');
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });

  if (response.ok === false) {
    throw new Error(`Discord webhook failed with status ${response.status}`);
  }
}

async function sendTelegramMessage(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (typeof token !== 'string' || token.length === 0) {
    console.warn('TELEGRAM_BOT_TOKEN is not set; skipping notification');
    return;
  }

  if (typeof chatId !== 'string' || chatId.length === 0) {
    console.warn('TELEGRAM_CHAT_ID is not set; skipping notification');
    return;
  }

  const chunks = splitTelegramMessage(message);
  const apiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

  for (const chunk of chunks) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: chunk }),
    });

    if (response.ok === false) {
      throw new Error(`Telegram API failed with status ${response.status}`);
    }
  }
}

async function sendMessage(message) {
  const provider = getNotifyProvider();

  if (provider === null) {
    console.warn('NOTIFY_PROVIDER is not set; skipping notification');
    return;
  }

  if (provider === 'console') {
    console.log(message);
    return;
  }

  if (provider === 'discord') {
    await sendDiscordMessage(message);
    return;
  }

  if (provider === 'telegram') {
    await sendTelegramMessage(message);
    return;
  }

  console.warn(`Unknown NOTIFY_PROVIDER "${provider}"; skipping notification`);
}

function getPriceIcon({ price, previousPrice }) {
  if (typeof previousPrice !== 'number' || previousPrice === price) {
    return '';
  }

  return price < previousPrice ? '🔻' : '🔺';
}

function formatPriceChange({ price, previousPrice, currency }) {
  if (typeof previousPrice !== 'number' || previousPrice === price) {
    return '';
  }

  if (price < previousPrice) {
    return ` (↓ ${formatPrice(previousPrice, currency)} → ${formatPrice(price, currency)})`;
  }

  return ` (↑ ${formatPrice(previousPrice, currency)} → ${formatPrice(price, currency)})`;
}

function hasAvailabilityChanged({
  availability,
  previousAvailability,
  availabilityLabel,
  previousAvailabilityLabel,
}) {
  const slugChanged =
    typeof previousAvailability === 'string' &&
    typeof availability === 'string' &&
    previousAvailability !== availability;

  const labelChanged =
    typeof previousAvailabilityLabel === 'string' &&
    previousAvailabilityLabel.length > 0 &&
    previousAvailabilityLabel !== availabilityLabel;

  return slugChanged || labelChanged;
}

function getAvailabilityIcon(item) {
  return hasAvailabilityChanged(item) ? '📦' : '';
}

function formatAvailabilityChange({
  availability,
  previousAvailability,
  availabilityLabel,
  previousAvailabilityLabel,
}) {
  if (
    hasAvailabilityChanged({
      availability,
      previousAvailability,
      availabilityLabel,
      previousAvailabilityLabel,
    }) === false
  ) {
    return '';
  }

  const previousLabel =
    typeof previousAvailabilityLabel === 'string' && previousAvailabilityLabel.length > 0
      ? previousAvailabilityLabel
      : previousAvailability ?? 'unknown';
  const currentLabel =
    typeof availabilityLabel === 'string' && availabilityLabel.length > 0
      ? availabilityLabel
      : availability ?? 'unknown';

  return ` (availability: ${previousLabel} → ${currentLabel})`;
}

function formatCheckLine(item) {
  if (item.type === 'error') {
    return `❌ ${item.url}\n   ${item.message}`;
  }

  const lines = [`• ${item.title}`];

  const priceIcon = getPriceIcon(item);
  const pricePrefix = priceIcon.length > 0 ? `${priceIcon} ` : '   ';
  const priceChange = formatPriceChange(item);
  lines.push(`${pricePrefix}${formatPrice(item.price, item.currency)}${priceChange}`);

  const hasAvailability =
    typeof item.availabilityLabel === 'string' && item.availabilityLabel.length > 0;

  if (hasAvailability) {
    const availabilityIcon = getAvailabilityIcon(item);
    const availabilityPrefix = availabilityIcon.length > 0 ? `${availabilityIcon} ` : '   ';
    const availabilityChange = formatAvailabilityChange(item);
    lines.push(`${availabilityPrefix}${item.availabilityLabel}${availabilityChange}`);
  }

  return lines.join('\n');
}

export async function notifyCheckSummary({ wishlistName, results }) {
  const lines = results.map(formatCheckLine);
  const checkedAt = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  const title =
    typeof wishlistName === 'string' && wishlistName.length > 0
      ? `Thomann — ${wishlistName} — ${checkedAt}`
      : `Thomann price check — ${checkedAt}`;
  const message = [title, '', lines.join('\n\n')].join('\n');

  await sendMessage(message);
}
