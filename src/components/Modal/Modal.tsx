import { Component, createEffect, JSXElement, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Transition } from 'solid-transition-group';
import { hookForDev } from '../../lib/devTools';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

import styles from './Modal.module.scss';

const Modal: Component<{
  children: JSXElement,
  open?: boolean,
  id?: string,
  opaqueBackdrop?: boolean,
  onClose?: (e?: MouseEvent | KeyboardEvent) => void,
}> = (props) => {

  // const onKey = (e: KeyboardEvent) => {
  //   e.stopPropagation();
  //   if (e.code === 'Escape') {
  //     props.onClose && props.onClose(e);
  //     return;
  //   }
  // };

  // createEffect(() => {
  //   if (props.open) {
  //     window.addEventListener('keyup', onKey);
  //   }
  //   else {
  //     window.removeEventListener('keyup', onKey);
  //   }
  // });

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={(isOpen: boolean) => !isOpen && props.onClose && props.onClose()}
      triggerClass={styles.hidden}
    >
        {props.children}
    </AdvancedSearchDialog>
  );
}

export default hookForDev(Modal);
