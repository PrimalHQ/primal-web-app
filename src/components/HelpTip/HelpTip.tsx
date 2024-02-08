import { Component, JSXElement } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './HelpTip.module.scss';

const HelpTip: Component<{
  children?: JSXElement,
  zIndex?: number,
  id?: string,
  above?: boolean,
}> = (props) => {

  return (
    <div id={props.id} class={styles.helpContent} style={props.zIndex ? `z-index: ${props.zIndex}` : ''}>
      <div class={styles.helpIcon}></div>
      <div class={props.above ? styles.aboveContent : styles.content}>
        {props.children}
      </div>
    </div>
  );
}

export default hookForDev(HelpTip);
