import { Component, JSXElement, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './PageCaption.module.scss';

const PageCaption: Component<{
  title?: string,
  children?: JSXElement,
  id?: string,
  extended?: boolean,
}> = (props) => {
  return (
    <div id={props.id} class={`${styles.fullHeader} ${props.extended ? styles.extended : ''}`}>
      <div class={styles.logo}></div>
      <div class={styles.title}>
        <Show
          when={props.children}
          fallback={props.title}
        >
          {props.children}
        </Show>
      </div>
    </div>
  )
}

export default hookForDev(PageCaption);
