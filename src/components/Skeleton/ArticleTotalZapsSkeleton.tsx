import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ArticleTotalZapsSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.articleTotalZapsSkeleton}>
      <div class={styles.zapNumber}></div>
    </div>
  );
}

export default ArticleTotalZapsSkeleton;
