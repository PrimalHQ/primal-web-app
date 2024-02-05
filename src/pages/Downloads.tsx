import { Component, onMount } from 'solid-js';
import Branding from '../components/Branding/Branding';
import Wormhole from '../components/Wormhole/Wormhole';
import Search from '../components/Search/Search';

import appstoreImg from '../assets/images/appstore_download.svg';
import playstoreImg from '../assets/images/playstore_download.svg';

import gitHubLight from '../assets/icons/github_light.svg';
import gitHubDark from '../assets/icons/github.svg';

import primalDownloads from '../assets/images/primal_downloads.png';

import styles from './Downloads.module.scss';
import { downloads as t } from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { andVersion, andRD, iosVersion, iosRD, today, appStoreLink, playstoreLink, apkLink } from '../constants';
import ExternalLink from '../components/ExternalLink/ExternalLink';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';

const Downloads: Component = () => {

  const intl = useIntl();

  onMount(() => {
    if (today > iosRD) {
      localStorage.setItem('iosDownload', iosVersion);
    }

    if (today > andRD) {
      localStorage.setItem('andDownload', andVersion);
    }
  });

  const displayDate = (dateValue: number) => {
    const date = new Date(dateValue);

    return new Intl.DateTimeFormat("en-US", {
      year: 'numeric', month: 'short', day: 'numeric',
    }).format(date);
  }

  return (
    <div class={styles.downloadsContainer}>
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

      <PageTitle title={intl.formatMessage(t.title)} />

      <PageCaption title={intl.formatMessage(t.title)} />

      <div class={styles.downloadsContent}>

        <div class={styles.promoHolder}>
          <img src={primalDownloads} />
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
                {displayDate(iosRD).toLowerCase()} | Build {iosVersion}
              </div>
            </div>

            <a
              href={appStoreLink}
              target='_blank'
            >
              <img src={appstoreImg} />
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
                {displayDate(andRD).toLowerCase()} | Build {andVersion}
              </div>
            </div>

            <a
              href={playstoreLink}
              target='_blank'
              class={styles.playstoreLink}
            >
              <img src={playstoreImg} />
            </a>

            <a
              href={apkLink}
              target='_blank'
              class={styles.apkLink}
            >
              {intl.formatMessage(t.getApk)}
            </a>
          </div>
        </div>
      </div>

      <div class={styles.downloadsExtra}>

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
    </div>
  );
}

export default Downloads;
