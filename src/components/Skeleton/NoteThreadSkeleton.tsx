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
          <div class={styles.tools}>
            <div class={styles.tool}></div>
            <div class={styles.tool}></div>
            <div class={styles.tool}></div>
          </div>
        </div>

        <div class={styles.title}></div>

        <div class={styles.image}></div>

        <div class={styles.summary}>
          <div class={styles.border}></div>
          <div class={styles.summaryText}>
            <div class={styles.firstLine}></div>
            <div class={styles.secondLine}></div>
          </div>
        </div>

        <div class={styles.topZaps}>
          <div class={styles.firstZap}></div>

          <div class={styles.restZap}>
          <div class={styles.zap}></div>
          <div class={styles.zap}></div>
          <div class={styles.zap}></div>
          <div class={styles.zap}></div>
          <div class={styles.zap}></div>
          </div>
        </div>


      </div>

    </div>
  );
}

export default ArticleSkeleton;
