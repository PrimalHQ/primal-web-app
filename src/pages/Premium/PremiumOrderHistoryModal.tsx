import { Component, createEffect, For } from 'solid-js';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import { OrderHistoryItem, PremiumStore } from './Premium';

import styles from './Premium.module.scss';
import { useAccountContext } from '../../contexts/AccountContext';
import { shortDate } from '../../lib/dates';
import Paginator from '../../components/Paginator/Paginator';


const PremiumOrderHistoryModal: Component<{
  open?: boolean,
  data: PremiumStore,
  setOpen: (v: boolean) => void,
  onOpen?: () => void,
  onClose?: () => void,
  onNextPage?: () => void,
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
              <Paginator
                isSmall={true}
                loadNextPage={props.onNextPage}
              />
        </div>

      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumOrderHistoryModal
