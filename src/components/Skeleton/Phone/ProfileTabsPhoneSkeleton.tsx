import { Component, For, Match, Switch } from 'solid-js';
import FeedNotePhoneSkeleton from './FeedNotePhoneSkeleton';
import ProfileGalleryImagePhoneSkeleton from './ProfileGalleryImagePhoneSkeleton';

import styles from './PhoneSkeleton.module.scss';

const ProfileTabsSkeleton: Component<{
  id?: string,
  tab?: string,
}> = (props) => {
  return (
    <div class={styles.profileTabsSkeletonWrapper}>
      <div class={styles.profileTabsSkeleton}>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>notes</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>replies</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>reads</div>
        </div>
        <div class={styles.tab}>
          <div class={styles.number}></div>
          <div class={styles.labelT}>media</div>
        </div>
      </div>
      <Switch fallback={
        <>
          <For each={new Array(10)}>
            {() => <FeedNotePhoneSkeleton />}
          </For>
        </>
      }>
        <Match when={props.tab === 'media'}>
          <div class={styles.galleryGrid}>
            <For each={new Array(24)}>
              {() => <ProfileGalleryImagePhoneSkeleton />}
            </For>
          </div>
        </Match>
      </Switch>
    </div>
  );
}

export default ProfileTabsSkeleton;
