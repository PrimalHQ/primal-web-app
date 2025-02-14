import { A, useParams } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Match, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../App';
import Avatar from '../components/Avatar/Avatar';
import PageCaption from '../components/PageCaption/PageCaption';
import { algoNpub, Kind, specialAlgos } from '../constants';
import { hexToNpub, npubToHex } from '../lib/keys';
import { getCategorizedList, getProfileMuteList, getUserProfileInfo } from '../lib/profile';
import { subsTo } from '../sockets';
import { convertToUser, nip05Verification, userName } from '../stores/profile';
import { PrimalUser } from '../types/primal';

import { settings as t } from '../translations';

import styles from './Settings/Settings.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { useToastContext } from '../components/Toaster/Toaster';
import PageTitle from '../components/PageTitle/PageTitle';
import { useAppContext } from '../contexts/AppContext';

const lists: Record<string, string> = {
  primal_nsfw: 'nsfw_list',
  primal_spam: 'spam_list',
};

const Mutelist: Component = () => {
  const params = useParams();

  const intl = useIntl();
  const toast = useToastContext();
  const app = useAppContext();

  const [mutedUsers, setMutedUsers] = createStore<Record<string,PrimalUser>>({});
  const [mutedPubkeys, setMutedPubkeys] = createStore<string[]>([]);
  const [author, setAuthor] = createSignal<PrimalUser>();

  const [isFetching, setIsFetching] = createSignal(true);

  const getMutelist = (id: string) => {
    const npub = specialAlgos.includes(id) ? algoNpub : id;
    const pubkey = npub.startsWith('npub') ? npubToHex(npub) : npub;
    const random = Math.floor(Math.random() * 10_000);
    const subId = `prl_${random}_${APP_ID}`;
    let pubkeys: string[] = [];
    let users: Record<string, PrimalUser> = {};

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content && [Kind.CategorizedPeople, Kind.MuteList].includes(content?.kind || 0)) {
          // @ts-ignore
          pubkeys = content.tags.reduce((acc, t) => t[0] === 'p' ? [...acc, t[1]] : acc, []);
        }
        if (content?.kind === Kind.Metadata) {
          users[content.pubkey] = convertToUser(content, content.pubkey);
        }
      },
      onEose: () => {
        setMutedPubkeys(() => [...pubkeys]);
        setMutedUsers(() => ({ ...users }));
        setIsFetching(false);
        unsub();
      },
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

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content?.kind === Kind.Metadata) {
          user = convertToUser(content, content.pubkey);
        }
      },
      onEose: () => {
        setAuthor(user);
        unsub();
      }
    });

    getUserProfileInfo(pubkey, undefined, subId);
  };

  const user = (pubkey: string) => mutedUsers[pubkey];

  createEffect(() => {
    if (params.npub) {
      getMutelist(params.npub);
      getAuthor(params.npub);
    }
  });

  return (
    <div class={styles.settingsContainer}>
      <PageTitle title={
        specialAlgos.includes(params.npub) ?
          // @ts-ignore
          intl.formatMessage(t.moderation.algos[params.npub]) :
          intl.formatMessage(t.moderation.moderationItem, { name: userName(author()) })
        }
      />

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
              window.navigator.clipboard.writeText(mutedPubkeys.map(hexToNpub).join());
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
          each={mutedPubkeys}
          fallback={
            <Show when={!isFetching()}>
              <div class={styles.emptyListBanner}>
                {intl.formatMessage(t.muted.emptyOther)}
              </div>
            </Show>
          }
        >
          {pubkey => (
            <div class={styles.mutedUser}>
              <Show
                when={user(pubkey)}
                fallback={
                  <A class={styles.userInfo} href={app?.actions.profileLink(pubkey) || ''}>
                    <div class={styles.userName}>
                      <div class={styles.verification}>{hexToNpub(pubkey)}</div>
                    </div>
                  </A>
                }
              >
                <A class={styles.userInfo} href={app?.actions.profileLink(pubkey) || ''}>
                  <Avatar user={user(pubkey)} size='sm' />
                  <div class={styles.userName}>
                    <div class={styles.title}>{userName(user(pubkey))}</div>
                    <div class={styles.verification}>{nip05Verification(user(pubkey))}</div>
                  </div>
                </A>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default Mutelist;
