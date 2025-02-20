import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const ArticlePreviewPhoneSkeleton: Component<{
  id?: string,
}> = (props) => {


  return (
    <div class={styles.articlePreviewPhoneSkeleton}>
      <div class={styles.header}>
        <div class={styles.avatar}></div>
        <div class={styles.userInfo}></div>
      </div>
      <div class={styles.body}>
        <div class={styles.text}></div>
      </div>
    </div>
  );
}

export default ArticlePreviewPhoneSkeleton;
