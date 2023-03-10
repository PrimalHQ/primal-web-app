import { A } from '@solidjs/router';
import { Component, createEffect, For, onCleanup, onError, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID, useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import { convertToPosts, getExploreFeed, getTrending, sortByScore24h } from '../../lib/feed';
import { humanizeNumber } from '../../lib/stats';
import { isConnected, socket } from '../../sockets';
import { NostrEOSE, NostrEvent, NostrEventContent, NostrPostContent, NostrStatsContent, NostrUserContent, PrimalNote, TrendingNotesStore } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import { calculateStickyPosition } from './helpers';

import styles from './TrendingNotes.module.scss';


const TrendingNotes: Component = () => {

  const context = useFeedContext();

	createEffect(() => {
    if (isConnected()) {
      context?.actions?.clearTrendingNotes();
      context?.actions?.clearZappedNotes();

      getTrending(`trending_${APP_ID}`, 12);
      getExploreFeed('', `zapped_4h_${APP_ID}`, 'global', 'mostzapped4h', 0, 12);
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
    const wrapper = document.getElementById('trending_wrapper');
    document.addEventListener('scroll', onScroll);
  });

  onCleanup(() => {
    const wrapper = document.getElementById('trending_wrapper');
    document.removeEventListener('scroll', onScroll);
  });

  return (
      <div id="trending_wrapper" class={styles.stickyWrapper}>
        <div id="trending_section" class={styles.trendingSection}>
        <div class={styles.headingTrending}>
          <div>
            <div class={styles.flameIcon}></div>
            Trending
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
                          {date(post.post?.created_at).label}
                        </div>
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
            <For each={context?.data.zappedNotes.notes}>
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
                            {humanizeNumber(post.post.zaps)} zaps
                            <span>, </span>
                            {humanizeNumber(post.post.satszapped)} sats
                          </div>
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
