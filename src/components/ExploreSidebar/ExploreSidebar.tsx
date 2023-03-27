import { A } from '@solidjs/router';
import { Component, createEffect, createMemo, For, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Kind } from '../../constants';
import { APP_ID } from '../../contexts/FeedContext';
import { getExploreFeed } from '../../lib/feed';
import { isConnected, refreshSocketListeners, removeSocketListeners, socket } from '../../sockets';
import { sortingPlan, convertToNotes } from '../../stores/note';
import { truncateNpub } from '../../stores/profile';
import { FeedPage, NostrEOSE, NostrEvent, NostrEventContent, PrimalNote, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';

import styles from './ExploreSidebar.module.scss';

const ExploreSidebar: Component = () => {

  const [data, setData] = createStore<Record<string, FeedPage & { notes: PrimalNote[] }>>({
    trending: {
      messages: [],
      users: {},
      postStats: {},
      notes: [],
    }
  });

  const trendingUsers = createMemo(() => {
    const notes: PrimalNote[] = data.trending.notes;
    const users = notes.map(n => n.user) || [];

    const unique = users.reduce((acc: PrimalUser[], u) => {
      if (acc.find(e => e.pubkey === u.pubkey)) {
        return acc;
      }

      return [ ...acc, u];
    }, []);

    return unique.slice(0, 24);
  });

//  ACTIONS -------------------------------------

  const processNotes = (type: string, key: string, content: NostrEventContent | undefined) => {

    const sort = sortingPlan(key);

    if (type === 'EOSE') {
      const newPosts = sort(convertToNotes({
        users: data[key].users,
        messages: data[key].messages,
        postStats: data[key].postStats,
      }));

      setData(key, 'notes', () => [ ...newPosts ]);

      return;
    }

    if (type === 'EVENT') {
      if (content && content.kind === Kind.Metadata) {
        setData(key, 'users', (users) => ({ ...users, [content.pubkey]: content}))
      }
      if (content && (content.kind === Kind.Text || content.kind === Kind.Repost)) {
        setData(key, 'messages',  (msgs) => [ ...msgs, content]);
      }
      if (content && content.kind === Kind.NoteStats) {
        const stat = JSON.parse(content.content);
        setData(key, 'postStats', (stats) => ({ ...stats, [stat.event_id]: stat }))
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
      processNotes(type, 'trending', content);
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

      setData(() => ({
        trending: {
          messages: [],
          users: {},
          postStats: {},
          notes: [],
        },
      }));

      getExploreFeed('', `explore_sidebar_${APP_ID}`, 'global', 'trending', 0, 100);
		}
	});

// RENDER ---------------------------------------

  return (
    <>
      <div class={styles.trendingUsersCaption}>
        TRENDING USERS
      </div>
      <div class={styles.trendingUsers}>
        <For each={trendingUsers()}>
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
