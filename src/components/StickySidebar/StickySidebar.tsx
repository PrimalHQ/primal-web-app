import { Component, JSXElement } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import Wormhole from '../Wormhole/Wormhole';

import styles from './StickySidebar.module.scss';

const StickySidebar: Component<{ children: JSXElement, id?: string }> = (props) => {

  return (
    <Wormhole
      to="right_sidebar"
    >
      <div id={props.id} class={styles.stickyWrapper}>
        <div class={styles.trendingSection}>
          {props.children}
        </div>
      </div>
    </Wormhole>
  );
}

export default hookForDev(StickySidebar);
