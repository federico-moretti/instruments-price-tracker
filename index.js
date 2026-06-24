import { chromium } from 'playwright';
import { hasPriceOrAvailabilityChange } from './lib/changes.js';
import { notifyCheckSummary } from './lib/notify.js';
import { appendHistory, loadPrices, parsePrice, savePrices } from './lib/storage.js';
import { scrapeWishlist } from './lib/wishlist.js';
import { parseWishlists } from './lib/wishlists.js';

const wishlists = parseWishlists();

function stripLeadingEmoji(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return text;
  }

  return text.replace(/^(\p{Extended_Pictographic}\p{Emoji_Modifier}*\s*)+/u, '').trim();
}

async function scrapeAvailability(page) {
  const availabilityEl = page.locator('.product-price-box .fx-availability');
  const availabilityCount = await availabilityEl.count();

  if (availabilityCount === 0) {
    return { availability: null, availabilityLabel: null };
  }

  const availabilityText = await availabilityEl.textContent();
  const availabilityClass = await availabilityEl.getAttribute('class');
  const availabilityMatch =
    typeof availabilityClass === 'string'
      ? availabilityClass.match(/fx-availability--([\w-]+)/)
      : null;

  return {
    availability: availabilityMatch !== null ? availabilityMatch[1] : null,
    availabilityLabel:
      typeof availabilityText === 'string' && availabilityText.length > 0
        ? availabilityText.trim()
        : null,
  };
}

async function scrapeProduct(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const priceRaw = await page.locator('meta[itemprop="price"]').getAttribute('content');
  const currency = await page.locator('meta[itemprop="priceCurrency"]').getAttribute('content');
  const title = await page.locator('meta[property="og:title"]').getAttribute('content');
  const { availability, availabilityLabel } = await scrapeAvailability(page);

  return {
    url,
    title: stripLeadingEmoji(typeof title === 'string' ? title.trim() : url),
    price: parsePrice(priceRaw),
    currency: typeof currency === 'string' && currency.length > 0 ? currency : 'EUR',
    availability,
    availabilityLabel,
  };
}

async function checkProduct({ page, url, prices }) {
  const result = await scrapeProduct(page, url);

  if (result.price === null) {
    throw new Error('Could not parse price');
  }

  const previous = prices[url];
  const checkedAt = new Date().toISOString();

  const availabilityLog =
    typeof result.availabilityLabel === 'string'
      ? ` — ${result.availabilityLabel} (${result.availability})`
      : '';
  console.log(`🎵 ${result.title}: ${result.price} ${result.currency}${availabilityLog}`);

  const current = {
    title: result.title,
    price: result.price,
    currency: result.currency,
    availability: result.availability,
    availabilityLabel: result.availabilityLabel,
    checkedAt,
  };

  prices[url] = current;

  if (hasPriceOrAvailabilityChange(previous, current)) {
    await appendHistory({
      url,
      entry: {
        checkedAt,
        price: result.price,
        currency: result.currency,
        availability: result.availability,
        availabilityLabel: result.availabilityLabel,
      },
    });
  }

  return {
    type: 'success',
    title: result.title,
    url: result.url,
    price: result.price,
    currency: result.currency,
    availability: result.availability,
    availabilityLabel: result.availabilityLabel,
    previousPrice: typeof previous?.price === 'number' ? previous.price : undefined,
    previousAvailability:
      typeof previous?.availability === 'string' ? previous.availability : undefined,
    previousAvailabilityLabel:
      typeof previous?.availabilityLabel === 'string' ? previous.availabilityLabel : undefined,
  };
}

async function checkPrices() {
  const prices = await loadPrices();
  const browser = await chromium.launch({ headless: true });

  let failures = 0;

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'it-IT',
    });

    const listPage = await context.newPage();
    const wishlistGroups = [];

    for (const wishlist of wishlists) {
      try {
        const scraped = await scrapeWishlist(listPage, wishlist.url);

        console.log(`Found ${scraped.urls.length} products on wishlist "${scraped.name}"`);
        wishlistGroups.push({ name: scraped.name, urls: scraped.urls });
      } catch (error) {
        failures += 1;
        console.error(`Failed loading wishlist ${wishlist.url}:`, error.message);
        wishlistGroups.push({
          name: wishlist.url,
          urls: [],
          loadError: error.message,
        });
      }
    }

    await listPage.close();

    const productUrls = [...new Set(wishlistGroups.flatMap((group) => group.urls))];
    const resultsByUrl = new Map();
    const productPage = await context.newPage();

    for (const url of productUrls) {
      try {
        const result = await checkProduct({ page: productPage, url, prices });
        resultsByUrl.set(url, result);
      } catch (error) {
        failures += 1;
        console.error(`Failed parsing ${url}:`, error.message);
        resultsByUrl.set(url, { type: 'error', url, message: error.message });
      }
    }

    await productPage.close();
    await savePrices(prices);

    for (const group of wishlistGroups) {
      try {
        if (typeof group.loadError === 'string') {
          await notifyCheckSummary({
            wishlistName: group.name,
            results: [{ type: 'error', url: group.name, message: group.loadError }],
          });
          continue;
        }

        const results = group.urls.map((url) => {
          const result = resultsByUrl.get(url);
          if (result !== undefined) {
            return result;
          }

          return { type: 'error', url, message: 'Product result missing after scrape' };
        });

        await notifyCheckSummary({ wishlistName: group.name, results });
      } catch (error) {
        failures += 1;
        console.error(`Failed notifying for "${group.name}":`, error.message);
      }
    }
  } finally {
    await browser.close();
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

try {
  await checkPrices();
} catch (error) {
  console.error('Price check failed:', error.message);
  process.exitCode = 1;
}
