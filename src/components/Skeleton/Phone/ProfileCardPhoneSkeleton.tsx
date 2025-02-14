import { Component } from 'solid-js';
import ProfileAboutPhoneSkeleton from './ProfileAboutPhoneSkeleton';
import ProfileActionsPhoneSkeleton from './ProfileActionsPhoneSkeleton';
import ProfileAvatarPhoneSkeleton from './ProfileAvatarPhoneSkeleton';
import ProfileBannerPhoneSkeleton from './ProfileBannerPhoneSkeleton';
import ProfileLinksPhoneSkeleton from './ProfileLinksPhoneSkeleton';
import ProfileTabsPhoneSkeleton from './ProfileTabsPhoneSkeleton';

import styles from './PhoneSkeleton.module.scss';

const ProfileCardSkeleton: Component<{
  id?: string,
  tab?: string,
}> = (props) => {
  return (
    <div class={styles.profileCardSkeleton}>
      <ProfileBannerPhoneSkeleton />
      <div class={styles.userImage}>
        <ProfileAvatarPhoneSkeleton />
      </div>
      <div class={styles.profileActions}>
        <ProfileActionsPhoneSkeleton />
      </div>
      <div class={styles.profileSection}>
        <ProfileLinksPhoneSkeleton />
      </div>
      <div class={styles.profileSection}>
        <ProfileAboutPhoneSkeleton />
      </div>

      <ProfileTabsPhoneSkeleton tab={props.tab} />
    </div>
  );
}

export default ProfileCardSkeleton;
