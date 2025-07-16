/* @refresh reload */
import { render } from 'solid-js/web';

import './index.scss';
import App from './App';
import { Router } from '@solidjs/router';

// import { register } from "register-service-worker";

// register(`/imageCache.ts`, {
//   registered: (registration) => {
//     console.log('SW REGISTERED:', registration);
//   },
//   error: (error) => {
//     console.log('SW ERROR:', error);
//   }
// });
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(
    import.meta.env.MODE === 'production' ? '/imageCacheWorker.js' : '/imageCacheWorker.js'
  )
}
render(() => <App />, document.getElementById('root') as HTMLElement);
