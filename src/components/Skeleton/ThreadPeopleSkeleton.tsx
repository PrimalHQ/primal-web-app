import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ThreadPeopleSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.threadPeopleSkeleton}>
      <div class={styles.headerTP}>
        <div class={styles.avatarTP}></div>
        <div class={styles.userInfoTP}>
          <div class={styles.nameTP}></div>
          <div class={styles.nip05TP}></div>
        </div>
      </div>

      <div class={styles.bodyTP}>
      </div>
    </div>
  );
}

export default ThreadPeopleSkeleton;
