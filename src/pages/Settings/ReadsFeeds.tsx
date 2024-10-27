import { Component, createSignal } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { useSettingsContext } from '../../contexts/SettingsContext';
import FeedSorter from '../../components/FeedSorter/FeedSorter';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonLink from '../../components/Buttons/ButtonLink';
import FeedMarketPlace from '../../components/FeedMarketplace/FeedMarketPlace';
import FeedMarketPlaceDialog from '../../components/FeedMarketplace/FeedMarketPlaceDialog';

const ReadsFeeds: Component = () => {

  const intl = useIntl();
  const settings = useSettingsContext();

  const [isRestoringFeeds, setIsRestoringFeeds] = createSignal(false);
  const [openMarketplace, setOpenMarketplace] = createSignal(false);

  const onRestoreFeeds = () => {
    settings?.actions.restoreReadsFeeds();
    setIsRestoringFeeds(false);
  };

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.readsFeeds.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.readsFeeds.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.feedSettings}>
          <FeedSorter
            feedType="reads"
            feeds={settings?.readsFeeds || []}
            actions={{
              remove: settings?.actions.removeFeed,
              move: settings?.actions.moveFeed,
              rename: settings?.actions.renameFeed,
              enable: settings?.actions.enableFeed,
            }}
          />
        </div>

        <div class={styles.separator}></div>

        <div class={styles.feedManage}>
          <ButtonLink
            onClick={() => setOpenMarketplace(() => true)}
          >
            {intl.formatMessage(t.feedsAddNew)}
          </ButtonLink>

          <ButtonLink
            onClick={() => setIsRestoringFeeds(true)}
          >
            {intl.formatMessage(t.feedsRestore)}
          </ButtonLink>
        </div>

        <ConfirmModal
          open={isRestoringFeeds()}
          description={intl.formatMessage(t.feedsRestoreConfirm)}
          onConfirm={onRestoreFeeds}
          onAbort={() => setIsRestoringFeeds(false)}
        ></ConfirmModal>

        <FeedMarketPlaceDialog
          open={openMarketplace()}
          setOpen={setOpenMarketplace}
          type="reads"
          onAddFeed={(feed) => {
            settings?.actions.addFeed(feed, 'reads');
            setOpenMarketplace(() => false);
          }}
        />
      </div>
    </div>
  )
}

export default ReadsFeeds;
