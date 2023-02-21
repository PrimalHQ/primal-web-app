import { A } from '@solidjs/router';
import { Component, createEffect, For } from 'solid-js';
import { useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import { PrimalNote } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import { calculateStickyPosition } from './helpers';

import styles from './TrendingNotes.module.scss';


const TrendingNotes: Component<{ notes: PrimalNote[] | undefined }> = (props) => {

  const trendNotes = () => {
    console.log('TN: ', props.notes)
    return props.notes ? [...props.notes] : []
  };

  createEffect(() => {
    // If the content changes, recalculate sticky boundary.
    if (trendNotes()) {
      calculateStickyPosition();
    }
  });

  return (
      <div id="trending_wrapper" class={styles.stickyWrapper}>
        <div class={styles.heading}>Trending on Nostr</div>
        <div id="trending_section" class={styles.trendingSection}>
          <For each={trendNotes()}>
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
