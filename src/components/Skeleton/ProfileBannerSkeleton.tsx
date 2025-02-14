import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ProfileBannerSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.profileBannerSkeleton}>
    </div>
  );
}

export default ProfileBannerSkeleton;
