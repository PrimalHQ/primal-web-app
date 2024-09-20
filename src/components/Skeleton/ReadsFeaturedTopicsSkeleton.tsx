import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ReadsFeaturedTopicsSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.readsFeaturedTopicsSkeleton}>
      <div class={styles.topic}>
      </div>
      <div class={styles.topic}>
      </div>
      <div class={styles.topic}>
      </div>
      <div class={styles.topic}>
      </div>
      <div class={styles.topic}>
      </div>
      <div class={styles.topic}>
      </div>
      <div class={styles.topic}>
      </div>
      <div class={styles.topic}>
      </div>
      <div class={styles.topic}>
      </div>
      <div class={styles.topic}>
      </div>
    </div>
  );
}

export default ReadsFeaturedTopicsSkeleton;
