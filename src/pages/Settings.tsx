import { Component, createEffect, createSignal, onMount, Show } from 'solid-js';
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

  const [mounted, setMounted] = createSignal(false);

  const selectedClass = (klass: string) => {
    return context?.data.theme === klass ? styles.selected : '';
  };

  onMount(async () => {

    setTimeout(() => {
      // Temporary fix for Portal rendering on initial load.
      setMounted(true);
    }, 0);
  });

  return (
    <div class={styles.settingsContainer}>
      <Show when={mounted()}>
        <Portal
          mount={document.getElementById("branding_holder") as Node}
        >
          <Branding small={false} />
        </Portal>
      </Show>
      <div id="central_header" class={styles.fullHeader}>
        <div>
          Settings
        </div>
      </div>
      <div class={styles.settingsCaption}>
        Theme
      </div>
      <div class={styles.themeChooser}>
        <div class={styles.themeOption}>
          <button
            class={`${styles.sunset} ${selectedClass('sunset')}`}
            onClick={() => context?.actions?.setTheme('sunset')}
          >
            <img src={logoFire} />
            <Show
              when={context?.data.theme === 'sunset'}
              fallback={<div class={styles.themeUncheckedDark}></div>}
            >
              <div class={styles.themeChecked}><img src={check} /></div>
            </Show>
          </button>
          <p>sunset wave</p>
        </div>

        <div class={styles.themeOption}>
          <button
            class={`${styles.sunrise} ${selectedClass('sunrise')}`}
            onClick={() => context?.actions?.setTheme('sunrise')}
          >
            <img src={logoFire} />
            <Show
              when={context?.data.theme === 'sunrise'}
              fallback={<div class={styles.themeUncheckedLight}></div>}
            >
              <div class={styles.themeChecked}><img src={check} /></div>
            </Show>
          </button>
          <p>sunrise wave</p>
        </div>

        <div class={styles.themeOption}>
          <button
            class={`${styles.midnight} ${selectedClass('midnight')}`}
            onClick={() => context?.actions?.setTheme('midnight')}
          >
            <img src={logoIce} />
            <Show
              when={context?.data.theme === 'midnight'}
              fallback={<div class={styles.themeUncheckedDark}></div>}
            >
              <div class={styles.themeChecked}><img src={check} /></div>
            </Show>
          </button>
          <p>midnight wave</p>
        </div>

        <div class={styles.themeOption}>
          <button
            class={`${styles.ice} ${selectedClass('ice')}`}
            onClick={() => context?.actions?.setTheme('ice')}
          >
            <img src={logoIce} />
            <Show
              when={context?.data.theme === 'ice'}
              fallback={<div class={styles.themeUncheckedLight}></div>}
            >
              <div class={styles.themeChecked}><img src={check} /></div>
            </Show>
          </button>
          <p>ice wave</p>
        </div>
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
