import { Component, JSXElement } from 'solid-js';

import styles from './HelpTip.module.scss';

const HelpTip: Component<{ children?: JSXElement }> = (props) => {

  return (
    <div class={styles.helpContent}>
      <div class={styles.helpIcon}></div>
      <div class={styles.content}>
        {props.children}
      </div>
    </div>
  );
}

export default HelpTip;
