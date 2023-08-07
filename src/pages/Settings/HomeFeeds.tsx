import { Component, createSignal } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { Link } from '@solidjs/router';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { useSettingsContext } from '../../contexts/SettingsContext';
import FeedSorter from '../../components/FeedSorter/FeedSorter';

const HomeFeeds: Component = () => {

  const intl = useIntl();
  const settings = useSettingsContext();

  const [isRestoringFeeds, setIsRestoringFeeds] = createSignal(false);

  const onRestoreFeeds = () => {
    settings?.actions.restoreDefaultFeeds();
    setIsRestoringFeeds(false);
  };

  return (
    <div>
      <PageCaption>
        <Link href='/settings' >{intl.formatMessage(t.index.title)}</Link>:&nbsp;
        <div>{intl.formatMessage(t.homeFeeds.title)}</div>
      </PageCaption>

      <div class={styles.feedCaption}>
        <div class={styles.settingsCaption}>
        {intl.formatMessage(t.homeFeeds.caption)}
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
    </div>
  )
}

export default HomeFeeds;
