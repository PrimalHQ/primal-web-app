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

const Muted: Component = () => {

  const intl = useIntl();
  const account = useAccountContext();

  const [mutedUsers, setMutedUsers] = createStore<PrimalUser[]>([]);

  const mutedMetadataSubId = `muted_metadata_${APP_ID}`;

  const [isFetching, setIsFetching] = createSignal(true);

  createEffect(() => {
    if (account && account.isKeyLookupDone) {

      let users: PrimalUser[] = [];

      const unsub = subscribeTo(mutedMetadataSubId, (type, subId, content) => {
        if (type === 'EVENT') {
          if (content?.kind === Kind.Metadata) {
            users.push(convertToUser(content));
          }
        }

        if (type === 'EOSE') {
          setMutedUsers(() => [ ...users ]);
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
          each={mutedUsers}
          fallback={
            <Show when={!isFetching()}>
              <div class={styles.emptyListBanner}>
                {intl.formatMessage(t.muted.empty)}
              </div>
            </Show>
          }
        >
          {user => (
            <div class={styles.mutedUser}>
              <A class={styles.userInfo} href={`/p/${user.npub}`}>
                <Avatar src={user.picture} size='sm' />
                <div class={styles.userName}>
                  <div class={styles.title}>{userName(user)}</div>
                  <div class={styles.verification}>{nip05Verification(user)}</div>
                </div>
              </A>
              <button onClick={() => unMuteUser(user)}>
                {intl.formatMessage(tActions.unmute)}
              </button>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

export default Muted;
