import { Component, createSignal, For } from 'solid-js';
import { useFeedContext } from '../../contexts/FeedContext';
import { date } from '../../lib/dates';
import Avatar from '../Avatar/Avatar';
import Post from '../Post/Post';

import styles from './TrendingPost.module.scss';

const TrendingPost: Component = () => {
  const context = useFeedContext();

  const posts = () => context?.data?.posts.slice(0, 12);

  return (
    <div>
      <ul>
        <For each={posts()}>
          {
            (post) =>
              <li>
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
              </li>
          }
        </For>
      </ul>
    </div>
  );
}

export default TrendingPost;
