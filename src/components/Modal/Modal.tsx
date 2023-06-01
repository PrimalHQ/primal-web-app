import { A, useLocation, useNavigate } from '@solidjs/router';
import { Component, JSXElement, Show } from 'solid-js';
import { Portal, PropAliases } from 'solid-js/web';

import styles from './Modal.module.scss';

const Modal: Component<{ children: JSXElement, open?: boolean}> = (props) => {

  return (
    <Show when={props.open}>
      <Portal mount={document.getElementById("modal") as Node}>
        <div class={styles.modal}>
          {props.children}
        </div>
      </Portal>
    </Show>
  );
}

export default Modal;
