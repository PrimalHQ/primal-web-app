import { Component } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { Link } from '@solidjs/router';
import SettingsNotifications from '../../components/SettingsNotifications/SettingsNotifications';

const Notifications: Component = () => {

  const intl = useIntl();

  return (
    <div>
      <PageCaption>
        <Link href='/settings' >{intl.formatMessage(t.index.title)}</Link>:&nbsp;
        <div>{intl.formatMessage(t.notifications.title)}</div>
      </PageCaption>

      <div class={styles.notificationSettings}>
        <SettingsNotifications />
      </div>
    </div>
  )
}

export default Notifications;
