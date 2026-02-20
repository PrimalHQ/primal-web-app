import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const LiveEventSidebarSkeleton: Component<{
  id?: string,
}> = (props) => {


  return (
    <div class={styles.liveEventSidebarSkeleton}>
      <div class={styles.image}>
      </div>
      <div class={styles.info}>
      </div>
    </div>
  );
}

export default LiveEventSidebarSkeleton;
