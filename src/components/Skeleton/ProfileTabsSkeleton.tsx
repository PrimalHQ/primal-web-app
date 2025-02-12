import { Component, For, Match, Switch } from 'solid-js';
import FeedNoteSkeleton from './FeedNoteSkeleton';
import ProfileGalleryImageSkeleton from './ProfileGalleryImageSkeleton';

import styles from './Skeleton.module.scss';

const ProfileTabsSkeleton: Component<{
  id?: string,
  tab?: string,
}> = (props) => {
  return (
    <div class={styles.profileTabsSkeletonWrapper}>
      <div class={styles.profileTabsSkeleton}>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>bejegyzés</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>válasz</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>olvasnivaló</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>média</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>zap</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>relé</div>
        </div>
      </div>
      <Switch fallback={
        <>
          <For each={new Array(10)}>
            {() => <FeedNoteSkeleton />}
          </For>
        </>
      }>
        <Match when={props.tab === 'media'}>
          <div class={styles.galleryGrid}>
            <For each={new Array(24)}>
              {() => <ProfileGalleryImageSkeleton />}
            </For>
          </div>
        </Match>
      </Switch>
    </div>
  );
}

export default ProfileTabsSkeleton;
