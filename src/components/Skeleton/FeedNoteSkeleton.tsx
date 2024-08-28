import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const FeedNoteSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.feedNoteSkeleton}>
      <div class={styles.headerN}>
        <div class={styles.avatarN}></div>
        <div class={styles.userInfoN}></div>
      </div>
      <div class={styles.contentN}></div>
    </div>
  );
}

export default FeedNoteSkeleton;
