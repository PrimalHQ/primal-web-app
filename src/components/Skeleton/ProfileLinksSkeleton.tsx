import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ProfileLinksSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.profileLinksSkeleton}>
      <div class={styles.website}></div>
      <div class={styles.commonFollows}>
        <div class={styles.label}></div>
        <div class={styles.avatarsS}>
          <div class={styles.avatarS}>
            <div class={styles.fillS}></div>
          </div>
          <div class={styles.avatarS}>
            <div class={styles.fillS}></div>
          </div>
          <div class={styles.avatarS}>
            <div class={styles.fillS}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileLinksSkeleton;
