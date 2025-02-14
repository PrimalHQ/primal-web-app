import { A, useResolvedPath } from '@solidjs/router';
import { Component, createEffect, createMemo, For, onCleanup, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Kind } from '../../constants';
import { APP_ID } from '../../App';
import { getExploreFeed } from '../../lib/feed';
import { cacheServer, decompressBlob, isConnected, readData, refreshSocketListeners, removeSocketListeners, socket, subsTo } from '../../sockets';
import { sortingPlan, convertToNotes } from '../../stores/note';
import { convertToUser, emptyUser, truncateNpub } from '../../stores/profile';
import { FeedPage, NostrEOSE, NostrEvent, NostrEventContent, NostrEvents, NostrUserContent, PrimalNote, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';

import styles from './ExploreSidebar.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { getTrendingUsers } from '../../lib/profile';
import { hexToNpub } from '../../lib/keys';
import { exploreSidebarCaption } from '../../translations';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import { loadTrendingUsers, saveTrendingUsers } from '../../lib/localStore';
import { useAppContext } from '../../contexts/AppContext';

const ExploreSidebar: Component<{ id?: string }> = (props) => {

  const intl = useIntl();
  const account = useAccountContext();
  const app = useAppContext();

  const [store, setStore] = createStore<{ users: Record<string, NostrUserContent>, scores: Record<string, number> }>({
    users: {},
    scores: {},
  });

  const [trendingUsers, setTrendingUsers] = createStore<PrimalUser[]>([]);

  const authorName = (user: PrimalUser) => {
    return user.displayName ||
      user.name ||
      truncateNpub(user.npub);
  }

  onMount(() => {
    const users = loadTrendingUsers();

    setTrendingUsers(() => ({ ...users }));
  })

//  ACTIONS -------------------------------------

  const processUsers = (type: string, content: NostrEventContent | undefined) => {

    if (type === 'EOSE') {
      const sortedKeys = Object.keys(store.scores).sort(
        (a, b) => store.scores[b] - store.scores[a]);

      const users = sortedKeys.map(key => {
        if (!store.users[key]) {
          return emptyUser(key);
        }

        return convertToUser(store.users[key], key);
      });

      setTrendingUsers(() => [...users]);
      saveTrendingUsers(users);
      return;
    }

    if (type === 'EVENT') {
      if (content && content.kind === Kind.Metadata) {
        setStore('users', (users) => ({ ...users, [content.pubkey]: content}));
        return;
      }
      if (content && content.kind === Kind.UserScore) {
        const scores = JSON.parse(content.content);

        setStore('scores', () => ({ ...scores }));
        return;
      }
    }
  };

// EFFECTS --------------------------------------

  createEffect(() => {
    if (isConnected()) {
      setStore(() => ({
        users: {},
        scores: {},
      }));
		}
	});

  createEffect(() => {
    if (!isConnected() || !account?.isKeyLookupDone) return;

    const subId = `explore_sidebar_${APP_ID}`
    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content && content.kind === Kind.Metadata) {
          setStore('users', (users) => ({ ...users, [content.pubkey]: content}));
          return;
        }

        if (content && content.kind === Kind.UserScore) {
          const scores = JSON.parse(content.content);

          setStore('scores', () => ({ ...scores }));
          return;
        }
      },
      onEose: () => {
        unsub();
        const sortedKeys = Object.keys(store.scores).sort(
          (a, b) => store.scores[b] - store.scores[a]);

        const users = sortedKeys.map(key => {
          if (!store.users[key]) {
            return emptyUser(key);
          }

          return convertToUser(store.users[key], key);
        });

        setTrendingUsers(() => [...users]);
        saveTrendingUsers(users);
      },
    });

    getTrendingUsers(subId, account?.publicKey);
  })

// RENDER ---------------------------------------

  return (
    <div id={props.id} class={styles.topUsersHolder}>
      <div class={styles.trendingUsersCaption}>
        {intl.formatMessage(exploreSidebarCaption)}
      </div>
      <div class={styles.trendingUsers}>
        <For each={trendingUsers}>
          {
            user => (
              <A
                href={app?.actions.profileLink(user.npub) || ''}
                class={styles.user}
                title={authorName(user)}
              >
                <Avatar user={user} size="vs" />
                <div class={styles.name}>{authorName(user)}</div>
              </A>
            )
          }
        </For>
      </div>
    </div>
  )
}

export default hookForDev(ExploreSidebar);
