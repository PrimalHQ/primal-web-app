import { useIntl } from '@cookbook/solid-intl';
// @ts-ignore
import { decode } from 'light-bolt11-decoder';
import { Component, createEffect } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { emptyInvoice } from '../../constants';
import { date, dateFuture } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { humanizeNumber } from '../../lib/stats';
import { lnInvoice } from '../../translations';
import { LnbcInvoice } from '../../types/primal';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import Modal from '../Modal/Modal';
import QrCode from '../QrCode/QrCode';

import styles from './LnQrCodeModal.module.scss';

const LnQrCodeModal: Component<{
  id?: string,
  open?: boolean,
  lnbc: string | undefined,
  onPay?: () => void,
  onClose?: () => void,
}> = (props) => {
  const intl = useIntl();

  const [invoice, setInvoice] = createStore<LnbcInvoice>(emptyInvoice);

  createEffect(() => {
    if (props.lnbc) {
      const dec: LnbcInvoice = decode(props.lnbc);
      setInvoice(reconcile(dec));
    } else {
      setInvoice(reconcile(emptyInvoice));
    }
  });

  const expiryDate = () => {
    const expiry = invoice.sections.find(s => s.name === 'expiry')?.value as number;
    const created = invoice.sections.find(s => s.name === 'timestamp')?.value as number;

    return expiry + created;
  }

  const amount = () =>
    `${humanizeNumber(parseInt(invoice.sections.find(s => s.name === 'amount')?.value ||'0') / 1_000)} sats`;

  const description = () =>
    decodeURI(invoice.sections.find(s => s.name === 'description')?.value) || '';

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={(isOpen: boolean) => !isOpen && props.onClose && props.onClose()}
      title={
        <div class={styles.title}>
          {intl.formatMessage(lnInvoice.title)}
        </div>
      }
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.LnQrCodeModal}>
        <div class={styles.body}>
          <div class={styles.qrCode}>
            <QrCode data={props.lnbc || ''} type="lightning"/>
          </div>

          <div class={styles.description}>{description()}</div>
          <div class={styles.amount}>{amount()}</div>

          <div class={styles.separator}></div>
        </div>

        <div class={styles.footer}>
          <div class={styles.expiryDate}>
            {intl.formatMessage(lnInvoice.expires, { date: dateFuture(expiryDate(), 'long').label })}
          </div>
          <div class={styles.payAction}>
            <ButtonPrimary onClick={props.onPay}>
              {intl.formatMessage(lnInvoice.pay)}
            </ButtonPrimary>
          </div>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(LnQrCodeModal);
