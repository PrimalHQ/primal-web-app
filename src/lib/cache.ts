export const cacheImages = async (imageUrls: string[]) => {
  const cache = await caches.open('images-v1');
  await cache.addAll(imageUrls);
}

// Check cache status
export const isImageCached = async (url: string) => {
  const cache = await caches.open('images-v1');
  const response = await cache.match(url);
  return !!response;
}
