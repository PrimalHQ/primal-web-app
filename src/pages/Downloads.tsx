import { Component, onMount } from 'solid-js';
import Branding from '../components/Branding/Branding';
import Wormhole from '../components/Wormhole/Wormhole';
import Search from '../components/Search/Search';

import appStore from '../assets/images/appstore_download.svg';
import apkDownload from '../assets/images/primal_apk_download.svg';

import gitHubLight from '../assets/icons/github_light.svg';
import gitHubDark from '../assets/icons/github.svg';

import styles from './Downloads.module.scss';
import { downloads as t } from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { andCheck, andRD, iosCheck, iosRD, today } from '../constants';
import ExternalLink from '../components/ExternalLink/ExternalLink';
import PageCaption from '../components/PageCaption/PageCaption';

const Downloads: Component = () => {

  const intl = useIntl();

  onMount(() => {
    if (today > iosRD) {
      localStorage.setItem('iosDownload', iosCheck);
    }

    if (today > andRD) {
      localStorage.setItem('andDownload', andCheck);
    }
  });

  return (
    <div class={styles.downloadsContainer}>
      <Wormhole to="branding_holder">
        <Branding small={false} />
      </Wormhole>

      <Wormhole
        to="search_section"
      >
        <Search />
      </Wormhole>

      <StickySidebar>
        <div class={styles.downloadsSidebar}>

          <div class={styles.title}>
            {intl.formatMessage(t.links.title)}
          </div>
          <div class={styles.list}>
            <ExternalLink
              darkIcon={gitHubLight}
              lightIcon={gitHubDark}
              label={intl.formatMessage(t.links.webApp)}
              href='https://github.com/PrimalHQ/primal-web-app'
            />

            <ExternalLink
              darkIcon={gitHubLight}
              lightIcon={gitHubDark}
              label={intl.formatMessage(t.links.iosApp)}
              href='https://github.com/PrimalHQ/primal-ios-app'
            />

            <ExternalLink
              darkIcon={gitHubLight}
              lightIcon={gitHubDark}
              label={intl.formatMessage(t.links.andApp)}
              href='https://github.com/PrimalHQ/primal-android-app'
            />

            <ExternalLink
              darkIcon={gitHubLight}
              lightIcon={gitHubDark}
              label={intl.formatMessage(t.links.cachingService)}
              href='https://github.com/PrimalHQ/primal-caching-service'
            />

            <ExternalLink
              darkIcon={gitHubLight}
              lightIcon={gitHubDark}
              label={intl.formatMessage(t.links.primalServer)}
              href='https://github.com/PrimalHQ/primal-server'
            />
          </div>
        </div>
      </StickySidebar>

      <PageCaption title={intl.formatMessage(t.title)} />

      <div class={styles.promoHolder}>
        <video
          controls
          muted
          autoplay
          playsinline
          poster='/public/primal_mobile_poster.png'
          src='https://primal.b-cdn.net/media-cache?s=o&a=1&u=https%3A%2F%2Fmedia.primal.net%2Fuploads%2F9%2Fd6%2F91%2F9d691046b2b73d13e48ed08bf4b3fd64560bac40e5e6a1e4f65fd7d40cfcedee.mp4'
        />
      </div>

      <div class={styles.linkHolder}>
        <div class={styles.appStore}>
          <div class={styles.desktopCTA}>{intl.formatMessage(t.callToActionIOSTitle)}</div>

          <div class={styles.callToActionIOS}>
            <div class={styles.ctaTitle}>
              {intl.formatMessage(t.callToActionIOSTitle)}
            </div>
          </div>

          <div class={styles.buidDetails}>
            <div>
              <div>released:</div>
              <div>build:</div>
            </div>
            <div>
              <div>august 1, 2023</div>
              <div>0.24.3</div>
            </div>
          </div>

          <a
            href='https://testflight.apple.com/join/Is4tmDDR'
            target='_blank'
          >
            <img src={appStore} />
          </a>
        </div>
        <div class={styles.playStore}>
          <div class={styles.desktopCTA}>{intl.formatMessage(t.callToActionAndroidTitle)}</div>

          <div class={styles.callToActionAndroid}>
            <div class={styles.ctaTitle}>
              {intl.formatMessage(t.callToActionAndroidTitle)}
            </div>
          </div>

          <div class={styles.buidDetails}>
            <div>
              <div>released:</div>
              <div>build:</div>
            </div>
            <div>
              <div>august 10, 2023</div>
              <div>0.14.2</div>
            </div>
          </div>

          <a
            href='https://downloads.primal.net/android/primal-0.14.2.apk'
            target='_blank'
          >
            <img src={apkDownload} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default Downloads;
