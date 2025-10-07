import { Component } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { hookForDev } from '../../lib/devTools';

import styles from './Note.module.scss';
import { ariaLabels as tAria } from '../../translations';


const NoteContextTrigger: Component<{
  ref: HTMLDivElement | undefined,
  id?: string,
  onClick?: () => void,
}> = (props) => {
  const intl = useIntl();

  return (
    <div ref={props.ref} class={styles.context}>
      <button
        type="button"
        class={styles.contextButton}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.onClick && props.onClick();
        }}
        aria-label={intl.formatMessage(tAria.noteContext.open)}
        title={intl.formatMessage(tAria.noteContext.open)}
      >
        <div class={styles.contextIcon} aria-hidden="true"></div>
      </button>
    </div>
  )
}

export default hookForDev(NoteContextTrigger);
