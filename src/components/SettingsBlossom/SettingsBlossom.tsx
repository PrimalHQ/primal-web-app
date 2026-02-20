import { Component } from 'solid-js';

import styles from './SettingsBlossom.module.scss';
import { hookForDev } from '../../lib/devTools';


const SettingsBlossom: Component<{ id?: string }> = (props) => {

  return (
    <div id={props.id} class={styles.zapSettings}>
      Blossom
    </div>
  );
}

export default hookForDev(SettingsBlossom);
