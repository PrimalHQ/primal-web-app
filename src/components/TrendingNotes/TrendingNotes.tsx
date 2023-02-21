import { A } from '@solidjs/router';
import { Component, createEffect, For, onCleanup, onError, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID, useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import { convertToPosts, getTrending, sortByScore24h } from '../../lib/feed';
import { isConnected, socket } from '../../sockets';
import { NostrEOSE, NostrEvent, NostrEventContent, NostrPostContent, NostrStatsContent, NostrUserContent, PrimalNote, TrendingNotesStore } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import { calculateStickyPosition } from './helpers';

import styles from './TrendingNotes.module.scss';


const TrendingNotes: Component = () => {


  const [trendingNotes, setTrendingPosts] = createStore<TrendingNotesStore>({
    messages: [],
    users: {},
    notes: [],
    postStats: {},
  });

  createEffect(() => {
    // If the content changes, recalculate sticky boundary.
    if (trendingNotes.notes) {
      calculateStickyPosition();
    }
  });

	createEffect(() => {
    if (isConnected()) {
      setTrendingPosts({
        messages: [],
        users: {},
        postStats: {},
      });
      getTrending(`trending_${APP_ID}`);
		}
	});



  onMount(async () => {
    socket()?.addEventListener('error', onError);
    socket()?.addEventListener('message', onMessage);
  });

  onCleanup(() => {
    socket()?.removeEventListener('error', onError);
    socket()?.removeEventListener('message', onMessage);
  });

  const onError = (error: Event) => {
    console.log("error: ", error);
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `trending_${APP_ID}`) {
      processTrendingPost(type, content);
      return;
    }

  };


  // PROCESSING TRENDS -------------------------------------
  // TODO: Cleanup and refactor



    const proccessPost = (post: NostrPostContent) => {
      setTrendingPosts('messages', (msgs) => [ ...msgs, post]);
    };

    const proccessUser = (user: NostrUserContent) => {
      setTrendingPosts('users', (users) => ({ ...users, [user.pubkey]: user}))
    };

    const proccessStat = (stat: NostrStatsContent) => {
      const content = JSON.parse(stat.content);
      setTrendingPosts('postStats', (stats) => ({ ...stats, [content.event_id]: content }))
    };

    const processTrendingPost = (type: string, content: NostrEventContent | undefined) => {

      if (type === 'EOSE') {
        const newPosts = sortByScore24h(convertToPosts(trendingNotes));

        setTrendingPosts('notes', () => [...newPosts]);

        return;
      }

      if (type === 'EVENT') {
        if (content && content.kind === 0) {
          proccessUser(content);
        }
        if (content && content.kind === 1) {
          proccessPost(content);
        }
        if (content && content.kind === 10000100) {
          proccessStat(content);
        }
      }
    };


  // ----------------------------------------------------------


  return (
      <div id="trending_wrapper" class={styles.stickyWrapper}>
        <div class={styles.heading}>Trending on Nostr</div>
        <div id="trending_section" class={styles.trendingSection}>
          <For each={trendingNotes.notes}>
            {
              (post) =>
                <A href={`/thread/${post.post.id}`}>
                  <div class={styles.trendingPost}>
                    <div class={styles.avatar}>
                      <Avatar src={post.user?.picture} size="xs" />
                    </div>
                    <div class={styles.content}>
                      <div class={styles.header}>
                        <div class={styles.name}>
                          {post.user?.name}
                        </div>
                        <div class={styles.time}>
                          {date(post.post?.created_at).label}</div>
                        </div>
                      <div class={styles.message}>{post.post?.content}</div>
                    </div>
                  </div>
                </A>
            }
          </For>
        </div>
      </div>
  );
}

export default TrendingNotes;
