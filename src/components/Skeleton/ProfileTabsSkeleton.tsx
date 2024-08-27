import { Component } from 'solid-js';
import FeedNoteSkeleton from './FeedNoteSkeleton';

import styles from './Skeleton.module.scss';

const ProfileTabsSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.profileTabsSkeletonWrapper}>
      <div class={styles.profileTabsSkeleton}>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>notes</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>replies</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>reads</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>media</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>zaps</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>relays</div>
        </div>
      </div>
      <FeedNoteSkeleton />
      <FeedNoteSkeleton />
      <FeedNoteSkeleton />
    </div>
  );
}

export default ProfileTabsSkeleton;
