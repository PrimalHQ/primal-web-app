import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
// @ts-ignore Bad types in nostr-tools
import { Relay, relayInit } from "nostr-tools";
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { Link } from '@solidjs/router';
import { useAccountContext } from '../../contexts/AccountContext';
import { getDefaultRelays } from '../../lib/relays';
import { APP_ID } from '../../App';
import { isConnected as isSocketConnected, socket, subscribeTo } from '../../sockets';
import { createStore } from 'solid-js/store';
import Checkbox from '../../components/Checkbox/Checkbox';
import { store } from '../../services/StoreService';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';

const Network: Component = () => {

  const intl = useIntl();
  const account = useAccountContext();

  const [recomendedRelays, setRecomendedRelays] = createStore<Relay[]>([]);
  const [confirmRemoveRelay, setConfirmRemoveRelay] = createSignal('');
  const [invalidCustomRelay, setInvalidCustomRelay] = createSignal(false);

  let customRelayInput: HTMLInputElement | undefined;

  const relays = () => {
    let settingsRelays = [];

    for (let url in (account?.relaySettings || {})) {
      settingsRelays.push(relayInit(url))
    }

    return settingsRelays;
  };

  const otherRelays = () => {
    const myRelays: string[] = relays().map(r => r.url);

    let unusedRelays: string[] = [];

    for (let i = 0; i < recomendedRelays.length; i++) {
      const relay = recomendedRelays[i];

      const exists = myRelays.find(r => {

        const a = new URL(r);
        const b = new URL(relay.url);

        return a.origin === b.origin;
      });

      if (!exists) {
        unusedRelays.push(relay.url);
      }
    }

    return unusedRelays;
  }

  const isConnected = (url: string) => {
    const relay: Relay | undefined = account?.relays.find(r => r.url === url);
    return relay && relay.status === WebSocket.OPEN;
  };

  const isPrimalRelayInUserSettings = () => {
    const rels: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

    return Object.keys(account?.relaySettings || {}).includes(rels[0]);
  }

  const onCheckPrimalRelay = () => {
    account?.actions.setConnectToPrimaryRelays(!account.connectToPrimaryRelays)
  };

  createEffect(() => {
    const unsub = subscribeTo(`settings_drs_${APP_ID}`, (type, subId, content) => {
      if (type === 'EVENT' && content) {
        const urls = JSON.parse(content.content || '[]');
        setRecomendedRelays(() => urls.map(relayInit));
      }

      if (type === 'EOSE') {
        unsub();
      }
    });

    getDefaultRelays(`settings_drs_${APP_ID}`);
  });

  const onAddRelay = (url: string) => {
    const rels: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];
    if (rels.includes(url)) {
      account?.actions.setConnectToPrimaryRelays(true);
    }
    account?.actions.addRelay(url);
  };

  const onRemoveRelay = (url: string) => {
    account?.actions.removeRelay(url);
  };

  const onCustomRelayInput = () => {
    if (!customRelayInput) {
      return;
    }

    try {
      const url = new URL(customRelayInput.value);
      if (!url.origin.startsWith('wss://')) {
        throw(new Error('must be a wss'))
      }

      customRelayInput.value = '';
      account?.actions.addRelay(url.origin);
      setInvalidCustomRelay(false);
    } catch (e) {
      console.log('invalid url');
      setInvalidCustomRelay(true);
    }
  }

  return (
    <div>
      <PageCaption>
        <Link href='/settings' >{intl.formatMessage(t.index.title)}</Link>:&nbsp;
        <div>{intl.formatMessage(t.network.title)}</div>
      </PageCaption>

      <div class={styles.bigCaption}>
        {intl.formatMessage(t.network.relays)}
      </div>

      <div class={styles.settingsCaption}>
        {intl.formatMessage(t.network.myRelays)}
      </div>

      <For each={relays()}>
        {relay => (
          <button class={styles.relayItem} onClick={() => setConfirmRemoveRelay(relay.url)}>
            <div class={styles.relayEntry}>
              <Show
                when={isConnected(relay.url)}
                fallback={<div class={styles.disconnected}></div>}
              >
                <div class={styles.connected}></div>
              </Show>
              <div class={styles.webIcon}></div>
              <span>
                {relay.url}
              </span>
            </div>
            <div class={styles.remove}><div class={styles.closeIcon}></div> remove</div>
          </button>
        )}
      </For>

      <Show when={!isPrimalRelayInUserSettings()}>
        <Checkbox
          id="primal_relay_check"
          checked={account?.connectToPrimaryRelays}
          onChange={() => onCheckPrimalRelay()}
          label={`Post a copy of all content to the Primal relay (${import.meta.env.PRIMAL_PRIORITY_RELAYS})`}
        />
      </Show>

      <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
        {intl.formatMessage(t.network.recomended)}
      </div>

      <For each={otherRelays()}>
        {url => (
          <button class={styles.relayItem} onClick={() => onAddRelay(url)}>
            <div class={styles.relayEntry}>
              <div class={styles.addIcon}></div>
              <div class={styles.webIcon}></div>
              <span>
                {url}
              </span>
            </div>
            <div class={styles.add}><div class={styles.addIcon}></div> add</div>
          </button>
        )}
      </For>

      <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
        {intl.formatMessage(t.network.customRelay)}
      </div>

      <div
        class={styles.relayInput}
      >
        <div class={styles.webIcon}></div>
        <input
          ref={customRelayInput}
          type="text"
          placeholder="wss://relay.url"
          onChange={() => onCustomRelayInput()}
        />
        <button onClick={() => onCustomRelayInput()}>
          <div class={styles.connectIcon}></div>
        </button>
      </div>

      <Show when={invalidCustomRelay()}>
        <div class={styles.invalidInput}>
          Invalid relay url
        </div>
      </Show>

      <div class={`${styles.bigCaption} ${styles.secondBigCaption}`}>
        {intl.formatMessage(t.network.cachingService)}
      </div>

      <div class={styles.settingsCaption}>
        {intl.formatMessage(t.network.connectedCachingService)}
      </div>

      <div class={styles.relayItem}>
        <div class={styles.relayEntry}>
          <Show
            when={isSocketConnected()}
            fallback={<div class={styles.disconnected}></div>}
          >
            <div class={styles.connected}></div>
          </Show>
          <div class={styles.webIcon}></div>
          <span>
            {socket()?.url}
          </span>
        </div>
      </div>

      <ConfirmModal
        open={confirmRemoveRelay().length > 0}
        description="Remove Relay?"
        onConfirm={() => {
          onRemoveRelay(confirmRemoveRelay())
          setConfirmRemoveRelay('');
        }}
        onAbort={() => setConfirmRemoveRelay('')}
      />
    </div>
  )
}

export default Network;
