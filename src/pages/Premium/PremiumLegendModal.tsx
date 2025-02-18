import { Component, createEffect } from 'solid-js';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonCopy from '../../components/Buttons/ButtonCopy';
import QrCode from '../../components/QrCode/QrCode';
import TransactionAmount from '../../components/TransactionAmount/TransactionAmount';
import { PrimalPremiumSubscription } from './Premium';

import styles from './Premium.module.scss';


const PremiumLegendModal: Component<{
  open?: boolean,
  setOpen: (v: boolean) => void,
  onOpen?: () => void,
  onClose?: () => void,
  allowSubscriptionChange?: boolean,
  subscription: PrimalPremiumSubscription,
  caption?: string,
}> = (props) => {

  let wasOpen = false;

  createEffect(() => {
    if (props.open) {
      wasOpen = true;
      props.onOpen && props.onOpen();
    } else if (wasOpen) {
      wasOpen = false;
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
          {props.caption || 'Become a Primal Legend Now'}
        </div>
      }
    >
      <div class={styles.subscribeModal}>

        <div class={styles.subsModalCaption}>

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
            amountBTC={props.subscription.amounts.sats / 100_000_000}
          />
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumLegendModal
