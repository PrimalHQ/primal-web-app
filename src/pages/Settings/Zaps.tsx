import { Component } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { Link } from '@solidjs/router';
import SettingsZap from '../../components/SettingsZap/SettingsZap';

const Zaps: Component = () => {

  const intl = useIntl();

  return (
    <div>
      <PageCaption>
        <Link href='/settings' >{intl.formatMessage(t.index.title)}</Link>:&nbsp;
        <div>{intl.formatMessage(t.zaps)}</div>
      </PageCaption>

      <div class={styles.zapSettings}>
        <SettingsZap />
      </div>
    </div>
  )
}

export default Zaps;
