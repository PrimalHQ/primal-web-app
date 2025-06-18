import { Component, createEffect } from 'solid-js';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonCopy from '../../components/Buttons/ButtonCopy';
import QrCode from '../../components/QrCode/QrCode';
import TransactionAmount from '../../components/TransactionAmount/TransactionAmount';
import { PrimalPremiumSubscription, PremiumStore } from './Premium';

import { Stripe, StripeEmbeddedCheckout } from '@stripe/stripe-js';
import styles from './Premium.module.scss';
import { subsTo } from '../../sockets';
import { subTo } from '../../lib/sockets';
import { APP_ID } from '../../App';
import { initStripe, resolveStripe } from '../../lib/premium';
import { logError } from '../../lib/logger';


const PremiumStripeModal: Component<{
  open?: boolean,
  setOpen: (v: boolean) => void,
  onOpen?: () => void,
  onClose: () => void,
  onSuccess?: () => void,
  getSocket: () => WebSocket | undefined,
  subscription: PrimalPremiumSubscription,
  allowSubscriptionChange?: boolean,
  stripe?: Stripe,
  data: PremiumStore,
}> = (props) => {

  createEffect(() => {
    if (props.open) {
      props.onOpen && props.onOpen();
    } else {
      props.onClose && props.onClose();
      checkout?.destroy();
      sessionId = undefined;
    }
  });

  createEffect(() => {
    if (props.open) {
      embedStripe();
    }
  });

  let checkout: StripeEmbeddedCheckout | undefined;
  let sessionId: string | undefined;

  const fetchClientSecret = async () => {
    const socket = props.getSocket();
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return '';
    }
    try {
      const response = await initStripe(props.data.recipientPubkey, props.data.name, props.data.selectedSubOption.id, socket);

      sessionId = response.session_id;

      return response.client_secret;
    }
    catch (e){
      console.log('FAILED')
      return '';
    }
  };

  const handleComplete = async () => {
    const success = await confirmPayment();

    if (success) {
      checkout?.destroy();
      console.log('COMPLETED: ', checkout);
      props.onSuccess && props.onSuccess();
    }

    sessionId = undefined;
    props.setOpen && props.setOpen(false);
  };

  const confirmPayment = async () => {
    const socket = props.getSocket();
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      const resp = await resolveStripe(props.data.recipientPubkey, sessionId, socket)
      console.log('RESPONSE: ', resp);
      return true;
    } catch (e) {
      logError(`Stripe resolution error: ${e}`);
      return false;
    }


  }

  const embedStripe = async () => {
    checkout = await props.stripe?.initEmbeddedCheckout({
        fetchClientSecret,
        onComplete: handleComplete
      });

      checkout?.mount('#checkout');
  }

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={props.setOpen}
      triggerClass="hidden"
      hideHeader={true}
    >
      <div id="checkout" class={styles.stripeModal}>
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumStripeModal
