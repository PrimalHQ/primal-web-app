import { Component, Show, createSignal } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import {
  settings as t,
  placeholders as tPlaceholders,
  errors as tErrors,
  actions as tActions,
} from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import SettingsBlossom from '../../components/SettingsBlossom/SettingsBlossom';
import { useAccountContext } from '../../contexts/AccountContext';
import { logError } from '../../lib/logger';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { primalBlossom } from '../../constants';

const Blossom: Component = () => {

  const account = useAccountContext();
  const intl = useIntl();

  let switchSeverInput: HTMLInputElement | undefined;

  const [invalidCachingService, setInvalidCachingService] = createSignal(false);

  const onSwitchServerInput = () => {
    if (!switchSeverInput || switchSeverInput.value === '') {
      return;
    }

    try {
      const url = new URL(switchSeverInput.value);
      if (!url.origin.startsWith('https://')) {
        throw(new Error('must be a https'))
      }

      switchSeverInput.value = '';
      account?.actions.addBlossomServers(url.href);
      setInvalidCachingService(false);
    } catch (e) {
      logError('invalid caching service input', e);
      setInvalidCachingService(true);
    }
  }

  return (
    <>
      <PageTitle title={`${intl.formatMessage(t.blossom)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.blossom)}</div>
      </PageCaption>
      <div class={styles.settingsContent}>
        <div class={`${styles.bigCaption}`}>
          {intl.formatMessage(t.blossomPage.mediaServer)}
        </div>

        <div class={styles.label}>
          {account?.blossomServers[0] || primalBlossom}
        </div>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
            {intl.formatMessage(t.blossomPage.switchServer)}
        d</div>

        <div
          class={styles.relayInput}
        >
          <div class={styles.webIcon}></div>
          <input
            ref={switchSeverInput}
            type="text"
            placeholder={intl.formatMessage(tPlaceholders.blossomServerUrl)}
            onChange={() => onSwitchServerInput()}
          />
          <button onClick={() => onSwitchServerInput()}>
            <div class={styles.connectIcon}></div>
          </button>
        </div>

        <Show when={invalidCachingService()}>
          <div class={styles.invalidInput}>
            {intl.formatMessage(tErrors.invalidRelayUrl)}
          </div>
        </Show>

        <div style="height: 20px"></div>

        <ButtonLink
          onClick={() => account?.actions.addBlossomServers(primalBlossom)}
        >
          {intl.formatMessage(tActions.restoreBlossomServer)}
        </ButtonLink>
      </div>
    </>
  )
}

export default Blossom;
