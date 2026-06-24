export function parseWishlists() {
  const wishlistsEnv = process.env.WISHLISTS;
  const wishlistUrl = process.env.WISHLIST_URL;

  if (typeof wishlistsEnv === 'string' && wishlistsEnv.length > 0) {
    let parsed;

    try {
      parsed = JSON.parse(wishlistsEnv);
    } catch (error) {
      throw new Error('WISHLISTS must be valid JSON');
    }

    if (Array.isArray(parsed) === false || parsed.length === 0) {
      throw new Error('WISHLISTS must be a non-empty JSON array of URLs');
    }

    return parsed.map((item, index) => {
      if (typeof item !== 'string' || item.length === 0) {
        throw new Error(`WISHLISTS[${index}] must be a URL string`);
      }

      return { url: item };
    });
  }

  if (typeof wishlistUrl === 'string' && wishlistUrl.length > 0) {
    return [{ url: wishlistUrl }];
  }

  throw new Error('WISHLISTS or WISHLIST_URL environment variable is required');
}
