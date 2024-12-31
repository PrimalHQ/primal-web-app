import { Component, Show, createEffect, createSignal, onMount } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import Checkbox from '../../components/Checkbox/Checkbox';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { storageName } from '../../lib/localStore';
import { useAccountContext } from '../../contexts/AccountContext';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import CheckBox2 from '../../components/Checkbox/CheckBox2';

const DevTools: Component = () => {
  const account = useAccountContext();
  const intl = useIntl();

  const [isDevMode, setIsDevMode] = createSignal<boolean>(localStorage.getItem('devMode') === 'true');
  const [isStorageAvailable, setIsStorageAvailable] = createSignal<boolean>(true);
  const [hasNsec, setHasNsec] = createSignal<boolean>(false);

  onMount(() => {
    checkLocalStorage();
    checkNsec();
  });

  createEffect(() => {
    localStorage.setItem('devMode', `${isDevMode()}`)
  })

  const checkLocalStorage = () => {
    if (!account) return false;

    const name = storageName(account.publicKey);

    const isAvailable = localStorage.getItem(name) !== null;

    setIsStorageAvailable(() => isAvailable);
  }

  const checkNsec = () => {
    if (!account) return false;

    const isAvailable = localStorage.getItem('primalSec') !== null;

    setHasNsec(() => isAvailable);
  }

  const clearLocalStore = () => {
    if (!account) return;

    const name = storageName(account.publicKey);

    localStorage.removeItem(name);

    window.location.reload();
  };

  return (
    <>
      <PageTitle title={`${intl.formatMessage(t.devTools)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.devTools)}</div>
      </PageCaption>
      <div class={styles.settingsContent}>
        <div style="display: flex; flex-direction: column; gap:12px;">
          <ButtonLink
            onClick={clearLocalStore}
            disabled={!isStorageAvailable()}
          >
            Reset Local Storage
          </ButtonLink>
          <CheckBox2
            checked={isDevMode()}
            onChange={() => setIsDevMode((v) => !v)}
            label="Dev Mode"
          />
          <Show when={hasNsec()}>
            <ButtonPrimary onClick={() => {
              account?.actions.logout();
              setHasNsec(() => false);
              location.reload();
            }} >Logout/Remove Stored nsec</ButtonPrimary>
          </Show>
        </div>
      </div>
    </>
  )
}

export default DevTools;
