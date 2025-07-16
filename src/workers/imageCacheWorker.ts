const CACHE_NAME = 'image-cache-v1';
const IMAGE_CACHE = 'images-v1';

// Install event - precache critical images
self.addEventListener('install', event => {
  console.log('WORKER INSTALL: ', event)
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/assets/icons/nav/home.svg',
        '/assets/icons/nav/long.svg',
        '/assets/icons/nav/explore.svg',
      ]);
    })
  );
});

// Fetch event - intercept image requests
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'image') {
    console.log('WORKER INTERCEPT: ', event)
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response; // Return cached image
        }

        // Fetch and cache new image
        return fetch(event.request).then(fetchResponse => {
          const responseClone = fetchResponse.clone();

          caches.open(IMAGE_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });

          return fetchResponse;
        });
      })
    );
  }
});
