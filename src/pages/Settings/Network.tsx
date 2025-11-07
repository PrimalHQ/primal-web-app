import { Component, createEffect, createSignal, For, Match, onMount, Show, Switch } from 'solid-js';
import { Relay, relayInit, utils } from "../../lib/nTools";
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
import { getDefaultRelays } from '../../lib/relays';
import { APP_ID } from '../../App';
import { isConnected as isSocketConnected, socket, subsTo } from '../../sockets';
import { createStore } from 'solid-js/store';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { interpretBold } from '../../translationHelpers';
import HelpTip from '../../components/HelpTip/HelpTip';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { logError } from '../../lib/logger';
import { useSettingsContext } from '../../contexts/SettingsContext';
import CheckBox from '../../components/Checkbox/CheckBox';
import { accountStore, addRelay, changeCachingService, connectToRelays, removeRelay, resetRelays, setConnectToPrimaryRelays } from '../../stores/accountStore';


const Network: Component = () => {

  const intl = useIntl();
  const settings = useSettingsContext();

  const [recomendedRelays, setRecomendedRelays] = createStore<Relay[]>([]);
  const [confirmRemoveRelay, setConfirmRemoveRelay] = createSignal('');
  const [invalidCustomRelay, setInvalidCustomRelay] = createSignal(false);
  const [invalidCachingService, setInvalidCachingService] = createSignal(false);

  let customRelayInput: HTMLInputElement | undefined;
  let cachingServiceInput: HTMLInputElement | undefined;

  const relays = () => Object.keys(accountStore.relaySettings);

  const isConnected = (url: string) => {
    if (accountStore.proxyThroughPrimal) return false;

    const relay: string | undefined = accountStore.activeRelays.find(r => utils.normalizeURL(r) === utils.normalizeURL(url));

    return relay !== undefined;
  };

  const isPrimalRelayInUserSettings = () => {
    const rels: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

    return Object.keys(accountStore.relaySettings || {}).includes(rels[0]);
  }

  const onCheckPrimalRelay = () => {
    setConnectToPrimaryRelays(!accountStore.connectToPrimaryRelays)
  };

  const onRemoveRelay = (url: string) => {
    removeRelay(url);

    const myRelays = relays();

    if (myRelays.length === 0) {
      setTimeout(() => {
        connectToRelays({});
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
      addRelay(value);
      setInvalidCustomRelay(false);
    } catch (e) {
      logError('invalid relay input ', e);
      setInvalidCustomRelay(true);
    }
  }

  const resetTheRelays = () => {
    resetRelays(recomendedRelays);
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
      changeCachingService(url.href);
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
        onClick={() => changeCachingService()}
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
            <button class={styles.relayItem} onClick={() => setConfirmRemoveRelay(relay)}>
              <div class={styles.relayEntry}>
                <Switch fallback={<div class={styles.disconnected}></div>}>
                  <Match when={accountStore.proxyThroughPrimal}>
                    <div class={styles.suspended}></div>
                  </Match>

                  <Match when={isConnected(relay)}>
                    <div class={styles.connected}></div>
                  </Match>
                </Switch>

                <div class={styles.webIcon}></div>
                <span class={styles.relayUrl} title={relay}>
                  {relay}
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
          <CheckBox
            id="primal_relay_check"
            checked={accountStore.connectToPrimaryRelays}
            onChange={() => onCheckPrimalRelay()}
            label={`Post a copy of all content to the Primal relay (${import.meta.env.PRIMAL_PRIORITY_RELAYS})`}
          />
        </Show>
      </div>

      <div class={styles.resetRelays}>
        <ButtonLink onClick={resetTheRelays}>
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
          <CheckBox
            id='proxyEvents'
            label=""
            onChange={() => {settings?.actions.setProxyThroughPrimal(!accountStore.proxyThroughPrimal)}}
            checked={accountStore.proxyThroughPrimal}
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

      <div style="height: 64px"></div>

      <ConfirmModal
        open={confirmRemoveRelay().length > 0}
        description={intl.formatMessage(tActions.confirmRemoveRelay, {
          url: confirmRemoveRelay(),
          // @ts-ignore
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
