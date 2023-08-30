import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t, actions as tActions } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A, Link } from '@solidjs/router';
import { useAccountContext } from '../../contexts/AccountContext';
import { getUserProfiles } from '../../lib/profile';
import { APP_ID } from '../../App';
import { subscribeTo } from '../../sockets';
import { convertToUser, nip05Verification, userName } from '../../stores/profile';
import { Kind } from '../../constants';
import { createStore } from 'solid-js/store';
import { PrimalUser } from '../../types/primal';
import Avatar from '../../components/Avatar/Avatar';
import { hexToNpub } from '../../lib/keys';

const Muted: Component = () => {

  const intl = useIntl();
  const account = useAccountContext();

  const [mutedUsers, setMutedUsers] = createStore<Record<string,PrimalUser>>({});

  const mutedMetadataSubId = `muted_metadata_${APP_ID}`;

  const [isFetching, setIsFetching] = createSignal(true);

  const user = (pubkey: string) => mutedUsers[pubkey] || { pubkey, npub: hexToNpub(pubkey) };

  createEffect(() => {
    if (account && account.isKeyLookupDone) {

      let pubkeys: string[] = [];
      let users: Record<string, PrimalUser> = {};

      const unsub = subscribeTo(mutedMetadataSubId, (type, subId, response) => {
        if (type === 'EVENT') {
          if (response && [Kind.MuteList].includes(response?.kind || 0)) {
            // @ts-ignore
            pubkeys = response.tags.reduce((acc, t) => t[0] === 'p' ? [...acc, t[1]] : acc, []);
          }
          if (response?.kind === Kind.Metadata) {
            users[response.pubkey] = convertToUser(response);
          }
        }

        if (type === 'EOSE') {
          setMutedUsers(() => ({ ...users }));
          setIsFetching(false);
          unsub();
        }
      });

      getUserProfiles(account.muted, mutedMetadataSubId);
    }
  });

  const unMuteUser = (user: PrimalUser) => {
    account?.actions.removeFromMuteList(user.pubkey);
  };

  return (
    <div>
      <PageCaption>
        <Link href='/settings' >{intl.formatMessage(t.index.title)}</Link>:&nbsp;
        <div>{intl.formatMessage(t.muted.title)}</div>
      </PageCaption>

      <div>
        <For
          each={account?.muted}
          fallback={
            <Show when={!isFetching()}>
              <div class={styles.emptyListBanner}>
                {intl.formatMessage(t.muted.empty)}
              </div>
            </Show>
          }
        >
          {pubkey => (
            <div class={styles.mutedUser}>
              <Show
                when={user(pubkey)}
                fallback={
                  <>
                    <Link class={styles.userInfo} href={`/p/${hexToNpub(pubkey)}`}>
                      <div class={styles.userName}>
                        <div class={styles.verification}>{hexToNpub(pubkey)}</div>
                      </div>
                    </Link>
                    <button onClick={() => unMuteUser(user(pubkey))}>
                      {intl.formatMessage(tActions.unmute)}
                    </button>
                  </>
                }
              >
                <Link class={styles.userInfo} href={`/p/${user(pubkey).npub}`}>
                  <Avatar src={user(pubkey).picture} size='sm' />
                  <div class={styles.userName}>
                    <div class={styles.title}>{userName(user(pubkey))}</div>
                    <div class={styles.verification}>{nip05Verification(user(pubkey))}</div>
                  </div>
                </Link>
                <button onClick={() => unMuteUser(user(pubkey))}>
                  {intl.formatMessage(tActions.unmute)}
                </button>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

export default Muted;
