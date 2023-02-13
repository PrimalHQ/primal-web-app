import { Component, createEffect, For } from 'solid-js';
import { useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import { calculateStickyPosition } from './helpers';

import styles from './TrendingPost.module.scss';


const TrendingPost: Component = () => {
  const context = useFeedContext();

  const posts = () => context?.data?.posts.slice(0, 26);

  createEffect(() => {
    // If the content changes, recalculate sticky boundary.
    if (posts()) {
      calculateStickyPosition();
    }
  });

  return (
      <div id="trending_wrapper" class={styles.stickyWrapper}>
        <div class={styles.heading}>Trending on Nostr</div>
        <div id="trending_section" class={styles.trendingSection}>
          <For each={posts()}>
            {
              (post) =>
                <div class={styles.trendingPost}>
                  <div class={styles.avatar}>
                    <img class={styles.avatarImg} src={post.user.picture} />
                  </div>
                  <div class={styles.content}>
                    <div class={styles.header}>
                      <div class={styles.name}>
                        {post.user.name}
                      </div>
                      <div class={styles.time}>
                        {date(post.post.created_at).label}</div>
                      </div>
                    <div class={styles.message}>{post.post.content}</div>
                  </div>
                </div>
            }
          </For>
        </div>
      </div>
  );
}

export default TrendingPost;
