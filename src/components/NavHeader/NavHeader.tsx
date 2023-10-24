import { Component} from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './NavHeader.module.scss';

const NavHeader: Component<{
  title: string,
}> = (props) => {
  return (
    <button class={styles.navHeader} onClick={() => {
      window.history.back()
    }}>
      <div class={styles.backIcon}></div>
      <div class={styles.title}>{props.title}</div>
    </button>
  );
}

export default hookForDev(NavHeader);
