import { Component } from 'solid-js';

import styles from './PhoneSkeleton.module.scss';

const FeedNotePhoneSkeleton: Component<{
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

export default FeedNotePhoneSkeleton;
