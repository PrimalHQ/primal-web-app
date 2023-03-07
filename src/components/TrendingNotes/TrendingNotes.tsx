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

  const context = useFeedContext();

  // const [trendingNotes, setTrendingPosts] = createStore<TrendingNotesStore>({
  //   messages: [],
  //   users: {},
  //   notes: [],
  //   postStats: {},
  // });

  createEffect(() => {
    // If the content changes, recalculate sticky boundary.
    if (context?.data.trendingNotes.notes && context.data.posts) {
      // calculateStickyPosition();
    }
  });

	createEffect(() => {
    if (isConnected()) {
      context?.actions?.clearTrendingNotes();

      getTrending(`trending_${APP_ID}`, 10);
		}
	});

  let lastScroll = 0;
  let lastWrapperScroll = 0;

  const onScroll = () => {
    const wrapper = document.getElementById('trending_wrapper');
    const scrollTop = document.documentElement.scrollTop;
    const diff = lastScroll - scrollTop;

    wrapper?.scrollTo({ top: lastWrapperScroll - diff , behavior: 'instant'});

    lastScroll = scrollTop;
    lastWrapperScroll = wrapper.scrollTop;
  };


  onMount(() => {
    // socket()?.addEventListener('error', onError);
    // socket()?.addEventListener('message', onMessage);
    const wrapper = document.getElementById('trending_wrapper');
    document.addEventListener('scroll', onScroll);
  });

  onCleanup(() => {
    const wrapper = document.getElementById('trending_wrapper');
    document.removeEventListener('scroll', onScroll);
    // socket()?.removeEventListener('error', onError);
    // socket()?.removeEventListener('message', onMessage);
  });

  // const onError = (error: Event) => {
  //   console.log("error: ", error);
  // };

  // const onMessage = (event: MessageEvent) => {
  //   const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

  //   const [type, subId, content] = message;

  //   if (subId === `trending_${APP_ID}`) {
  //     processTrendingPost(type, content);
  //     return;
  //   }

  // };


  // PROCESSING TRENDS -------------------------------------
  // TODO: Cleanup and refactor



    // const proccessPost = (post: NostrPostContent) => {
    //   setTrendingPosts('messages', (msgs) => [ ...msgs, post]);
    // };

    // const proccessUser = (user: NostrUserContent) => {
    //   setTrendingPosts('users', (users) => ({ ...users, [user.pubkey]: user}))
    // };

    // const proccessStat = (stat: NostrStatsContent) => {
    //   const content = JSON.parse(stat.content);
    //   setTrendingPosts('postStats', (stats) => ({ ...stats, [content.event_id]: content }))
    // };

    // const processTrendingPost = (type: string, content: NostrEventContent | undefined) => {

    //   if (type === 'EOSE') {
    //     const newPosts = sortByScore24h(convertToPosts({
    //       users: trendingNotes.users,
    //       messages: trendingNotes.messages,
    //       postStats: trendingNotes.postStats,
    //     }));

    //     setTrendingPosts('notes', () => [...newPosts]);

    //     return;
    //   }

    //   if (type === 'EVENT') {
    //     if (content && content.kind === 0) {
    //       proccessUser(content);
    //     }
    //     if (content && content.kind === 1) {
    //       proccessPost(content);
    //     }
    //     if (content && content.kind === 10000100) {
    //       proccessStat(content);
    //     }
    //   }
    // };


  // ----------------------------------------------------------


  return (
      <div id="trending_wrapper" class={styles.stickyWrapper}>
        <div id="trending_section" class={styles.trendingSection}>
        <div class={styles.headingTrending}>
          <div>
            <div class={styles.flameIcon}></div>
            Trending on Nostr
            <span>24h</span>
          </div>
        </div>
          <For each={context?.data.trendingNotes.notes}>
            {
              (post) =>
                <A href={`/thread/${post.post.noteId}`}>
                  <div class={styles.trendingPost}>
                    <div class={styles.avatar}>
                      <Avatar src={post.user?.picture} size="xxs" />
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
          <div class={styles.headingZapped}>
            <div>
              <div class={styles.zapIcon}></div>
              Most Zapped
              <span>4h</span>
            </div>
          </div>
            <For each={context?.data.trendingNotes.notes}>
              {
                (post) =>
                  <A href={`/thread/${post.post.noteId}`}>
                    <div class={styles.trendingPost}>
                      <div class={styles.avatar}>
                        <Avatar src={post.user?.picture} size="xxs" />
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
