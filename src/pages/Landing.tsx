import { Component, Match, onCleanup, onMount, Show, Switch } from 'solid-js';

import styles from './Landing.module.scss';

import primalWeb from '../assets/images/primal_web.png';
import primalIOS from '../assets/images/appstore_download.png';
import primalAndroid from '../assets/images/playstore_download.png';
import primalQR from '../assets/images/primal_qr.png';

import nvk from '../assets/images/nvk.png';
import odell from '../assets/images/odell.png';
import preston from '../assets/images/preston.png';
import pablo from '../assets/images/pablo.png';

import primalLogo from '../assets/icons/logo.svg';
import primalName from '../assets/icons/primal.svg';


import { appStoreLink, playstoreLink } from '../constants';
import { A, useNavigate } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';
import { landing as t } from '../translations';
import { isAndroid, isIOS } from '@kobalte/utils';

const Landing: Component = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  const hasUserInfo = () => {
    return localStorage.getItem('pubkey');
  };

  onMount(()=> {
    if (hasUserInfo()) {
      navigate('/home');
      return;
    }
    const html = document.querySelector('html');

    // @ts-ignore
    html.style = 'background-color: white';
  });

  onCleanup(() => {
    const html = document.querySelector('html');

    // @ts-ignore
    html?.removeAttribute('style');
  })

  return (
    <div class={styles.landingPage}>
      <div class={styles.landingContent}>
        <div class={styles.mobileBranding}>
          <img src={primalLogo} />
          <img src={primalName} />
        </div>
        <div class={styles.landingVideo}>
          <video
            src='https://m.primal.net/HcyV.mp4'
            controls={false}
            muted={true}
            loop={true}
            playsinline={true}
            autoplay={true}
          />
        </div>
        <div class={styles.landingInfo}>
          <div class={styles.branding}>
            <img src={primalLogo} width={64} height={64} />
            <img src={primalName} height={60} />
          </div>
          <div class={styles.text}>
            <div class={styles.tagline}>
              {intl.formatMessage(t.tagline)}
            </div>
            <div class={styles.description}>
              {intl.formatMessage(t.description)}
            </div>
          </div>
          <div class={styles.actions}>
            <div class={styles.qrCode}>
              <img src={primalQR} width={180} />
            </div>
            <div class={styles.appLinks}>
              <Show when={isIOS() || !isAndroid()}>
                <a href={appStoreLink} target="_blank">
                  <img src={primalIOS} />
                </a>
              </Show>
              <Show when={isAndroid() || !isIOS()}>
                <a href={playstoreLink} target="_blank">
                  <img src={primalAndroid} />
                </a>
              </Show>
              <A href="/home" class={styles.linkToWeb}>
                <img src={primalWeb} />
                <p>{intl.formatMessage(t.browserOption)}</p>
              </A>
            </div>
          </div>
        </div>
      </div>
      <div class={styles.landingTestemonials}>
        <div class={styles.testemonial}>
          <p class={styles.pink}>
            A Noszter és a Bitcoin Lightning mindent megváltoztat. A Primal nemcsak jobb, mint a Wallet of Satoshi, hanem ezerszer jobb, mint a Venmo.
          </p>
          <img src={nvk} />
        </div>

        <div class={styles.testemonial}>
          <p class={styles.cyan}>
            A Primal a szabad technológia válasza a Twitterre és a TikTokra. Az igazi szólásszabadságot nem korlátozza a cenzúra.</p>
          <img src={odell} />
        </div>

        <div class={styles.testemonial}>
          <p class={styles.orange}>
            Nem tudom, hogyan állíthatná meg bárki is ezt. Úgy érzem, végre elérkezett a fizetési forradalom korszaka.
          </p>
          <img src={preston} />
        </div>

        <div class={styles.testemonial}>
          <p class={styles.blue}>
            A Primal tárca mindent elfeledtetett velem a többi tárcáról. Az integrált közösségi hálózat valódi változást hoz.
          </p>
          <img src={pablo} />
        </div>
      </div>
    </div>
  );
}

export default Landing;
