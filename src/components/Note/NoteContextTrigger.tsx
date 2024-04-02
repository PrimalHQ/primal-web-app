import { Component } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './Note.module.scss';


const NoteContextTrigger: Component<{
  ref: HTMLDivElement | undefined,
  id?: string,
  onClick?: () => void,
}> = (props) => {
  return (
    <div ref={props.ref} class={styles.context}>
      <button
        class={styles.contextButton}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.onClick && props.onClick();
        }}
      >
        <div class={styles.contextIcon} ></div>
      </button>
    </div>
  )
}

export default hookForDev(NoteContextTrigger);
