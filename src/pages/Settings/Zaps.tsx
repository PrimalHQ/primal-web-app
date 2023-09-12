import { Component } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { Link } from '@solidjs/router';
import SettingsZap from '../../components/SettingsZap/SettingsZap';
import PageTitle from '../../components/PageTitle/PageTitle';

const Zaps: Component = () => {

  const intl = useIntl();

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.zaps)} ${intl.formatMessage(t.title)}`} />

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
