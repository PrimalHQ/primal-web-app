import { Component } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import SettingsZap from '../../components/SettingsZap/SettingsZap';
import PageTitle from '../../components/PageTitle/PageTitle';

const Zaps: Component = () => {

  const intl = useIntl();

  return (
    <>
      <PageTitle title={`${intl.formatMessage(t.zaps)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.zaps)}</div>
      </PageCaption>
      <div class={styles.settingsContent}>
        <SettingsZap />
      </div>
    </>
  )
}

export default Zaps;
