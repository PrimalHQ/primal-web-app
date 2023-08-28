import { Component, Show } from 'solid-js';

import styles from './AddToHomeFeedButton.module.scss';

const AddToHomeFeedButton: Component<{
  disabled?: boolean,
  onAdd: () => void,
  activeLabel?: string,
  disabledLabel?: string,
}> = (props) => {

  return (
    <Show
      when={!props.disabled}
      fallback={
        <div class={styles.addToFeed}>
          <div class={styles.noAdd}>
            {props.disabledLabel || ''}
          </div>
        </div>
      }
    >
      <div class={styles.addToFeed}>
        <button
          class={styles.addButton}
          onClick={props.onAdd}
        >
          <span>+</span>
          {props.activeLabel || ''}
        </button>
      </div>
    </Show>
  )
}

export default AddToHomeFeedButton;
