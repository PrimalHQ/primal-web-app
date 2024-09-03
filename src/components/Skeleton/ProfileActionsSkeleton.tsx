import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ProfileActionsSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.profileActionsSkeleton}>
      <div class={styles.roundButton}></div>
      <div class={styles.roundButton}></div>
      <div class={styles.roundButton}></div>
      <div class={styles.roundButton}></div>
      <div class={styles.elongButton}></div>
    </div>
  );
}

export default ProfileActionsSkeleton;
