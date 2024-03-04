import { Component, Show } from 'solid-js';

import primalWhite from '../../assets/icons/primal_white.svg';
import openWhite from '../../assets/icons/open_white.svg';
import styles from './BannerIOS.module.scss';
import { hookForDev } from '../../lib/devTools';
import { useSearchParams } from '@solidjs/router';

export const isIOS = () => {
  return /(iPad|iPhone|iPod)/.test(navigator.userAgent);
};

const BannerIOS: Component< { id?: string } > = (props) => {
  const [queryParams, setQueryParams] = useSearchParams();

  const showBanner = () => {
    return queryParams.mobilebanner !== 'false';
  };

  const linkToiOS = () => {
    const appstoreFail = 'https://apps.apple.com/us/app/primal/id1673134518';
    const appUrlScheme = `primal:/${window.location.pathname}`;

    if (isIOS()) {
      // Try launching the app using URL schemes
      window.open(appUrlScheme, "_self");

      // If the app is not installed the script will wait for 2sec and redirect to web.
      setTimeout(function() {
        window.location.href = appstoreFail;
      } , 2_000);
    } else {
      // Launch the website
      window.location.href = appstoreFail;
    }
  };

  return (
    <Show when={isIOS() && showBanner()}>
      <button class={styles.iosBanner} onClick={linkToiOS}>
        <div>
          <img src={primalWhite} />
          <div class={styles.iosDesc}>
            <div class={styles.title}>Primal</div>
            <div class={styles.desc}>Open in Primal app</div>
          </div>
          <img src={openWhite} />
        </div>
      </button>
    </Show>
  );
}

export default hookForDev(BannerIOS);
