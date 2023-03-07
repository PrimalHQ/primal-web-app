import { A, Navigate } from '@solidjs/router';
import { useNavigate, useRouter } from '@solidjs/router/dist/routing';
import { Component, createEffect, createSignal, For, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID, useFeedContext } from '../../contexts/FeedContext';
import { getTrending } from '../../lib/feed';
import { isConnected } from '../../sockets';
import { truncateNpub } from '../../stores/profile';
import { PrimalNote, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';

import styles from './ExploreSidebar.module.scss';

const ExploreSidebar: Component = () => {

  const context = useFeedContext();

  const [
    trendingUsers,
    setTrendingUsers,
  ] = createStore<PrimalUser[]>(
      context?.data.trendingNotes.notes.map(n => n.user) || []
    );

  createEffect(() => {
    if (isConnected()) {
      context?.actions?.clearTrendingNotes();

      getTrending(`trending_${APP_ID}`, 100);
		}
  });

  createEffect(() => {
    const notes = context?.data.trendingNotes;
    const users = notes?.notes.map(n => n.user) || [];

    const unique = users.reduce((acc: PrimalUser[], u) => {
      if (acc.find(e => e.pubkey === u.pubkey)) {
        return acc;
      }

      return [ ...acc, u];
    }, []);

    setTrendingUsers(unique.slice(0, 24));
  });

  return (
    <>
      <div class={styles.trendingUsersCaption}>
        TRENDING USERS
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
