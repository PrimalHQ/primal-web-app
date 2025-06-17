import { Component, createEffect } from 'solid-js';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonCopy from '../../components/Buttons/ButtonCopy';
import QrCode from '../../components/QrCode/QrCode';
import TransactionAmount from '../../components/TransactionAmount/TransactionAmount';
import { PrimalPremiumSubscription } from './Premium';

import styles from './Premium.module.scss';


const PremiumStripeModal: Component<{
  open?: boolean,
  setOpen: (v: boolean) => void,
  onOpen?: () => void,
  onClose: () => void,
  subscription: PrimalPremiumSubscription,
  allowSubscriptionChange?: boolean,
}> = (props) => {

  createEffect(() => {
    if (props.open) {
      props.onOpen && props.onOpen();
    } else {
      props.onClose && props.onClose();
    }
  })

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={props.setOpen}
      triggerClass="hidden"
      title={
        <div>
          Stripe
        </div>
      }
    >
      <div class={styles.subscribeModal}>
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumStripeModal
