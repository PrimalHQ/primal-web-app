import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ArticleOverviewSkeleton: Component<{
  id?: string,
}> = (props) => {


  return (
    <div class={styles.articleOverviewSkeleton}>
      <div class={styles.image}>
      </div>
      <div class={styles.info}>
      </div>
    </div>
  );
}

export default ArticleOverviewSkeleton;
