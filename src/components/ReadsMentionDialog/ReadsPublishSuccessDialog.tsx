import { Component } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

import styles from './ReadsMentionDialog.module.scss';
import ButtonPrimary from '../Buttons/ButtonPrimary';


const ReadsPublishSuccessDialog: Component<{
  id?: string,
  open: boolean,
  onClose: (v: boolean) => void,
}> = (props) => {
  return (
    <AdvancedSearchDialog
      triggerClass="hidden"
      open={props.open}
      setOpen={props.onClose}
      title="Success!"
    >
      <div class={styles.readsPublishSuccessDialog}>
        <div class={styles.successCard}>
          <div class={styles.successIcon}></div>
          <div class={styles.successDesc}>
            Your article has been successfully published
          </div>
        </div>

        <div class={styles.actions}>

          <ButtonPrimary
            onClick={() => props.onClose(false)}
          >
            Done
          </ButtonPrimary>
       </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ReadsPublishSuccessDialog);
