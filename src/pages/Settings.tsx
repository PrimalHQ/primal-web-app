import { Component } from 'solid-js';
import Branding from '../components/Branding/Branding';
import styles from './Settings.module.scss';

import FeedSorter from '../components/FeedSorter/FeedSorter';
import ThemeChooser from '../components/ThemeChooser/ThemeChooser';
import Wormhole from '../components/Wormhole/Wormhole';
import { useIntl } from '@cookbook/solid-intl';
import SettingsZap from '../components/SettingsZap/SettingsZap';
import Search from '../components/Search/Search';


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
          {intl.formatMessage(
            {
              id: 'pages.settings.title',
              defaultMessage: 'Settings',
              description: 'Title of the settings page',
            }
          )}
        </div>
      </div>
      <div class={styles.settingsCaption}>
        {intl.formatMessage(
          {
            id: 'pages.settings.sections.theme',
            defaultMessage: 'Theme',
            description: 'Title of the theme section on the settings page',
          }
        )}
      </div>

      <ThemeChooser />

      <div class={styles.devider}></div>

      <div class={styles.settingsCaption}>
        {intl.formatMessage(
          {
            id: 'pages.settings.sections.feeds',
            defaultMessage: 'Home page feeds',
            description: 'Title of the feeds section on the settings page',
          }
        )}
      </div>

      <div class={styles.feedSettings}>
        <FeedSorter />
      </div>

      <div class={styles.devider}></div>

      <div class={styles.settingsCaption}>
        {intl.formatMessage(
          {
            id: 'pages.settings.sections.zaps',
            defaultMessage: 'Zaps',
            description: 'Title of the zaps section on the settings page',
          }
        )}
      </div>

      <div class={styles.zapSettings}>
        <SettingsZap />
      </div>
    </div>
  )
}

export default Settings;
