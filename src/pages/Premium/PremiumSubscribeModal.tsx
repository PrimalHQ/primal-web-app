import { Component, createEffect, Show } from 'solid-js';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import Avatar from '../../components/Avatar/Avatar';
import ButtonCopy from '../../components/Buttons/ButtonCopy';
import Modal from '../../components/Modal/Modal';
import QrCode from '../../components/QrCode/QrCode';
import TransactionAmount from '../../components/TransactionAmount/TransactionAmount';
import { authorName, nip05Verification, userName } from '../../stores/profile';
import { account } from '../../translations';

import { PrimalUser } from '../../types/primal';
import { PremiumStore, PrimalPremiumSubscription } from './Premium';

import styles from './Premium.module.scss';
import PremiumSubscriptionOptions, { PremiumOption } from './PremiumSubscriptionOptions';


const PremiumSubscribeModal: Component<{
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
          Purchase Primal Premium
        </div>
      }
    >
      <div class={styles.subscribeModal}>

        <div class={styles.subsModalCaption}>
          Pay this lightning invoice to complete your purchase.
          Your subscription will be active immediately.
        </div>

        <div>
          <QrCode data={props.subscription.lnUrl || ''} />
        </div>

        <div class={styles.copyButton}>
          <ButtonCopy
            color="link"
            copyValue={props.subscription.lnUrl || ''}
            labelBeforeIcon={true}
            label={"Copy invoice"}
          />
        </div>

        <div class={styles.pricePlan}>
          <TransactionAmount
            amountUSD={props.subscription.amounts.usd}
            amountSats={props.subscription.amounts.sats}
          />
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumSubscribeModal
