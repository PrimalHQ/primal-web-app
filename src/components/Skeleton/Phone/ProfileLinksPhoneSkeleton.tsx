import { Component } from 'solid-js';

import styles from './PhoneSkeleton.module.scss';

const ProfileLinksSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.profileLinksSkeleton}>
      <div class={styles.name}></div>
    </div>
  );
}

export default ProfileLinksSkeleton;
