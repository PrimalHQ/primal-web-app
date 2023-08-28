import { Component, JSXElement } from 'solid-js';

import styles from './PageCaption.module.scss';

const PageCaption: Component<{ title?: string, children?: JSXElement }> = (props) => {
  return (
    <div id="central_header" class={styles.fullHeader}>
      <div class={styles.logo}></div>
      {props.children || props.title || ''}
    </div>
  )
}

export default PageCaption;
