import { appendFile, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const PRICES_PATH = path.join(process.cwd(), 'data', 'prices.json');
const HISTORY_PATH = path.join(process.cwd(), 'data', 'history.jsonl');

export function parsePrice(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }

  const trimmed = raw.trim();

  if (trimmed.includes(',')) {
    const normalized = trimmed.replace(/\./g, '').replace(',', '.');
    const value = Number(normalized);
    return Number.isNaN(value) ? null : value;
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    const value = Number(trimmed.replace(/\./g, ''));
    return Number.isNaN(value) ? null : value;
  }

  const value = Number(trimmed);
  return Number.isNaN(value) ? null : value;
}

export async function loadPrices() {
  try {
    const content = await readFile(PRICES_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

export async function savePrices(prices) {
  await mkdir(path.dirname(PRICES_PATH), { recursive: true });
  await writeFile(PRICES_PATH, `${JSON.stringify(prices, null, 2)}\n`, 'utf8');
}

export async function appendHistory({ url, entry }) {
  const line = JSON.stringify({
    url,
    checkedAt: entry.checkedAt,
    price: entry.price,
    currency: entry.currency,
    availability: entry.availability,
    availabilityLabel: entry.availabilityLabel,
  });

  await mkdir(path.dirname(HISTORY_PATH), { recursive: true });
  await appendFile(HISTORY_PATH, `${line}\n`, 'utf8');
}
