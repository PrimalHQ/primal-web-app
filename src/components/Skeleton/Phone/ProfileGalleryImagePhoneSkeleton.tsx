import { Component } from 'solid-js';

import styles from './PhoneSkeleton.module.scss';

const ProfileGalleryImagePhoneSkeleton: Component<{
  id?: string,
}> = (props) => {

  return (
    <div class={styles.profileGalleryImageSkeleton}>
      <div class={styles.zapinfo}></div>
      <div class={styles.zapSubjectInfo}>
        <div class={styles.zapDate}></div>
        <div class={styles.zapSubjectContent}></div>
      </div>
    </div>
  );
}

export default ProfileGalleryImagePhoneSkeleton;
