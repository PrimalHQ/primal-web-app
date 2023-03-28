import { Component } from 'solid-js';
import Branding from '../components/Branding/Branding';
import styles from './Settings.module.scss';

import FeedSorter from '../components/FeedSorter/FeedSorter';
import ThemeChooser from '../components/ThemeChooser/ThemeChooser';
import Wormhole from '../components/Wormhole/Wormhole';


const Settings: Component = () => {

  return (
    <div class={styles.settingsContainer}>
      <Wormhole to="branding_holder">
        <Branding small={false} />
      </Wormhole>

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
