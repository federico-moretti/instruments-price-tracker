import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasPriceOrAvailabilityChange } from '../lib/changes.js';
import { parsePrice } from '../lib/storage.js';
import { parseWishlists } from '../lib/wishlists.js';

describe('parsePrice', () => {
  it('parses plain integers', () => {
    assert.equal(parsePrice('499'), 499);
    assert.equal(parsePrice('1299'), 1299);
  });

  it('parses European format with thousands separator', () => {
    assert.equal(parsePrice('1.234,56'), 1234.56);
    assert.equal(parsePrice('1.299'), 1299);
  });

  it('parses dot-decimal format', () => {
    assert.equal(parsePrice('479.00'), 479);
    assert.equal(parsePrice('1234.56'), 1234.56);
  });

  it('returns null for invalid input', () => {
    assert.equal(parsePrice(''), null);
    assert.equal(parsePrice('abc'), null);
    assert.equal(parsePrice(null), null);
  });
});

describe('parseWishlists', () => {
  const originalWishlists = process.env.WISHLISTS;
  const originalWishlistUrl = process.env.WISHLIST_URL;

  function restoreEnv() {
    if (typeof originalWishlists === 'string') {
      process.env.WISHLISTS = originalWishlists;
    } else {
      delete process.env.WISHLISTS;
    }

    if (typeof originalWishlistUrl === 'string') {
      process.env.WISHLIST_URL = originalWishlistUrl;
    } else {
      delete process.env.WISHLIST_URL;
    }
  }

  it('parses WISHLISTS JSON array', () => {
    delete process.env.WISHLIST_URL;
    process.env.WISHLISTS = '["https://example.com/a.html", "https://example.com/b.html"]';

    try {
      const result = parseWishlists();
      assert.equal(result.length, 2);
      assert.equal(result[0].url, 'https://example.com/a.html');
    } finally {
      restoreEnv();
    }
  });

  it('falls back to WISHLIST_URL', () => {
    delete process.env.WISHLISTS;
    process.env.WISHLIST_URL = 'https://example.com/wishlist.html';

    try {
      const result = parseWishlists();
      assert.equal(result.length, 1);
      assert.equal(result[0].url, 'https://example.com/wishlist.html');
    } finally {
      restoreEnv();
    }
  });

  it('throws when no env vars are set', () => {
    delete process.env.WISHLISTS;
    delete process.env.WISHLIST_URL;

    try {
      assert.throws(() => parseWishlists(), /WISHLISTS or WISHLIST_URL/);
    } finally {
      restoreEnv();
    }
  });
});

describe('change detection', () => {
  it('records history only when values change', () => {
    const previous = {
      price: 499,
      availability: 'in-stock',
      availabilityLabel: 'Disponibile',
    };
    const current = { ...previous };

    assert.equal(hasPriceOrAvailabilityChange(previous, current), false);
    assert.equal(hasPriceOrAvailabilityChange(undefined, current), true);
    assert.equal(hasPriceOrAvailabilityChange(previous, { ...current, price: 479 }), true);
  });
});
