import { A } from '@solidjs/router';
import { Component, createEffect, For, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { date } from '../../lib/dates';
import { getExploreFeed } from '../../lib/feed';
import { humanizeNumber } from '../../lib/stats';
import { convertToNotes, sortingPlan } from '../../stores/note';
import Avatar from '../Avatar/Avatar';
import { Kind } from '../../constants';
import {
  isConnected,
  refreshSocketListeners,
  removeSocketListeners,
  socket
} from '../../sockets';
import {
  FeedPage,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  PrimalNote
} from '../../types/primal';

import styles from './HomeSidebar.module.scss';
import SmallNote from '../SmallNote/SmallNote';


const HomeSidebar: Component = () => {

  const [data, setData] = createStore<Record<string, FeedPage & { notes: PrimalNote[] }>>({
    trending: {
      messages: [],
      users: {},
      postStats: {},
      notes: [],
    },
    mostzapped: {
      messages: [],
      users: {},
      postStats: {},
      notes: [],
    },
  });

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
        mostzapped: {
          messages: [],
          users: {},
          postStats: {},
          notes: [],
        },
      }));

      getExploreFeed('', `sidebar_trending_${APP_ID}`, 'global', 'trending', 0, 12);
      getExploreFeed('', `sidebar_zapped_${APP_ID}`, 'global', 'mostzapped4h', 0, 12);
		}
	});

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

    if (subId === `sidebar_trending_${APP_ID}`) {
      processNotes(type, 'trending', content);
      return;
    }
    if (subId === `sidebar_zapped_${APP_ID}`) {
      processNotes(type, 'mostzapped', content);
      return;
    }
  };

  return (
    <div>
      <div class={styles.headingTrending}>
        <div>
          <div class={styles.flameIcon}></div>
          Trending
          <span>24h</span>
        </div>
      </div>

      <For each={data.trending.notes}>
        {(note) => <SmallNote note={note} />}
      </For>

      <div class={styles.headingZapped}>
        <div>
          <div class={styles.zapIcon}></div>
          Most Zapped
          <span>4h</span>
        </div>
      </div>
      <For each={data.mostzapped.notes}>
        {
          (note) =>
            <SmallNote
              note={note}
            >
              {humanizeNumber(note.post.zaps, true)} zaps
              <span>, </span>
              {humanizeNumber(note.post.satszapped, true)} sats
            </SmallNote>
        }
      </For>
    </div>
  );
}

export default HomeSidebar;
