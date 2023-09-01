import type { Component } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './PageNav.module.scss';

const PageNav: Component<{ id?: string }> = (props) => {

  const onBack = () => {
    window.history.back();
  }

  const onNext = () => {
    window.history.forward();
  }

  return (
    <div id={props.id}>
      <button onClick={onBack} class={styles.backIcon}>
      </button>
      <button onClick={onNext} class={styles.forwardIcon}>
      </button>
    </div>
  )
}

export default hookForDev(PageNav);
