import { Component, JSXElement } from 'solid-js';
import Wormhole from '../Wormhole/Wormhole';

import styles from './StickySidebar.module.scss';

const StickySidebar: Component<{ children: JSXElement }> = (props) => {

  return (
    <Wormhole
      to="right_sidebar"
    >
      <div id="trending_wrapper" class={styles.stickyWrapper}>
        <div id="trending_section" class={styles.trendingSection}>
          {props.children}
        </div>
      </div>
    </Wormhole>
  );
}

export default StickySidebar;
