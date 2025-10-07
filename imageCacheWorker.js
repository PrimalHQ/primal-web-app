const IMAGE_CACHE = 'images-v1';
const IMAGE_METADATA_CACHE = 'images-metadata-v1';

const DAY = 1000 * 60 * 60 * 24;
const MAX_IMAGE_AGE = 30 * DAY;

let imageToElementMap = {};

// Install event - precache critical images
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(IMAGE_CACHE).then(async (cache) => {
      // Fetch the manifest
      const manifestResponse = await fetch('/manifest.json');
      const manifest = await manifestResponse.json();

      // Extract asset URLs from manifest
      const assetUrls = Object.values(manifest)
        .filter(entry => entry.file && entry.file.match(/\.(png|jpg|jpeg|svg|webp)$/))
        .map(entry => `/${entry.file}`);

      const uniqueAssetUrls = [...new Set(assetUrls)];

      return cache.addAll(uniqueAssetUrls);
    }).catch((e => {
      if (self.location.hostname === 'localhost') {
        console.log('Error prefetching cached images: ', e);
      }
    }))
  );
});

self.addEventListener('activate', event => {
  if (self.location.hostname === 'localhost') {
    console.log('V1 now ready to handle fetches!');
  }
});

// Fetch event - intercept image requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isImageRequest = event.request.destination === 'image';

  if (!isImageRequest) {
    return;
  }

  event.respondWith(handleImageRequest(event.request, url));
});

async function handleImageRequest(request, url) {
  const cache = await caches.open(IMAGE_CACHE);
  const metadataCache = await caches.open(IMAGE_METADATA_CACHE);

  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    const metadataResponse = await metadataCache.match(new Request(request.url));

    if (metadataResponse) {
      const timestamp = parseInt(await metadataResponse.text(), 10);
      if (!Number.isNaN(timestamp) && (Date.now() - timestamp) < MAX_IMAGE_AGE) {
        return cachedResponse;
      }
    }
  }

  try {
    const networkResponse = await fetch(request);

    const canCache = networkResponse && (networkResponse.ok || networkResponse.type === 'opaqueredirect' || networkResponse.type === 'opaque');

    if (canCache) {
      try {
        await cache.put(request, networkResponse.clone());
        await metadataCache.put(new Request(request.url), new Response(Date.now().toString()));
      } catch (error) {
        if (self.location.hostname === 'localhost') {
          console.log('Failed to cache image response', url.href, error);
        }
      }
    }

    return networkResponse;
  } catch (error) {
    if (self.location.hostname === 'localhost') {
      console.log('Image fetch failed, falling back to cache if available', url.href, error);
    }

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

self.addEventListener('message', event => {
  if (event.data.type === 'CACHE_AVATAR' && typeof event.data.url === 'string') {
    const url = event.data.url;

    event.waitUntil(new Promise(async (resolve) => {
      const cache = await caches.open(IMAGE_CACHE);
      const response = await cache.match(url);
      if (!!response) {
        resolve();
      }
      else {
        try {
          await cache.add(url);
          resolve();
        } catch {
          resolve();
        }
      }
    }));
  }
});
