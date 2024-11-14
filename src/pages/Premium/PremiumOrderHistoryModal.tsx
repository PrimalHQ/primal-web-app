import { Component, createEffect, For, Show } from 'solid-js';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import Avatar from '../../components/Avatar/Avatar';
import ButtonCopy from '../../components/Buttons/ButtonCopy';
import Modal from '../../components/Modal/Modal';
import QrCode from '../../components/QrCode/QrCode';
import TransactionAmount from '../../components/TransactionAmount/TransactionAmount';
import { authorName, nip05Verification, userName } from '../../stores/profile';
import { account } from '../../translations';

import { PrimalUser } from '../../types/primal';
import { OrderHistoryItem, PremiumStore, PrimalPremiumSubscription } from './Premium';

import styles from './Premium.module.scss';
import PremiumSubscriptionOptions, { PremiumOption } from './PremiumSubscriptionOptions';
import { getOrderListHistory } from '../../lib/premium';
import { useAccountContext } from '../../contexts/AccountContext';
import { APP_ID } from '../../App';
import { subTo } from '../../sockets';
import { shortDate } from '../../lib/dates';


const PremiumOrderHistoryModal: Component<{
  open?: boolean,
  data: PremiumStore,
  setOpen: (v: boolean) => void,
  onOpen?: () => void,
  onClose?: () => void,
  socket: WebSocket | undefined,
}> = (props) => {
  const account = useAccountContext();

  createEffect(() => {
    if (props.open) {
      props.onOpen && props.onOpen();
    } else {
      props.onClose && props.onClose();
    }
  });

  const getAmount = (item: OrderHistoryItem) => {
    if (item.currency === 'usd') {
      return `$${parseFloat(item.amount_usd).toLocaleString()} USD`;
    }

    return `${(parseFloat(item.amount_btc) * 100_000_000).toLocaleString()} sats`;
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
      <div class={styles.orderHistoryModal}>

        <div class={styles.orderHistory}>
              <table>
                <thead>
                  <tr>
                    <th>
                      Date
                    </th>
                    <th>
                      Purchase
                    </th>
                    <th>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={props.data.orderHistory}>
                    {historyItem => (
                      <tr>
                        <td>{shortDate(historyItem.purchased_at)}</td>
                        <td>{historyItem.product_label}</td>
                        <td>{getAmount(historyItem)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
        </div>

      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumOrderHistoryModal
