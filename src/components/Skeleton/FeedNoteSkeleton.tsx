import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const FeedNoteSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.feedNoteSkeleton}>
      <div class={styles.headerN}>
        <div class={styles.avatarN}></div>
        <div class={styles.userInfoN}></div>
      </div>
      <div class={styles.contentN}></div>
      <div class={styles.zapsN}>
        <div class={styles.bestZap}></div>
        <div class={styles.restZap}>
          <div class={styles.avatarsZN}>
            <div class={styles.avatarZN}>
              <div class={styles.fillZN}></div>
            </div>
            <div class={styles.avatarZN}>
              <div class={styles.fillZN}></div>
            </div>
            <div class={styles.avatarZN}>
              <div class={styles.fillZN}></div>
            </div>
          </div>
        </div>
      </div>
      <div class={styles.footerN}>
        <div class={styles.footerOptionN}></div>
        <div class={styles.footerOptionN}></div>
        <div class={styles.footerOptionN}></div>
        <div class={styles.footerOptionN}></div>
        <div class={styles.footerOptionN}></div>
      </div>
    </div>
  );
}

export default FeedNoteSkeleton;
