import { Component, JSXElement } from 'solid-js';

import styles from './HelpTip.module.scss';

const HelpTip: Component<{ children?: JSXElement, zIndex?: number }> = (props) => {

  return (
    <div class={styles.helpContent} style={props.zIndex ? `z-index: ${props.zIndex}` : ''}>
      <div class={styles.helpIcon}></div>
      <div class={styles.content}>
        {props.children}
      </div>
    </div>
  );
}

export default HelpTip;
