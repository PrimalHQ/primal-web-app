/* @refresh reload */
import { render } from 'solid-js/web';

import './index.scss';
import App from './App';
import { Router } from '@solidjs/router';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(
    import.meta.env.MODE === 'production' ? '/imageCacheWorker.js' : '/imageCacheWorker.js?dev-sw=1',
    { scope: '/'}
  )
}

render(() => <App />, document.getElementById('root') as HTMLElement);
