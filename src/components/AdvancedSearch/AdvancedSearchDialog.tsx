import { Component, JSXElement, Show } from 'solid-js';

import styles from './AdvancedSearch.module.scss';
import { hookForDev } from '../../lib/devTools';
import { Dialog } from '@kobalte/core/dialog';


const AdvancedSearchDialog: Component<{
  triggerClass: string,
  triggerContent: JSXElement,
  title: JSXElement,
  children?: JSXElement,
  open?: boolean,
  setOpen?: (v: boolean) => void,
  hideHeader?: boolean,
  id?: string,
}> = (props) => {

  return (
    <Dialog open={props.open} onOpenChange={props.setOpen} preventScroll={false}>
      <Dialog.Trigger class={props.triggerClass}>
        {props.triggerContent}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class={styles.dialogOverlay} />
        <div class={styles.dialog}>
          <Dialog.Content class={styles.dialogContent} >
            <Show when={!props.hideHeader}>
              <div class={styles.dialogHeader}>
                <Dialog.Title class={styles.dialogTitle}>
                  {props.title}
                </Dialog.Title>
                <Dialog.CloseButton class={styles.dialogCloseButton}>
                  <div class={styles.excludeIcon}></div>
                </Dialog.CloseButton>
              </div>
            </Show>
            <Dialog.Description class={styles.dialogDescription}>
              {props.children}
            </Dialog.Description>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default hookForDev(AdvancedSearchDialog);
