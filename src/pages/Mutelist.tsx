import { A, Link, useParams } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Match, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../App';
import Avatar from '../components/Avatar/Avatar';
import PageCaption from '../components/PageCaption/PageCaption';
import { algoNpub, Kind, specialAlgos } from '../constants';
import { npubToHex } from '../lib/keys';
import { getCategorizedList, getFilterlists, getProfileMuteList, getUserProfileInfo, getUserProfiles } from '../lib/profile';
import { subscribeTo } from '../sockets';
import { convertToUser, nip05Verification, userName } from '../stores/profile';
import { NostrUserContent, PrimalUser } from '../types/primal';

import { settings as t } from '../translations';

import styles from './Settings/Settings.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { useToastContext } from '../components/Toaster/Toaster';
import Branding from '../components/Branding/Branding';
import Wormhole from '../components/Wormhole/Wormhole';

const lists: Record<string, string> = {
  primal_nsfw: 'nsfw_list',
  primal_spam: 'spam_list',
};

const Mutelist: Component = () => {
  const params = useParams();

  const intl = useIntl();
  const toast = useToastContext();

  const [mutedUsers, setMutedUsers] = createStore<PrimalUser[]>([]);
  const [author, setAuthor] = createSignal<PrimalUser>();

  const [isFetching, setIsFetching] = createSignal(true);

  const getMutelist = (id: string) => {
    const npub = specialAlgos.includes(id) ? algoNpub : id;
    const pubkey = npub.startsWith('npub') ? npubToHex(npub) : npub;
    const random = Math.floor(Math.random() * 10_000);
    const subId = `prl_${random}_${APP_ID}`;
    let users: PrimalUser[] = [];

    const unsub = subscribeTo(subId, (type, _, response) => {
      if (type === 'EVENT') {
        if (response?.kind === Kind.Metadata) {
          users.push(convertToUser(response));
        }
      }

      if (type === 'EOSE') {
        setMutedUsers(() => [ ...users ]);
        setIsFetching(false);
        unsub();
      }
    });

    if (specialAlgos.includes(id)) {
      getCategorizedList(pubkey, lists[id], subId);
      return;
    }

    getProfileMuteList(pubkey, subId);
  };

  const getAuthor = (id: string) => {
    const npub = specialAlgos.includes(id) ? algoNpub : id;
    const pubkey = npub.startsWith('npub') ? npubToHex(npub) : npub;
    const random = Math.floor(Math.random() * 10_000);
    const subId = `profile_${random}_${APP_ID}`;
    let user: PrimalUser | undefined;

    const unsub = subscribeTo(subId, (type, _, response) => {
      if (type === 'EVENT') {
        if (response?.kind === Kind.Metadata) {
          user = convertToUser(response);
        }
      }

      if (type === 'EOSE') {
        setAuthor(user);
        unsub();
      }
    });

    getUserProfileInfo(pubkey, subId);
  };

  createEffect(() => {
    if (params.npub) {
      getMutelist(params.npub);
      getAuthor(params.npub);
    }
  });

  return (
    <div class={styles.settingsContainer}>
      <Wormhole to='branding_holder'>
        <Branding small={false} />
      </Wormhole>

      <PageCaption>
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="display: flex; align-items: center;">
            <Switch>
              <Match when={author() && specialAlgos.includes(params.npub)}>
                <div style="height: 44px;">
                  {
                    // @ts-ignore
                    intl.formatMessage(t.moderation.algos[params.npub])
                  }
                </div>
              </Match>
              <Match when={author()}>
                <div style="height: 44px;">
                  {intl.formatMessage(t.moderation.moderationItem, { name: userName(author()) })}
                </div>
              </Match>
            </Switch>
          </div>
          <button
            class={styles.clearButton}
            onClick={() => {
              window.navigator.clipboard.writeText(mutedUsers.map(u => u.npub).join());
              toast?.sendSuccess('Mute list copied to clipboard')
            }}
            title="copy mutelist to clipboard"
          >
            <div class={styles.copyIcon}></div>
          </button>
        </div>
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
              <Link class={styles.userInfo} href={`/p/${user.npub}`}>
                <Avatar src={user.picture} size='sm' />
                <div class={styles.userName}>
                  <div class={styles.title}>{userName(user)}</div>
                  <div class={styles.verification}>{nip05Verification(user)}</div>
                </div>
              </Link>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default Mutelist;
