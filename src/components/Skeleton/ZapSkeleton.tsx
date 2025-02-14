import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ZapSkeleton: Component<{
  id?: string,
}> = (props) => {

  return (
    <div class={styles.zapSkeleton}>
      <div class={styles.zapinfo}></div>
      <div class={styles.zapSubjectInfo}>
        <div class={styles.zapDate}></div>
        <div class={styles.zapSubjectContent}></div>
      </div>
    </div>
  );
}

export default ZapSkeleton;
