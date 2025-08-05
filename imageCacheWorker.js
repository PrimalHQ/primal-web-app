const IMAGE_CACHE = 'images-v1';

const DAY = 1000 * 60 * 60 * 24;

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
  const isLocal = url.origin === location.origin;

  if (event.request.destination === 'image') {

    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            return response;
          }

          if (isLocal) {
            // Fetch fresh image
            return fetch(event.request).then(fetchResponse => {
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            }).catch(error => {
              // console.error('FAILED TO FETCH IMAGE: ', url);
            });
          }


          return fetch(event.request).then(fetchResponse => {
            return fetchResponse;
          }).catch(error => {
            // console.error('FAILED TO FETCH IMAGE: ', url);
          });
        });
      })
    );
  }
});

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
