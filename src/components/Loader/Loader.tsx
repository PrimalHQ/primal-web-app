import { Component } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './Loader.module.scss';

const Loader: Component< { id?: string } > = (props) => {

  return (
    <div id={props.id} class={styles.loader}><span></span></div>
  );
}

export default hookForDev(Loader);
