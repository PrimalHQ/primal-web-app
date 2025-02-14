import { Component, createSignal, Show } from 'solid-js';
import styles from './Settings.module.scss';

import ThemeChooser from '../../components/ThemeChooser/ThemeChooser';
import { useIntl } from '@cookbook/solid-intl';
import { settings as t, actions as tActions } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import { useAccountContext } from '../../contexts/AccountContext';
import Avatar from '../../components/Avatar/Avatar';
import { hexToNpub } from '../../lib/keys';

const Account: Component = () => {

  const intl = useIntl();
  const account = useAccountContext();

  const [isCoppied, setIsCoppied] = createSignal('');

  const onCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCoppied(text);

    setTimeout(() => setIsCoppied(''), 2_000);
  };

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.account.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.account.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.securityWarning}>
          <div class={styles.securityIcon}></div>
          <div class={styles.securityMessage}>
            {intl.formatMessage(t.account.description, {
              link: <a href="https://getalby.com" target='_blank'>Alby</a>,
            })}
          </div>
        </div>

        <div class={styles.settingsAccountCaption}>
          <div class={styles.caption}>
            {intl.formatMessage(t.account.pubkey)}
          </div>
          <button
            class={styles.copy}
            onClick={() => onCopy(hexToNpub(account?.publicKey) || '')}
          >
            <Show when={isCoppied() === hexToNpub(account?.publicKey)}>
              <div class={styles.checkIcon}></div>
            </Show>
            {intl.formatMessage(tActions.copyPubkey)}
          </button>
        </div>

        <div class={styles.settingsKeyArea}>
          <Avatar
            src={account?.activeUser?.picture}
            size="vs"
          />
          <div class={styles.key}>
            {hexToNpub(account?.publicKey)}
          </div>
        </div>

        <div class={styles.settingsDescription}>
          {intl.formatMessage(t.account.pubkeyDesc)}
        </div>


        <div class={styles.settingsAccountCaption}>
          <div class={styles.caption}>
            {intl.formatMessage(t.account.privkey)}
          </div>
          <button
            class={styles.copy}
            onClick={() => onCopy(account?.sec || '')}
          >
            <Show when={isCoppied() === account?.sec}>
              <div class={styles.checkIcon}></div>
            </Show>
            {intl.formatMessage(tActions.copyPrivkey)}
          </button>
        </div>

        <div class={styles.settingsKeyArea}>
          <div class={styles.icon}>
            <div class={styles.keyIcon}></div>
          </div>
          <input
            class={styles.key}
            value={account?.sec || ''}
            readOnly={true}
            type="password"
          />
        </div>

        <div class={styles.settingsDescription}>
          {intl.formatMessage(t.account.privkeyDesc)}
        </div>
      </div>

    </div>
  )
}

export default Account;
