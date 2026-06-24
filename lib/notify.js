async function sendMessage(message) {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK;

  if (typeof webhookUrl !== 'string' || webhookUrl.length === 0) {
    console.warn('NOTIFICATION_WEBHOOK is not set; skipping notification');
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message, text: message }),
  });

  if (response.ok === false) {
    throw new Error(`Webhook failed with status ${response.status}`);
  }
}

function formatPriceChange({ price, previousPrice, currency }) {
  if (typeof previousPrice !== 'number' || previousPrice === price) {
    return '';
  }

  const currencyLabel = typeof currency === 'string' && currency.length > 0 ? currency : 'EUR';

  if (price < previousPrice) {
    return ` (↓ ${previousPrice} → ${price} ${currencyLabel})`;
  }

  return ` (↑ ${previousPrice} → ${price} ${currencyLabel})`;
}

function formatAvailabilityChange({
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

  if (slugChanged === false && labelChanged === false) {
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

  const currencyLabel = typeof item.currency === 'string' && item.currency.length > 0 ? item.currency : 'EUR';
  const availability =
    typeof item.availabilityLabel === 'string' && item.availabilityLabel.length > 0
      ? ` — ${item.availabilityLabel}`
      : '';
  const priceChange = formatPriceChange(item);
  const availabilityChange = formatAvailabilityChange(item);

  return `• ${item.title}: ${item.price} ${currencyLabel}${priceChange}${availability}${availabilityChange}`;
}

export async function notifyCheckSummary({ wishlistName, results }) {
  const lines = results.map(formatCheckLine);
  const checkedAt = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  const title =
    typeof wishlistName === 'string' && wishlistName.length > 0
      ? `Thomann — ${wishlistName} — ${checkedAt}`
      : `Thomann price check — ${checkedAt}`;
  const message = [title, '', ...lines].join('\n');

  await sendMessage(message);
}
