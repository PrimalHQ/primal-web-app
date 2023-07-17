import { Component, onMount, Show } from 'solid-js';
import Branding from '../components/Branding/Branding';
import Wormhole from '../components/Wormhole/Wormhole';
import Search from '../components/Search/Search';

import iphone from '../assets/images/primal_iphone.png';
import android from '../assets/images/primal_android.png';
import iphoneReflection from '../assets/images/primal_iphone_reflection.png';
import androidReflection from '../assets/images/primal_android_reflection.png';

import iphoneLight from '../assets/images/primal_iphone_light.png';
import androidLight from '../assets/images/primal_android_light.png';
import iphoneReflectionLight from '../assets/images/primal_iphone_reflection_light.png';
import androidReflectionLight from '../assets/images/primal_android_reflection_light.png';

import appStore from '../assets/images/appstore_download.svg';
import apkDownload from '../assets/images/primal_apk_download.svg';

import gitHubLight from '../assets/icons/github_light.svg';
import gitHubDark from '../assets/icons/github.svg';

import styles from './Downloads.module.scss';
import { downloads as t } from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { useSettingsContext } from '../contexts/SettingsContext';
import { andRD, iosRD, today } from '../constants';
import ExternalLink from '../components/ExternalLink/ExternalLink';

const Downloads: Component = () => {

  const intl = useIntl();
  const settings = useSettingsContext();

  onMount(() => {
    if (today > iosRD) {
      localStorage.setItem('iosDownload', 'seen');
    }

    if (today > andRD) {
      localStorage.setItem('andDownload', 'seen');
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

      <div id="central_header" class={styles.fullHeader}>
        <div>
          {intl.formatMessage(t.title)}
        </div>
      </div>

      <div class={styles.promoHolder}>
        <video
          controls={true}
          muted={true}
          autoplay={true}
          poster='/public/primal_mobile_poster.png'
          src='https://primal.b-cdn.net/media-cache?s=o&a=1&u=https%3A%2F%2Fmedia.primal.net%2Fuploads%2F9%2Fd6%2F91%2F9d691046b2b73d13e48ed08bf4b3fd64560bac40e5e6a1e4f65fd7d40cfcedee.mp4'
        />
      </div>

      <div class={styles.linkHolder}>
        <div class={styles.appStore}>
          <div>{intl.formatMessage(t.appStoreCaption)}</div>

          <div class={styles.callToActionIOS}>
            <div class={styles.ctaTitle}>
              {intl.formatMessage(t.callToActionIOSTitle)}
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
          <div>{intl.formatMessage(t.apkDownload)}</div>

          <div class={styles.callToActionAndroid}>
            <div class={styles.ctaTitle}>
              {intl.formatMessage(t.callToActionAndroidTitle)}
            </div>
          </div>

          <a
            href='https://downloads.primal.net/android/primal-0.11.2.apk'
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
