import { Component } from 'solid-js';

import styles from './PhoneSkeleton.module.scss';

const ProfileAvatarSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.profileAvatarSkeleton}>
      <div class={styles.background}></div>
    </div>
  );
}

export default ProfileAvatarSkeleton;
