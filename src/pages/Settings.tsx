import { Component, createEffect, createSignal, Show } from 'solid-js';
import { Portal, style } from 'solid-js/web';
import Branding from '../components/Branding/Branding';
import { useFeedContext } from '../contexts/FeedContext';
import styles from './Settings.module.scss';

import logoFire from '../assets/icons/logo_fire.svg';
import logoIce from '../assets/icons/logo_ice.svg';
import check from '../assets/icons/check.svg';
import FeedSorter from '../components/FeedSorter/FeedSorter';


const Settings: Component = () => {

  const context = useFeedContext();

  return (
    <div class={styles.settingsContainer}>
      <Portal
        mount={document.getElementById("branding_holder") as Node}
      >
        <Branding small={false} />
      </Portal>
      <div id="central_header" class={styles.fullHeader}>
        <div>
          Settings
        </div>
      </div>
      <div class={styles.settingsCaption}>
        Theme
      </div>
      <div class={styles.themeChooser}>
        <button class={styles.sunset} onClick={() => context?.actions?.setTheme('sunset')}>
          <img src={logoFire} />
          <Show when={context?.data.theme === 'sunset'}>
            <div class={styles.themeChecked}><img src={check} /></div>
          </Show>
        </button>
        <button class={styles.midnight} onClick={() => context?.actions?.setTheme('midnight')}>
          <img src={logoIce} />
          <Show when={context?.data.theme === 'midnight'}>
            <div class={styles.themeChecked}><img src={check} /></div>
          </Show>
        </button>
        <button class={styles.sunrise} onClick={() => context?.actions?.setTheme('sunrise')}>
          <img src={logoFire} />
          <Show when={context?.data.theme === 'sunrise'}>
            <div class={styles.themeChecked}><img src={check} /></div>
          </Show>
        </button>
        <button class={styles.ice} onClick={() => context?.actions?.setTheme('ice')}>
          <img src={logoIce} />
          <Show when={context?.data.theme === 'ice'}>
            <div class={styles.themeChecked}><img src={check} /></div>
          </Show>
        </button>
      </div>

      <div class={styles.settingsCaption}>
        Home page feeds
      </div>

      <div class={styles.feedSettingsg}>
        <FeedSorter />
      </div>
    </div>
  )
}

export default Settings;
