import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ShortNoteSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.shortNoteSkeleton}>
      <div class={styles.avatarSN}></div>
      <div class={styles.shortNote}>
        <div class={styles.headerSN}></div>
        <div class={styles.contentSN}></div>
      </div>
    </div>
  );
}

export default ShortNoteSkeleton;
