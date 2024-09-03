import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ProfileLinksSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.profileLinksSkeleton}>
      <div class={styles.website}></div>
      <div class={styles.commonFollows}></div>
    </div>
  );
}

export default ProfileLinksSkeleton;
