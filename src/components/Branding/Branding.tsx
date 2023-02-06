import type { Component } from 'solid-js';

import styles from './Branding.module.scss';
import logo from '/icons/logo.svg';

const Branding: Component = () => {

    return (
      <div class={styles.branding}>
        <img src={logo} alt="logo" />
        <span>primal</span>
      </div>
    )
}

export default Branding;
