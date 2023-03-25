import { Component, createEffect, createSignal, onMount, Show } from 'solid-js';
import { Portal, style } from 'solid-js/web';
import Branding from '../components/Branding/Branding';
import { useFeedContext } from '../contexts/FeedContext';
import styles from './Settings.module.scss';

import logoFire from '../assets/icons/logo_fire.svg';
import logoIce from '../assets/icons/logo_ice.svg';
import check from '../assets/icons/check.svg';
import FeedSorter from '../components/FeedSorter/FeedSorter';
import ThemeChooser from '../components/ThemeChooser/ThemeChooser';


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
      <ThemeChooser />

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
