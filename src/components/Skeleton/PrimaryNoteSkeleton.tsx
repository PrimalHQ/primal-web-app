import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const PrimaryNoteSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.primaryNoteSkeleton}>
      <div class={styles.headerPN}>
        <div class={styles.avatarPN}></div>
        <div class={styles.userInfoPN}>
          <div class={styles.namePN}></div>
          <div class={styles.nip05PN}></div>
        </div>
      </div>

      <div class={styles.bodyPN}>
      </div>

    </div>
  );
}

export default PrimaryNoteSkeleton;
