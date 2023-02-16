import { Component, createEffect, For } from 'solid-js';
import { useFeedContext } from '../../contexts/FeedContext';

import styles from './Loader.module.scss';

const Loader: Component = () => {

  return (
    <div class={styles.loader}>
      <div></div>
      <div></div>
    </div>
  );
}

export default Loader;
