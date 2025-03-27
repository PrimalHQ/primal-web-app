import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const NoteSuggestionSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.noteSuggestionSkeleton}>
      <div class={styles.avatarSN}></div>
      <div class={styles.shortNote}>
        <div class={styles.headerSN}></div>
        <div class={styles.contentSN}></div>
      </div>
    </div>
  );
}

export default NoteSuggestionSkeleton;
