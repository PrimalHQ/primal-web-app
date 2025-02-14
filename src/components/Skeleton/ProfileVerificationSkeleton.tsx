import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ProfileVerificationSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.profileVerificationSkeleton}>
      <div class={styles.firstRow}>
        <div class={styles.name}></div>
        <div class={styles.time}></div>
      </div>
      <div class={styles.secondRow}>
        <div class={styles.nip05}></div>
        <div class={styles.connections}>
          <div class={styles.follows}></div>
          <div class={styles.follows}></div>
        </div>
      </div>
    </div>
  );
}

export default ProfileVerificationSkeleton;
