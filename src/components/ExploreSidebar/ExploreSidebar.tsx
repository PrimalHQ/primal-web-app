import { A } from '@solidjs/router';
import { Component, createEffect, createMemo, For, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Kind } from '../../constants';
import { APP_ID } from '../../App';
import { getExploreFeed } from '../../lib/feed';
import { isConnected, refreshSocketListeners, removeSocketListeners, socket } from '../../sockets';
import { sortingPlan, convertToNotes } from '../../stores/note';
import { convertToUser, truncateNpub } from '../../stores/profile';
import { FeedPage, NostrEOSE, NostrEvent, NostrEventContent, NostrUserContent, PrimalNote, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';

import styles from './ExploreSidebar.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { getTrendingUsers } from '../../lib/profile';

const ExploreSidebar: Component = () => {

  const intl = useIntl();

  const [store, setStore] = createStore<{ users: Record<string, NostrUserContent>, scores: Record<string, number> }>({
    users: {},
    scores: {},
  });

  const [trendingUsers, setTrendingUsers] = createStore<PrimalUser[]>([]);

//  ACTIONS -------------------------------------

  const processUsers = (type: string, content: NostrEventContent | undefined) => {

    if (type === 'EOSE') {
      const sortedKeys = Object.keys(store.scores).sort(
        (a, b) => store.scores[b] - store.scores[a]);

      const users = sortedKeys.map(key => convertToUser(store.users[key]));

      setTrendingUsers(() => [...users]);
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


// SOCKET HANDLERS ------------------------------

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    webSocket.removeEventListener('message', onMessage);
    webSocket.removeEventListener('close', onSocketClose);
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `explore_sidebar_${APP_ID}`) {
      processUsers(type, content);
      return;
    }
  };

// EFFECTS --------------------------------------

  onCleanup(() => {
    removeSocketListeners(
      socket(),
      { message: onMessage, close: onSocketClose },
    );
  });


	createEffect(() => {
    if (isConnected()) {
      refreshSocketListeners(
        socket(),
        { message: onMessage, close: onSocketClose },
      );

      setStore(() => ({
        users: {},
        scores: {},
      }));

      getTrendingUsers(`explore_sidebar_${APP_ID}`, 24);
		}
	});

// RENDER ---------------------------------------

  return (
    <>
      <div class={styles.trendingUsersCaption}>
        {intl.formatMessage({
          id: 'explore.sidebar.caption',
          defaultMessage: 'trending users',
          description: 'Caption for the explore page sidebar showing a list of trending users',
        })}
      </div>
      <div class={styles.trendingUsers}>
        <For each={trendingUsers}>
          {
            user => (
              <A
                href={`/profile/${user.npub}`}
                class={styles.user}
                title={user.name || user.npub}
              >
                <Avatar src={user.picture} size="vs" />
                <div class={styles.name}>{user.name || truncateNpub(user.npub)}</div>
              </A>
            )
          }
        </For>
      </div>
    </>
  )
}

export default ExploreSidebar;
