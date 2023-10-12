import { Component, JSXElement, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { hookForDev } from '../../lib/devTools';

import styles from './Modal.module.scss';

const Modal: Component<{
  children: JSXElement,
  open?: boolean,
  id?: string,
  opaqueBackdrop?: boolean,
}> = (props) => {

  return (
    <Show when={props.open}>
      <Portal mount={document.getElementById("modal") as Node}>
        <div id={props.id} class={`${styles.modal} ${props.opaqueBackdrop ? styles.opaque : ''}`}>
          {props.children}
        </div>
      </Portal>
    </Show>
  );
}

export default hookForDev(Modal);
