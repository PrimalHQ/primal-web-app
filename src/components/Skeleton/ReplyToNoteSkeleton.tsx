import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ReplyToNoteSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.replyToNoteSkeleton}>
      <div class={styles.avatarRN}></div>
      <div class={styles.bodyRN}></div>

    </div>
  );
}

export default ReplyToNoteSkeleton;
