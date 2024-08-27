import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ProfileAboutSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.profileAboutSkeleton}>
      <div></div>
    </div>
  );
}

export default ProfileAboutSkeleton;
