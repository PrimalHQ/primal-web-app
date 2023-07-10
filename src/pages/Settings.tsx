import { Component, createSignal, Show } from 'solid-js';
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
import { useSettingsContext } from '../contexts/SettingsContext';
import Modal from '../components/Modal/Modal';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';

const Settings: Component = () => {

  const intl = useIntl();
  const settings = useSettingsContext();

  const [isRestoringFeeds, setIsRestoringFeeds] = createSignal(false);

  const onRestoreFeeds = () => {
    settings?.actions.restoreDefaultFeeds();
    setIsRestoringFeeds(false);
  };

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

      <div class={styles.feedCaption}>
        <div class={styles.settingsCaption}>
          {intl.formatMessage(t.feeds)}
        </div>

        <button
          class={styles.restoreFeedsButton}
          onClick={() => setIsRestoringFeeds(true)}
        >
          {intl.formatMessage(t.feedsRestore)}
        </button>

        <ConfirmModal
          open={isRestoringFeeds()}
          description={intl.formatMessage(t.feedsRestoreConfirm)}
          onConfirm={onRestoreFeeds}
          onAbort={() => setIsRestoringFeeds(false)}
        ></ConfirmModal>
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
