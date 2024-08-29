import { Component } from 'solid-js';

import feedSkeleton from '../../assets/lottie/primal-loader-webapp-reads.json';


import styles from './Skeleton.module.scss';

const ThreadNoteSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.threadNoteSkeleton}>
      <div class={styles.headerTN}>
        <div class={styles.avatarTN}></div>
        <div class={styles.userInfoTN}></div>
      </div>
      <div class={styles.bodyTN}>
        <div class={styles.fillTN}></div>
      </div>
    </div>
  );
}

export default ThreadNoteSkeleton;
