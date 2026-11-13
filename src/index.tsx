/* @refresh reload */
import { render } from 'solid-js/web';

import './index.scss';
import App from './App';
import { Router } from '@solidjs/router';

if ('serviceWorker' in navigator) {
  const hadControllerAtLoad = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register(
    import.meta.env.MODE === 'production' ? '/imageCacheWorker.js' : '/imageCacheWorker.js?dev-sw=1',
    { scope: '/'}
  );
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_ACTIVATED' && hadControllerAtLoad) {
      // A new SW replaced a previous one — current page code may be stale
      const url = new URL(window.location.href);
      url.searchParams.set('_sw', Date.now().toString());
      window.location.replace(url.toString());
    }
  });
}

const newsMatch = window.location.pathname.match(/^\/news\/([^/]+)\/?$/);

if (newsMatch) {
  window.location.replace(
    `https://tsunami.primal.net/news/${newsMatch[1]}${window.location.search}${window.location.hash}`,
  );
} else {
  render(() => <App />, document.getElementById('root') as HTMLElement);
}
