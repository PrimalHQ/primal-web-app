import { Component } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import SettingsNotifications from '../../components/SettingsNotifications/SettingsNotifications';
import PageTitle from '../../components/PageTitle/PageTitle';

const Notifications: Component = () => {

  const intl = useIntl();

  return (
    <>
      <PageTitle title={`${intl.formatMessage(t.notifications.title)} ${intl.formatMessage(t.title)}`} />
      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.notifications.title)}</div>
      </PageCaption>
      <div class={styles.settingsContent}>


        <div class={styles.notificationSettings}>
          <SettingsNotifications />
        </div>
      </div>
    </>
  )
}

export default Notifications;
