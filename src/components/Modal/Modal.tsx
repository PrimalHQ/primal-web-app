import { Component, createEffect, JSXElement, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { hookForDev } from '../../lib/devTools';

import styles from './Modal.module.scss';

const Modal: Component<{
  children: JSXElement,
  open?: boolean,
  id?: string,
  opaqueBackdrop?: boolean,
  onClose?: (e: MouseEvent | KeyboardEvent) => void,
}> = (props) => {

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      props.onClose && props.onClose(e);
      return;
    }
  };

  createEffect(() => {
    if (props.open) {
      window.addEventListener('keydown', onKey);
    }
    else {
      window.removeEventListener('keydown', onKey);
    }
  });

  return (
    <Show when={props.open}>
      <Portal mount={document.getElementById("modal") as Node}>
        <div
          id={props.id}
          class={`${styles.modal} ${props.opaqueBackdrop ? styles.opaque : ''}`}
          onClick={(e: MouseEvent) => {
            if (!(e.target as Element).classList.contains(styles.modal)) {
              return;
            }

            props.onClose && props.onClose(e)
          }}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
}

export default hookForDev(Modal);
