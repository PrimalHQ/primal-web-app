import { A } from '@solidjs/router';
import { Component, createEffect, For } from 'solid-js';
import { APP_ID, useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import { getExploreFeed, getTrending } from '../../lib/feed';
import { humanizeNumber } from '../../lib/stats';
import { isConnected } from '../../sockets';
import Avatar from '../Avatar/Avatar';

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
                <div>
                  <div class={styles.trendingPost}>
                    <A href={`/profile/${post.user.npub}`} class={styles.avatar}>
                      <Avatar src={post.user?.picture} size="xxs" />
                    </A>
                    <A href={`/thread/${post.post.noteId}`} class={styles.content}>
                      <div class={styles.header}>
                        <div class={styles.name}>
                          {post.user?.name}
                        </div>
                        <div class={styles.time}>
                          {date(post.post?.created_at).label}
                        </div>
                      </div>
                      <div class={styles.message}>{post.post?.content}</div>
                    </A>
                  </div>
                </div>
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
                  <div>
                    <div class={styles.trendingPost}>
                      <A href={`/profile/${post.user.npub}`} class={styles.avatar}>
                        <Avatar src={post.user?.picture} size="xxs" />
                      </A>
                      <A href={`/thread/${post.post.noteId}`} class={styles.content}>
                        <div class={styles.header}>
                          <div class={styles.name} title={post.user?.name}>
                            {post.user?.name}
                          </div>
                          <div class={styles.time}>
                            {humanizeNumber(post.post.zaps, true)} zaps
                            <span>, </span>
                            {humanizeNumber(post.post.satszapped, true)} sats
                          </div>
                        </div>
                        <div class={styles.message}>{post.post?.content}</div>
                      </A>
                    </div>
                  </div>
              }
            </For>
          </div>
      </div>
  );
}

export default TrendingNotes;
