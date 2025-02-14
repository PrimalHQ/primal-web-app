import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const AuthorSubscribeSkeleton: Component<{
  id?: string,
}> = (props) => {


  return (
    <div class={styles.authorSubscribeSkeleton}>
    </div>
  );
}

export default AuthorSubscribeSkeleton;
