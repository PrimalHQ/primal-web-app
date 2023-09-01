import { Component, JSXElement } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './PageCaption.module.scss';

const PageCaption: Component<{ title?: string, children?: JSXElement, id?: string }> = (props) => {
  return (
    <div id={props.id} class={styles.fullHeader}>
      <div class={styles.logo}></div>
      {props.children || props.title || ''}
    </div>
  )
}

export default hookForDev(PageCaption);
