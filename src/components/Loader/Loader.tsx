import { Component } from 'solid-js';

import styles from './Loader.module.scss';

const Loader: Component = () => {

  return (
    <div class={styles.loader}><span></span></div>
  );
}

export default Loader;
