import { Component, createEffect, createSignal, For, Match, onMount, Show, Switch } from 'solid-js';
import { Relay, relayInit } from "../../lib/nTools";
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import {
  settings as t,
  actions as tActions,
  errors as tErrors,
  placeholders as tPlaceholders,
} from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import { useAccountContext } from '../../contexts/AccountContext';
import { getDefaultRelays } from '../../lib/relays';
import { APP_ID } from '../../App';
import { isConnected as isSocketConnected, socket, subsTo } from '../../sockets';
import { createStore } from 'solid-js/store';
import Checkbox from '../../components/Checkbox/Checkbox';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { interpretBold } from '../../translationHelpers';
import HelpTip from '../../components/HelpTip/HelpTip';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { logError } from '../../lib/logger';
import { useSettingsContext } from '../../contexts/SettingsContext';
import CheckBox2 from '../../components/Checkbox/CheckBox2';


const Network: Component = () => {

  const intl = useIntl();
  const account = useAccountContext();
  const settings = useSettingsContext();

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

    return relay && relay.ws && relay.ws.readyState === WebSocket.OPEN;
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

  const resetRelays = () => {
    account?.actions.resetRelays(recomendedRelays);
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
    const unsub = subsTo(`settings_drs_${APP_ID}`, {
      onEvent: (_, content) => {
        const urls = JSON.parse(content.content || '[]') || [];
        setRecomendedRelays(() => urls.map(relayInit));
      },
      onEose: () => {
        unsub();
      },
    });

    getDefaultRelays(`settings_drs_${APP_ID}`);
  });

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.network.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.network.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={`${styles.bigCaption}`}>
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

        <div class={`${styles.relayItem} ${styles.extended}`}>
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
    </div>

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
                <Switch fallback={<div class={styles.disconnected}></div>}>
                  <Match when={account?.proxyThroughPrimal}>
                    <div class={styles.suspended}></div>
                  </Match>

                  <Match when={isConnected(relay.url)}>
                    <div class={styles.connected}></div>
                  </Match>
                </Switch>

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


      <div class={styles.settingsContentPaddingOnly}>
        <Show when={!isPrimalRelayInUserSettings()}>
          <Checkbox
            id="primal_relay_check"
            checked={account?.connectToPrimaryRelays}
            onChange={() => onCheckPrimalRelay()}
            label={`Post a copy of all content to the Primal relay (${import.meta.env.PRIMAL_PRIORITY_RELAYS})`}
          />
        </Show>
      </div>

      <div class={styles.resetRelays}>
        <ButtonLink onClick={resetRelays}>
          {intl.formatMessage(tActions.resetRelays)}
        </ButtonLink>
        <HelpTip>
          <span>{intl.formatMessage(tPlaceholders.resetRelaysHelp)}</span>
        </HelpTip>
      </div>

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
      </div>


      <div class={styles.settingsContent}>
        <div class={styles.settingsCaption}>
          <CheckBox2
            id='proxyEvents'
            label=""
            onChange={() => {settings?.actions.setProxyThroughPrimal(!account?.proxyThroughPrimal)}}
            checked={account?.proxyThroughPrimal}
          />
          <span>{intl.formatMessage(t.network.proxyEvents)}</span>
          <HelpTip zIndex={1_000}>
            <span>
              {intl.formatMessage(t.network.proxyDescription)}
            </span>
          </HelpTip>
        </div>

        <div class={styles.moderationDescription}>
          {intl.formatMessage(t.network.proxyDescription)}
        </div>
      </div>

      <div class={styles.settingsContent}>
        <div class={styles.settingsCaption}>
          <CheckBox2
            id='discloseClient'
            label=""
            onChange={() => {settings?.actions.setDiscloseClient(!account?.discloseClient)}}
            checked={account?.discloseClient}
          />
          <span>{intl.formatMessage(t.network.discloseClient)}</span>
          <HelpTip zIndex={1_000}>
            <span>
              {intl.formatMessage(t.network.discloseClientDescription)}
            </span>
          </HelpTip>
        </div>

        <div class={styles.moderationDescription}>
          {intl.formatMessage(t.network.discloseClientDescription)}
        </div>
      </div>

      <div style="height: 64px"></div>

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
