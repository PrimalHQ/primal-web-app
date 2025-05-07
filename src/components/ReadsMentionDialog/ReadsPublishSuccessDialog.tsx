import { useIntl } from '@cookbook/solid-intl';
import { Component, createSignal } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useAppContext } from '../../contexts/AppContext';
import { hookForDev } from '../../lib/devTools';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

import styles from './ReadsMentionDialog.module.scss';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { useSearchContext } from '../../contexts/SearchContext';
import { useProfileContext } from '../../contexts/ProfileContext';


const ReadsPublishSuccessDialog: Component<{
  id?: string,
  open: boolean,
  onClose: (v: boolean) => void,
}> = (props) => {

  const intl = useIntl();
  const account = useAccountContext();
  const app = useAppContext();
  const search = useSearchContext();
  const profile = useProfileContext();

  const [promotion, setPromotion] = createSignal('');
  const [showPromotion, setShowPromotion] = createSignal(false);


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
