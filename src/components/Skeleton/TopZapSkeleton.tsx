import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const TopZapSkeleton: Component<{
  id?: string,
}> = (props) => {

  return (
    <div class={styles.topZapSkeleton}>
    </div>
  );
}

export default TopZapSkeleton;
