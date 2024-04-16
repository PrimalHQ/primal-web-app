import { Component, createEffect, createSignal, Match, onMount, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './Cashu.module.scss';
import { createStore } from 'solid-js/store';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonGhost from '../Buttons/ButtonGhost';
import { useAppContext } from '../../contexts/AppContext';
import Loader from '../Loader/Loader';
import { logError } from '../../lib/logger';
import { useIntl } from '@cookbook/solid-intl';
import { cashuInvoice } from '../../translations';
import { getDecodedToken, Token, TokenEntry } from "@cashu/cashu-ts";
import { useAccountContext } from '../../contexts/AccountContext';


const Cashu: Component< { id?: string, token: string, alternative?: boolean, noBack?: boolean } > = (props) => {

  const account = useAccountContext();
  const app = useAppContext();
  const intl = useIntl();

  const [invoice, setInvoice] = createStore<Token>({ token: [] });
  const [cashuSpendable, setCashuSpendable] = createSignal<boolean>(false);

  const [invoiceCopied, setInvoiceCopied] = createSignal(false);

  const [paymentInProgress, setPaymentInProgress] = createSignal(false);

  const checkMints = async (entries: TokenEntry[]) => {
    let statuses: boolean[] = [];

    for (const entry of entries) {
      const mint = app?.actions.getCashuMint(entry.mint);
      if (!mint) continue;

      const spent = await mint.check({ proofs: entry.proofs.map((p) => ({ secret: p.secret })) });

      const data = spent.spendable.map(s => s);

      statuses = [ ...statuses, ...data];
    }

    setCashuSpendable(() => !statuses.includes(false));
  }

  createEffect(() => {
    if (invoice.token.length === 0) return;

    checkMints(invoice.token);
  });

  createEffect(() => {
    try {
      const dec: Token = getDecodedToken(props.token);
      setInvoice(() => ({ ...dec }));
    } catch (e) {
      logError('Failed to decode cashu token: ', e);
    }
  });

  createEffect(() => {
    if (invoiceCopied()) {
      setTimeout(() => {
        setInvoiceCopied(() => false);
      }, 1_000);
    }
  })

  const amount = () =>
    `${invoice.token[0]?.proofs.reduce((acc, v) => acc + v.amount, 0) || 0} sats`;

  const description = () => invoice.memo || '';

  const confirmPayment = () => app?.actions.openConfirmModal({
    title: intl.formatMessage(cashuInvoice.confirm.title),
    description: intl.formatMessage(cashuInvoice.confirm.description, { amount: amount() }),
    confirmLabel: intl.formatMessage(cashuInvoice.confirm.confirmLabel),
    abortLabel: intl.formatMessage(cashuInvoice.confirm.abortLabel),
    onAbort: app.actions.closeConfirmModal,
    onConfirm: () => {
      app.actions.closeConfirmModal();
      redeemCashu();
    },
  });

  const redeemCashu = () => {
    const lnurl = account?.activeUser?.lud16 ?? '';
    const url = `https://redeem.cashu.me?token=${encodeURIComponent(props.token)}&lightning=${encodeURIComponent(
      lnurl,
    )}&autopay=yes`;

    window.open(url, 'blank_');
  };

  const klass = () => {
    let k = props.alternative ? styles.cashuAlter : styles.cashu;
    if (props.noBack) {
      k += ` ${styles.noBack}`
    }

    return k;
  }

  return (
    <div id={props.id} class={klass()}>
      <Show when={paymentInProgress()}>
        <div class={styles.paymentOverlay}>
          <Loader />
        </div>
      </Show>
      <div class={styles.header}>
        <div class={styles.title}>
          <div class={styles.cashuIcon}></div>
          <div>{intl.formatMessage(cashuInvoice.title)}</div>
        </div>
        <div class={styles.headerActions}>
          <Show when={cashuSpendable()}>
            <ButtonGhost
              onClick={(e: MouseEvent) => {
                e.preventDefault();
                app?.actions.openCashuModal(props.token, () => {
                  app.actions.closeCashuModal();
                  confirmPayment();
                });
              }}
              shrink={true}
            >
              <div class={styles.qrIcon}></div>
            </ButtonGhost>
          </Show>

          <Show
            when={!invoiceCopied()}
            fallback={<div class={styles.copyDone}><div class={styles.checkIcon}></div></div>}
          >
            <ButtonGhost
              onClick={(e: MouseEvent) => {
                e.preventDefault()
                navigator.clipboard.writeText(props.token);
                setInvoiceCopied(() => true);
              }}
              shrink={true}
            >
              <div class={styles.copyIcon}></div>
            </ButtonGhost>
          </Show>
        </div>
      </div>
      <div class={styles.body}>
        <div class={styles.description}>{description()}</div>
        <div class={styles.amount}>{amount()}</div>
      </div>

      <div class={styles.footer}>
        <div class={styles.mint}>
          <Show when={invoice.token[0]}>
            {intl.formatMessage(cashuInvoice.mint, { url: new URL(invoice.token[0]?.mint).hostname })}
          </Show>
        </div>
        <Show
          when={cashuSpendable()}
          fallback={(
            <div class={styles.spent}>
              {intl.formatMessage(cashuInvoice.spent)}
            </div>
          )}
        >
          <div class={styles.payAction}>
            <ButtonPrimary onClick={(e: MouseEvent) => {
              e.preventDefault();
              confirmPayment();
            }}>
              {intl.formatMessage(cashuInvoice.redeem)}
            </ButtonPrimary>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default hookForDev(Cashu);
