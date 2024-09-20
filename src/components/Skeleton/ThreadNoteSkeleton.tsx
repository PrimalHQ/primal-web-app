import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ThreadNoteSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.threadNoteSkeleton}>
      <div class={styles.headerTN}>
        <div class={styles.avatarTN}></div>
      </div>
      <div class={styles.bodyTN}>
        <div class={styles.fillTN}></div>
      </div>
    </div>
  );
}

export default ThreadNoteSkeleton;
