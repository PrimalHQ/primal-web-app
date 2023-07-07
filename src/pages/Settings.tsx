import { Component } from 'solid-js';
import Branding from '../components/Branding/Branding';
import styles from './Settings.module.scss';

import FeedSorter from '../components/FeedSorter/FeedSorter';
import ThemeChooser from '../components/ThemeChooser/ThemeChooser';
import Wormhole from '../components/Wormhole/Wormhole';
import { useIntl } from '@cookbook/solid-intl';
import SettingsZap from '../components/SettingsZap/SettingsZap';
import Search from '../components/Search/Search';
import SettingsNotifications from '../components/SettingsNotifications/SettingsNotifications';
import { settings as t } from '../translations';

const Settings: Component = () => {

  const intl = useIntl();

  return (
    <div class={styles.settingsContainer}>
      <Wormhole to="branding_holder">
        <Branding small={false} />
      </Wormhole>

      <Wormhole
        to="search_section"
      >
        <Search />
      </Wormhole>

      <div id="central_header" class={styles.fullHeader}>
        <div>
          {intl.formatMessage(t.title)}
        </div>
      </div>
      <div class={styles.settingsCaption}>
        {intl.formatMessage(t.theme)}
      </div>

      <ThemeChooser />

      <div class={styles.devider}></div>

      <div class={styles.settingsCaption}>
        {intl.formatMessage(t.feeds)}
      </div>

      <div class={styles.feedSettings}>
        <FeedSorter />
      </div>

      <div class={styles.devider}></div>

      <div class={styles.settingsCaption}>
        {intl.formatMessage(t.feeds)}
      </div>

      <div class={styles.zapSettings}>
        <SettingsZap />
      </div>

      <div class={styles.devider}></div>

      <div class={styles.settingsCaption}>
        {intl.formatMessage(t.notifications.title)}
      </div>

      <div class={styles.notificationSettings}>
        <SettingsNotifications />
      </div>
    </div>
  )
}

export default Settings;
