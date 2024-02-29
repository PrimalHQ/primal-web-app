import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
// @ts-ignore Bad types in nostr-tools
import { Relay, relayInit } from "nostr-tools";
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import {
  settings as t,
  actions as tActions,
  errors as tErrors,
  placeholders as tPlaceholders,
} from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { Link } from '@solidjs/router';
import { useAccountContext } from '../../contexts/AccountContext';
import { getDefaultRelays } from '../../lib/relays';
import { APP_ID } from '../../App';
import { isConnected as isSocketConnected, socket, subscribeTo } from '../../sockets';
import { createStore } from 'solid-js/store';
import Checkbox from '../../components/Checkbox/Checkbox';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { interpretBold } from '../../translationHelpers';
import { useSettingsContext } from '../../contexts/SettingsContext';
import HelpTip from '../../components/HelpTip/HelpTip';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { logError } from '../../lib/logger';


const Network: Component = () => {

  const intl = useIntl();
  const account = useAccountContext();

  const [recomendedRelays, setRecomendedRelays] = createStore<Relay[]>([]);
  const [confirmRemoveRelay, setConfirmRemoveRelay] = createSignal('');
  const [invalidCustomRelay, setInvalidCustomRelay] = createSignal(false);
  const [invalidCachingService, setInvalidCachingService] = createSignal(false);

  let customRelayInput: HTMLInputElement | undefined;
  let cachingServiceInput: HTMLInputElement | undefined;

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

        return a.href === b.href;
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

  const onAddRelay = (url: string) => {
    const rels: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

    if (rels.includes(url)) {
      account?.actions.setConnectToPrimaryRelays(true);
    }

    const myRelays = relays();

    if (myRelays.length === 0) {
      account?.actions.dissconnectDefaultRelays()
    }

    account?.actions.addRelay(url);
  };

  const onRemoveRelay = (url: string) => {
    account?.actions.removeRelay(url);

    const myRelays = relays();

    if (myRelays.length === 0) {
      setTimeout(() => {
        account?.actions.connectToRelays({});
      }, 200);
    }
  };

  const onCustomRelayInput = () => {
    if (!customRelayInput || customRelayInput.value === '') {
      return;
    }

    try {
      const value = customRelayInput.value;
      const url = new URL(value);
      if (!url.origin.startsWith('wss://') && !url.origin.startsWith('ws://')) {
        throw(new Error('must be a wss'))
      }

      customRelayInput.value = '';
      account?.actions.addRelay(value);
      setInvalidCustomRelay(false);
    } catch (e) {
      logError('invalid relay input ', e);
      setInvalidCustomRelay(true);
    }
  }

  const onCachingServiceInput = () => {
    if (!cachingServiceInput || cachingServiceInput.value === '') {
      return;
    }

    try {
      const url = new URL(cachingServiceInput.value);
      if (!url.origin.startsWith('wss://') && !url.origin.startsWith('ws://')) {
        throw(new Error('must be a wss'))
      }

      cachingServiceInput.value = '';
      account?.actions.changeCachingService(url.href);
      setInvalidCachingService(false);
    } catch (e) {
      logError('invalid caching service input', e);
      setInvalidCachingService(true);
    }
  }

  createEffect(() => {
    const unsub = subscribeTo(`settings_drs_${APP_ID}`, (type, subId, content) => {
      if (type === 'EVENT' && content) {
        const urls = JSON.parse(content.content || '[]') || [];
        setRecomendedRelays(() => urls.map(relayInit));
      }

      if (type === 'EOSE') {
        unsub();
      }
    });

    getDefaultRelays(`settings_drs_${APP_ID}`);
  });

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.network.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <Link href='/settings' >{intl.formatMessage(t.index.title)}</Link>:&nbsp;
        <div>{intl.formatMessage(t.network.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.bigCaption}>
          {intl.formatMessage(t.network.relays)}
        </div>

        <div class={styles.settingsCaption}>
          {intl.formatMessage(t.network.myRelays)}
        </div>
      </div>

      <Show
        when={relays().length > 0}
        fallback={
          <div class={styles.settingsContentPaddingOnly}>
            <div class={styles.noMyRelays}>
              {intl.formatMessage(t.network.noMyRelays)}
            </div>
          </div>
        }
      >
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
                <span class={styles.relayUrl} title={relay.url}>
                  {relay.url}
                </span>
              </div>
              <div class={styles.remove}>
                {intl.formatMessage(tActions.removeRelay)}
              </div>
            </button>
          )}
        </For>
      </Show>


      <Show when={!isPrimalRelayInUserSettings()}>
        <Checkbox
          id="primal_relay_check"
          checked={account?.connectToPrimaryRelays}
          onChange={() => onCheckPrimalRelay()}
          label={`Post a copy of all content to the Primal relay (${import.meta.env.PRIMAL_PRIORITY_RELAYS})`}
        />
      </Show>

      <Show when={otherRelays().length > 0}>
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
              <div class={styles.add}>{intl.formatMessage(tActions.addRelay)}</div>
            </button>
          )}
        </For>

      </Show>

      <div class={styles.settingsContentBorderless}>
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
            placeholder={intl.formatMessage(tPlaceholders.relayUrl)}
            onChange={() => onCustomRelayInput()}
          />
          <button onClick={() => onCustomRelayInput()}>
            <div class={styles.connectIcon}></div>
          </button>
        </div>

        <Show when={invalidCustomRelay()}>
          <div class={styles.invalidInput}>
            {intl.formatMessage(tErrors.invalidRelayUrl)}
          </div>
        </Show>

        <div class={`${styles.bigCaption} ${styles.secondBigCaption}`}>
          {intl.formatMessage(t.network.cachingService)}
        </div>

        <div class={styles.settingsCaption}>
          <div>
            {intl.formatMessage(t.network.connectedCachingService)}
          </div>
          <HelpTip>
            <span>{intl.formatMessage(tPlaceholders.cachingPoolHelp)}</span>
          </HelpTip>
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

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(t.network.alternativeCachingService)}
        </div>

        <div
          class={styles.relayInput}
        >
          <div class={styles.webIcon}></div>
          <input
            ref={cachingServiceInput}
            type="text"
            placeholder={intl.formatMessage(tPlaceholders.cachingServiceUrl)}
            onChange={() => onCachingServiceInput()}
          />
          <button onClick={() => onCachingServiceInput()}>
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
          onClick={() => account?.actions.changeCachingService()}
        >
          {intl.formatMessage(tActions.restoreCachingService)}
        </ButtonLink>

        <div style="height: 48px"></div>
      </div>

      <ConfirmModal
        open={confirmRemoveRelay().length > 0}
        description={intl.formatMessage(tActions.confirmRemoveRelay, {
          url: confirmRemoveRelay(),
          b: interpretBold,
        }) as string}
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
