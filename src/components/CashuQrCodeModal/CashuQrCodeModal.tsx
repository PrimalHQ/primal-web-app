import { useIntl } from '@cookbook/solid-intl';
// @ts-ignore
import { decode } from 'light-bolt11-decoder';
import { Component, createEffect, Show } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { emptyInvoice } from '../../constants';
import { date, dateFuture } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { humanizeNumber } from '../../lib/stats';
import { cashuInvoice } from '../../translations';
import { LnbcInvoice } from '../../types/primal';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import Modal from '../Modal/Modal';
import QrCode from '../QrCode/QrCode';
import { getDecodedToken, Token } from "@cashu/cashu-ts";

import styles from './CashuQrCodeModal.module.scss';

const CashuQrCodeModal: Component<{
  id?: string,
  open?: boolean,
  cashu: string | undefined,
  onPay?: () => void,
  onClose?: () => void,
}> = (props) => {
  const intl = useIntl();

  const [invoice, setInvoice] = createStore<Token>({ token: []});

  createEffect(() => {
    if (props.cashu) {
      const dec: Token = getDecodedToken(props.cashu);
      setInvoice(reconcile(dec));
    } else {
      setInvoice(reconcile({ token: [] }));
    }
  });

  const amount = () =>
    `${invoice.token[0]?.proofs.reduce((acc, v) => acc + v.amount, 0) || 0} sats`;

  const description = () => invoice.memo || '';

  return (
    <Modal open={props.open} onClose={props.onClose}>
      <div id={props.id} class={styles.CashuQrCodeModal}>
        <div class={styles.header}>
          <div class={styles.title}>
            {intl.formatMessage(cashuInvoice.title)}
          </div>
          <button class={styles.close} onClick={props.onClose}>
          </button>
        </div>

        <div class={styles.body}>
          <div class={styles.qrCode}>
            <QrCode data={props.cashu || ''} type="lightning"/>
          </div>

          <div class={styles.description}>{description()}</div>
          <div class={styles.amount}>{amount()}</div>

          <div class={styles.separator}></div>
        </div>

        <div class={styles.footer}>
          <div class={styles.mint}>
            <Show when={invoice.token[0]}>
              {intl.formatMessage(cashuInvoice.mint, { url: new URL(invoice.token[0]?.mint).hostname })}
            </Show>
          </div>
          <div class={styles.payAction}>
            <ButtonPrimary onClick={props.onPay}>
              {intl.formatMessage(cashuInvoice.redeem)}
            </ButtonPrimary>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default hookForDev(CashuQrCodeModal);
