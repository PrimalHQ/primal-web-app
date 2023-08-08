import { useIntl } from '@cookbook/solid-intl';
import { Component, For, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { settings as t } from '../../translations';

// @ts-ignore Bad types in nostr-tools
import { Relay, relayInit } from "nostr-tools";

import styles from './SettingsSidebar.module.scss';
import { cacheServer, isConnected, socket } from '../../sockets';

const SettingsSidebar: Component = () => {

  const intl = useIntl();
  const account = useAccountContext();

  const connectedRelays = () => account?.relays || [];

  const disconnectedRelays = () => {
    const allRelayUrls = Object.keys(account?.relaySettings || {});
    const connectedUrls = connectedRelays().map(r => r.url);

    return allRelayUrls.reduce(
      (acc: Relay[], url) => connectedUrls.includes(url) ? acc : [...acc, relayInit(url)],
      [],
    );
  };

  return (
    <>
      <div class={styles.headingConnectedRelays}>
        <div>
          {intl.formatMessage(t.relays)}
        </div>
      </div>

      <For each={connectedRelays()}>
        {relay => (
          <div class={styles.relayEntry}>
            <div class={styles.connected}></div>
            <span class={styles.relayUrl} title={relay.url}>
              {relay.url}
            </span>
          </div>
        )}
      </For>
      <For each={disconnectedRelays()}>
        {relay => (
          <div class={styles.relayEntry}>
            <div class={styles.disconnected}></div>
            <span class={styles.relayUrl} title={relay.url}>
              {relay.url}
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
    </>
  )
}

export default SettingsSidebar;
