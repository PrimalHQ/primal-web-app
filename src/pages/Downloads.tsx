import { Component, onMount, Show } from 'solid-js';
import Branding from '../components/Branding/Branding';
import Wormhole from '../components/Wormhole/Wormhole';
import Search from '../components/Search/Search';

import appstoreImg from '../assets/images/appstore_download.svg';
import playstoreImg from '../assets/images/playstore_download.svg';
import primalQR from '../assets/images/primal_qr.png';

import gitHubLight from '../assets/icons/github_light.svg';
import gitHubDark from '../assets/icons/github.svg';

import primalDownloads from '../assets/images/video_placeholder.png';

import styles from './Downloads.module.scss';
import { downloads as t } from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { appStoreLink, playstoreLink, apkLink } from '../constants';
import ExternalLink from '../components/ExternalLink/ExternalLink';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { useSettingsContext } from '../contexts/SettingsContext';
import { isAndroid } from '@kobalte/utils';
import { isIOS, isPhone } from '../utils';
import NoteVideo from '../components/ParsedNote/NoteVideo';
import { useNotificationsContext } from '../contexts/NotificationsContext';

const Downloads: Component = () => {

  const intl = useIntl();
  const settings = useSettingsContext();
  const notification = useNotificationsContext();

  const iosRD = () => stringToDate(settings?.mobileReleases.ios.date || '0');
  const iosVersion = () => settings?.mobileReleases.ios.version || '0';

  const andRD = () => stringToDate(settings?.mobileReleases.android.date || '0');
  const andVersion = () => settings?.mobileReleases.android.version || '0';

  const today = () => (new Date()).getTime();

  onMount(() => {
    if (today() > iosRD()) {
      localStorage.setItem('iosDownload', iosVersion());
    }

    if (today() > andRD()) {
      localStorage.setItem('andDownload', andVersion());
    }

    notification?.actions.calculateDownloadCount();
  });

  const displayDate = (dateValue: number) => {
    if (isNaN(dateValue)) return '';

    const date = new Date(dateValue);

    return new Intl.DateTimeFormat("en-US", {
      year: 'numeric', month: 'short', day: 'numeric',
    }).format(date);
  }

  const stringToDate = (dateString: string) => {
    return (new Date(dateString)).getTime();
  }

  return (
    <div class={styles.downloadsContainer}>
      <Show when={!isPhone()}>
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
      </Show>

      <PageTitle title={intl.formatMessage(t.title)} />

      <PageCaption title={intl.formatMessage(t.title)} />

      <div class={styles.downloadsContent}>

        <div class={styles.promoVideo}>
          <NoteVideo
            src='https://m.primal.net/MAww.mp4'
            width={600}
          />
        </div>

        <div class={`${styles.appInfo} ${isIOS() ? styles.appInfoReverse : ''}`}>

          <Show when={!isAndroid()}>
            <div class={styles.appStore}>
              <div class={styles.desktopCTA}>{intl.formatMessage(t.callToActionIOSTitle)}</div>

              <div class={styles.callToActionIOS}>
                <div class={styles.ctaTitle}>
                  {intl.formatMessage(t.callToActionIOSTitle)}
                </div>
              </div>

              <div class={styles.buidDetails}>
                <div>
                  {displayDate(iosRD()).toLowerCase()} | {intl.formatMessage(t.build)} {iosVersion()}
                </div>
              </div>

              <a
                href={appStoreLink}
                target='_blank'
              >
                <img src={appstoreImg} />
              </a>
            </div>
          </Show>

          <Show when={!isAndroid() && !isIOS()}>
            <div class={styles.qrCode}>
              <img src={primalQR} width={180} />
              <div class={styles.qrCaption}>
              {intl.formatMessage(t.callToActionQRTitle)}
              </div>
            </div>
          </Show>

          <Show when={!isIOS()}>
            <div class={styles.playStore}>
              <div class={styles.desktopCTA}>{intl.formatMessage(t.callToActionAndroidTitle)}</div>

              <div class={styles.callToActionAndroid}>
                <div class={styles.ctaTitle}>
                  {intl.formatMessage(t.callToActionAndroidTitle)}
                </div>
              </div>

              <div class={styles.buidDetails}>
                <div>
                  {displayDate(andRD()).toLowerCase()} | {intl.formatMessage(t.build)} {andVersion()}
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
                href={`https://github.com/PrimalHQ/primal-android-app/releases/tag/${andVersion()}`}
                target='_blank'
                class={styles.apkLink}
              >
                {intl.formatMessage(t.getApk)}
              </a>
            </div>
          </Show>
        </div>
      </div>

      <Show
        when={!isAndroid() && !isIOS()}
        fallback={
          <div class={styles.downloadsExtra}>
            <div class={styles.sclabel}>Source code</div>

            <ExternalLink
              darkIcon={gitHubLight}
              lightIcon={gitHubDark}
              label="Primal GitHub"
              href={isIOS() ?
                'https://github.com/PrimalHQ/primal-ios-app':
                'https://github.com/PrimalHQ/primal-android-app'
              }
            />
          </div>
        }
      >
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
      </Show>
    </div>
  );
}

export default Downloads;
