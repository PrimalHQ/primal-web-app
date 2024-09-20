import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ArticleSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.articleSkeleton}>
      <div class={styles.header}>
        <div class={styles.avatar}></div>
        <div class={styles.userInfo}>
          <div class={styles.name}></div>
          <div class={styles.nip05}></div>
        </div>
      </div>

      <div class={styles.body}>
        <div class={styles.toolbar}>
          <div class={styles.time}></div>
          <div class={styles.title}></div>
        </div>


        <div class={styles.image}></div>

        <div class={styles.summary}>
        </div>

        <div class={styles.content}>
        </div>


      </div>

    </div>
  );
}

export default ArticleSkeleton;
