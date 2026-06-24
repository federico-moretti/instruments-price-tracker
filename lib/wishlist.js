function parseWishlistName(pageTitle) {
  if (typeof pageTitle !== 'string' || pageTitle.length === 0) {
    return 'Wishlist';
  }

  const quotedMatch = pageTitle.match(/^"([^"]+)"/);
  if (quotedMatch !== null) {
    return quotedMatch[1];
  }

  const parts = pageTitle.split('–');
  const firstPart = parts[0].trim();
  return firstPart.length > 0 ? firstPart : 'Wishlist';
}

export async function scrapeWishlist(page, wishlistUrl) {
  await page.goto(wishlistUrl, { waitUntil: 'domcontentloaded' });

  const pageTitle = await page.title();
  const urls = await page.locator('main .product a[href*=".htm"]').evaluateAll((links) =>
    [...new Set(links.map((link) => link.href.split('?')[0]))],
  );

  if (urls.length === 0) {
    throw new Error(`No products found on wishlist: ${wishlistUrl}`);
  }

  return {
    name: parseWishlistName(pageTitle),
    urls,
  };
}
