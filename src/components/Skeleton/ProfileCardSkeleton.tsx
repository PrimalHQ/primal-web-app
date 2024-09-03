import { Component } from 'solid-js';
import ProfileAboutSkeleton from './ProfileAboutSkeleton';
import ProfileActionsSkeleton from './ProfileActionsSkeleton';
import ProfileAvatarSkeleton from './ProfileAvatarSkeleton';
import ProfileBannerSkeleton from './ProfileBannerSkeleton';
import ProfileLinksSkeleton from './ProfileLinksSkeleton';
import ProfileTabsSkeleton from './ProfileTabsSkeleton';

import styles from './Skeleton.module.scss';

const ProfileCardSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.profileCardSkeleton}>
      <ProfileBannerSkeleton />
      <div class={styles.userImage}>
        <ProfileAvatarSkeleton />
      </div>
      <div class={styles.profileActions}>
        <ProfileActionsSkeleton />
      </div>
      <div class={styles.profileSection}>
        <ProfileLinksSkeleton />
      </div>
      <div class={styles.profileSection}>
        <ProfileAboutSkeleton />
      </div>

      <ProfileTabsSkeleton />
    </div>
  );
}

export default ProfileCardSkeleton;
