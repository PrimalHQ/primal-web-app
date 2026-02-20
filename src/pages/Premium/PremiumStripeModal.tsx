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
import { logError, logWarning } from '../../lib/logger';


const PremiumStripeModal: Component<{
  open?: boolean,
  setOpen: (v: boolean) => void,
  onOpen?: () => void,
  onClose: () => void,
  onSuccess?: () => void,
  onFail?: () => void,
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
      sessionId = undefined;
      try {
        checkout?.destroy();
      }
      catch (e) {
        logWarning('Checkout already destroyed: ', e)
      }
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

      if (!response.client_secret || !response.session_id) {
        return '';
      }

      sessionId = response.session_id;

      return response.client_secret;
    }
    catch (e) {
      return '';
    }
  };

  const handleComplete = async () => {
    const success = await confirmPayment();

    if (success) {
      props.onSuccess && props.onSuccess();
    } else {
      props.onFail?.();
    }

    checkout?.destroy();
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
      return true;
    } catch (e) {
      logError(`Stripe resolution error: ${e}`);
      return false;
    }


  }

  const embedStripe = async () => {
    try {
      const clientSecret = await fetchClientSecret();
      if (clientSecret.length === 0) {
        throw ('failed_to_init_stripe');
      }

      checkout = await props.stripe?.initEmbeddedCheckout({
        fetchClientSecret: () => new Promise((res) => res(clientSecret)),
        onComplete: handleComplete
      });

      checkout?.mount('#checkout');
    }
    catch (e) {
      props.setOpen?.(false);
      props.onFail?.();
    }
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
