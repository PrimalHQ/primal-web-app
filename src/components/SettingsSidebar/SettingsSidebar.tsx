import { useIntl } from '@cookbook/solid-intl';
import { Component, For, Show } from 'solid-js';
import { settings as t } from '../../translations';

import { utils } from "../../lib/nTools";

import styles from './SettingsSidebar.module.scss';
import { cacheServer, isConnected, socket } from '../../sockets';
import { hookForDev } from '../../lib/devTools';
import { accountStore } from '../../stores/accountStore';

const SettingsSidebar: Component<{ id?: string }> = (props) => {

  const intl = useIntl();

  const connectedRelays = () => accountStore.activeRelays || [];

  const disconnectedRelays = () => {
    const allRelayUrls = Object.keys(accountStore.relaySettings || {}).map(utils.normalizeURL);
    const connectedUrls = connectedRelays().map(r => utils.normalizeURL(r));

    return allRelayUrls.filter(url => !connectedUrls.includes(url));
  };

  return (
    <div id={props.id}>
      <div class={styles.headingConnectedRelays}>
        <div>
          {intl.formatMessage(t.relays)}
        </div>
      </div>

      <For each={connectedRelays()}>
        {relay => (
          <div class={styles.relayEntry}>
            <Show
              when={!accountStore.proxyThroughPrimal}
              fallback={<div class={styles.suspended}></div>}
            >
              <div class={styles.connected}></div>
            </Show>
            <span class={styles.relayUrl} title={relay}>
              {relay}
            </span>
          </div>
        )}
      </For>
      <For each={disconnectedRelays()}>
        {relayUrl => (
          <div class={styles.relayEntry}>
            <Show
              when={!accountStore.proxyThroughPrimal}
              fallback={<div class={styles.suspended}></div>}
            >
              <div class={styles.disconnected}></div>
            </Show>
            <span class={styles.relayUrl} title={`${relayUrl}`}>
              {`${relayUrl}`}
            </span>
          </div>
        )}
      </For>

      <div class={styles.headingCachingService}>
        <div>
          {intl.formatMessage(t.cashingService)}
        </div>
      </div>

      <div class={styles.relayEntry}>
        <Show
          when={isConnected()}
          fallback={<div class={styles.disconnected}></div>}
        >
          <div class={styles.connected}></div>
        </Show>
        <span>
          {socket()?.url || cacheServer}
        </span>
      </div>
    </div>
  )
}

export default hookForDev(SettingsSidebar);
