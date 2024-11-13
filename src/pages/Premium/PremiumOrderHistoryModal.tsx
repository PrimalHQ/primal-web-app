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


const PremiumOrderHistoryModal: Component<{
  open?: boolean,
  setOpen: (v: boolean) => void,
  onOpen?: () => void,
  onClose?: () => void,
  socket: WebSocket | undefined,
}> = (props) => {

  createEffect(() => {
    if (props.open) {
      props.onOpen && props.onOpen();
    } else {
      props.onClose && props.onClose();
    }
  });

  const getOrderHistory = () => {
    if (!props.socket) return;

  }

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={props.setOpen}
      triggerClass="hidden"
      title={
        <div>
          Order History
        </div>
      }
    >
      <div class={styles.subscribeModal}>

        <div class={styles.subsModalCaption}>

        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumOrderHistoryModal
