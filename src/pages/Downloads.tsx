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
import playStore from '../assets/images/playstore_download.svg';

import styles from './Downloads.module.scss';
import { downloads as t } from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { useSettingsContext } from '../contexts/SettingsContext';
import { iosRD, today } from '../constants';

const Downloads: Component = () => {

  const intl = useIntl();
  const settings = useSettingsContext();

  onMount(() => {
    if (today > iosRD) {
      localStorage.setItem('iosDownload', 'seen');
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
          <div class={styles.title}>Source code</div>
          <div class={styles.list}>
            <div>
              <Show
                when={['sunset', 'midnight'].includes(settings?.theme || 'sunset')}
                fallback={
                  <div class={styles.githubIconLight}></div>
                }
              >
                <div class={styles.githubIcon}></div>
              </Show>
              <a
                href='https://github.com/PrimalHQ/primal-web-app'
                target='_blank'
              >
                {intl.formatMessage(t.links.webApp)}
              </a>
            </div>
            <div>
              <Show
                when={['sunset', 'midnight'].includes(settings?.theme || 'sunset')}
                fallback={
                  <div class={styles.githubIconLight}></div>
                }
              >
                <div class={styles.githubIcon}></div>
              </Show>
              <a
                href='https://github.com/PrimalHQ/primal-caching-service'
                target='_blank'
              >
              {intl.formatMessage(t.links.cachingService)}
              </a>
            </div>

          </div>
        </div>
      </StickySidebar>

      <div id="central_header" class={styles.fullHeader}>
        <div>
          {intl.formatMessage(t.title)}
        </div>
      </div>

      <div class={styles.callToAction}>
        <div class={styles.ctaTitle}>
          {intl.formatMessage(t.callToActionTitle)}
        </div>
        <div class={styles.ctaDescription}>
          {intl.formatMessage(t.callToActionDescription)}
        </div>
      </div>

      <Show
        when={['sunset', 'midnight'].includes(settings?.theme || 'sunset')}
        fallback={
          <div class={styles.promoHolder}>
            <div class={styles.phones}>
              <img src={iphoneLight} />
              <img src={androidLight} />
            </div>
            <div class={styles.backdropLight}></div>
            <div class={styles.phoneReflections}>
              <img src={iphoneReflectionLight} />
              <img src={androidReflectionLight} />
            </div>
          </div>
        }
      >
        <div class={styles.promoHolder}>
          <div class={styles.phones}>
            <img src={iphone} />
            <img src={android} />
          </div>
          <div class={styles.backdrop}></div>
          <div class={styles.phoneReflections}>
            <img src={iphoneReflection} />
            <img src={androidReflection} />
          </div>
        </div>
      </Show>


      <div class={styles.linkHolder}>
        <div class={styles.appStore}>
          <div>{intl.formatMessage(t.appStoreCaption)}</div>
          <a
            href='https://testflight.apple.com/join/Is4tmDDR'
            target='_blank'
          >
            <img src={appStore} />
          </a>
        </div>
        <div class={styles.playStore}>
          <div>{intl.formatMessage(t.playStoreCaption)}</div>
          <a>
            <img src={playStore} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default Downloads;
