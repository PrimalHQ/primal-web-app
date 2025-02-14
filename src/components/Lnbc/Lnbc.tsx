import { Component, createEffect, createSignal, onMount, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
// @ts-ignore
import { decode } from 'light-bolt11-decoder';

import styles from './Lnbc.module.scss';
import { createStore, reconcile } from 'solid-js/store';
import { humanizeNumber } from '../../lib/stats';
import { date, dateFuture } from '../../lib/dates';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonGhost from '../Buttons/ButtonGhost';
import { LnbcInvoice } from '../../types/primal';
import { emptyInvoice, Kind } from '../../constants';
import { useAppContext } from '../../contexts/AppContext';
import { sendMessage, subTo } from '../../lib/sockets';
import { APP_ID } from '../../App';
import { signEvent } from '../../lib/nostrAPI';
import Loader from '../Loader/Loader';
import { logError, logInfo, logWarning } from '../../lib/logger';
import { useToastContext } from '../Toaster/Toaster';
import { useIntl } from '@cookbook/solid-intl';
import { lnInvoice } from '../../translations';


const Lnbc: Component< {
  id?: string,
  lnbc: string,
  alternative?: boolean,
  noBack?: boolean,
  inactive?: boolean,
} > = (props) => {

  const app = useAppContext();
  const toast = useToastContext();
  const intl = useIntl();

  const [invoice, setInvoice] = createStore<LnbcInvoice>({ ...emptyInvoice });

  const [invoiceCopied, setInvoiceCopied] = createSignal(false);

  const [paymentInProgress, setPaymentInProgress] = createSignal(false);

  createEffect(() => {
    try {
      const dec: LnbcInvoice = decode(props.lnbc);
      setInvoice(reconcile({...emptyInvoice}))
      setInvoice(() => ({ ...dec }));
    } catch (e) {
      logError('Failed to decode lightining unvoice: ', e);
    }
  });

  createEffect(() => {
    if (invoiceCopied()) {
      setTimeout(() => {
        setInvoiceCopied(() => false);
      }, 1_000);
    }
  })

  const isLightning = () => invoice.sections.find(s => s.name === 'lightning_network');

  const expiryDate = () => {
    const expiry = invoice.sections.find(s => s.name === 'expiry')?.value as number;
    const created = invoice.sections.find(s => s.name === 'timestamp')?.value as number;

    return expiry + created;
  }

  const hasExpired = () => {
    const today = Math.floor((new Date()).getTime() / 1_000);

    return today > expiryDate();
  }

  const amount = () =>
    `${humanizeNumber(parseInt(invoice.sections.find(s => s.name === 'amount')?.value || '0') / 1_000)} sats`;

  const description = () =>
    decodeURI(invoice.sections.find(s => s.name === 'description')?.value) || '';

  const confirmPayment = () => app?.actions.openConfirmModal({
    title: intl.formatMessage(lnInvoice.confirm.title),
    description: intl.formatMessage(lnInvoice.confirm.description, { amount: amount() }),
    confirmLabel: intl.formatMessage(lnInvoice.confirm.confirmLabel),
    abortLabel: intl.formatMessage(lnInvoice.confirm.abortLabel),
    onAbort: app.actions.closeConfirmModal,
    onConfirm: () => {
      app.actions.closeConfirmModal();
      payInvoice();
    },
  });

  const payInvoice = () => {
    if (props.inactive) return;

    setPaymentInProgress(() => true);
    const walletSocket = new WebSocket('wss://wallet.primal.net/v1');

    walletSocket.addEventListener('close', () => {
      logInfo('PREMIUM SOCKET CLOSED');
    });

    walletSocket.addEventListener('open', () => {
      logInfo('WALLET SOCKET OPENED');
      sendPayment(walletSocket, (success: boolean) => {
        if (!success) {
          toast?.sendWarning(`Failed to pay ${amount()}`);
        }
        walletSocket.close();
        setPaymentInProgress(() => false);
      });
    });
  };

  const sendPayment = async (socket: WebSocket, then?: (success: boolean) => void) => {
    if (props.inactive) return;

    const subId = `sp_${APP_ID}`;

    let success = true;

    const unsub = subTo(socket, subId, (type, _, content) => {
      if (type === 'EOSE') {
        unsub();
        then && then(success);
      }

      if (type === 'NOTICE') {
        success = false;
      }
    });

    const content = JSON.stringify(
      ["withdraw", {
        subwallet: 1,
        lnInvoice: invoice.paymentRequest,
        target_lud16: '',
        note_for_recipient: invoice.sections.find(s => s.name === 'description')?.value || '',
        note_for_self: '',
      }],
    );

    const event = {
      content,
      kind: Kind.WALLET_OPERATION,
      created_at: Math.ceil((new Date()).getTime() / 1000),
      tags: [],
    };

    try {
      const signedEvent = await signEvent(event);

      sendMessage(socket, JSON.stringify([
        "REQ",
        subId,
        {cache: ["wallet", { operation_event: signedEvent }]},
      ]));
    } catch (reason) {
      logError('failed to sign due to: ', reason);
    }
  };

  const klass = () => {
    let k = props.alternative ? styles.lnbcAlter : styles.lnbc;
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
        <Show when={isLightning()}>
          <div class={styles.title}>
            <div class={styles.lnIcon}></div>
            <div>{intl.formatMessage(lnInvoice.title)}</div>
          </div>
        </Show>
        <div class={styles.headerActions}>
          <Show
            when={!hasExpired()}
          >
            <ButtonGhost
              onClick={(e: MouseEvent) => {
                e.preventDefault();
                if (props.inactive) return;

                app?.actions.openLnbcModal(props.lnbc, () => {
                  app.actions.closeLnbcModal();
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
                if (props.inactive) return;

                navigator.clipboard.writeText(props.lnbc);
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
        <Show
          when={!hasExpired()}
          fallback={
            <div class={styles.expiredDate}>
              {intl.formatMessage(lnInvoice.expired, { date: date(expiryDate(), 'long').label })}
            </div>
          }
        >
          <div class={styles.expiryDate}>
            {intl.formatMessage(lnInvoice.expires, { date: dateFuture(expiryDate(), 'long').label })}
          </div>
          <div class={styles.payAction}>
            <ButtonPrimary onClick={(e: MouseEvent) => {
              e.preventDefault();
              !props.inactive && confirmPayment();
            }}>
              {intl.formatMessage(lnInvoice.pay)}
            </ButtonPrimary>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default hookForDev(Lnbc);

// sections = [
//   {
//       "name": "lightning_network",
//       "letters": "ln"
//   },
//   {
//       "name": "coin_network",
//       "letters": "bc",
//       "value": {
//           "bech32": "bc",
//           "pubKeyHash": 0,
//           "scriptHash": 5,
//           "validWitnessVersions": [
//               0
//           ]
//       }
//   },
//   {
//       "name": "amount",
//       "letters": "100u",
//       "value": "10000000"
//   },
//   {
//       "name": "separator",
//       "letters": "1"
//   },
//   {
//       "name": "timestamp",
//       "letters": "pjatlyx",
//       "value": 1708522630
//   },
//   {
//       "name": "payment_secret",
//       "tag": "s",
//       "letters": "sp5938h8ewswdm7smn9yfge6wvfeletzxrujz2kt6yjxl77at09zlys",
//       "value": "2c4f73e5d07377e86e6522519d3989cff2b1187c909565e89237fdeeade517c9"
//   },
//   {
//       "name": "payment_hash",
//       "tag": "p",
//       "letters": "pp5edcuua748en26zlyjga47gpcga3htnw06xmqw4zrkwwz37s45cxq",
//       "value": "cb71ce77d53e66ad0be4923b5f2038476375cdcfd1b6075443b39c28fa15a60c"
//   },
//   {
//       "name": "description",
//       "tag": "d",
//       "letters": "dqgv4h82arn",
//       "value": "enuts"
//   },
//   {
//       "name": "expiry",
//       "tag": "x",
//       "letters": "xqzjc",
//       "value": 600
//   },
//   {
//       "name": "min_final_cltv_expiry",
//       "tag": "c",
//       "letters": "cqpj",
//       "value": 18
//   },
//   {
//       "name": "route_hint",
//       "tag": "r",
//       "letters": "rzjqgfffll4jmjf0tffqtx47xt886gzp9fajp3966xz96gm2xj9cqedxrrld5qq0tgqqqqqqqqqqqqqrssqyg",
//       "value": [
//           {
//               "pubkey": "021294fff596e497ad2902cd5f19673e9020953d90625d68c22e91b51a45c032d3",
//               "short_channel_id": "0c7f6d0007ad0000",
//               "fee_base_msat": 0,
//               "fee_proportional_millionths": 450,
//               "cltv_expiry_delta": 34
//           }
//       ]
//   },
//   {
//       "name": "feature_bits",
//       "tag": "9",
//       "letters": "9qxpqysgq",
//       "value": {
//           "option_data_loss_protect": "unsupported",
//           "initial_routing_sync": "unsupported",
//           "option_upfront_shutdown_script": "unsupported",
//           "gossip_queries": "unsupported",
//           "var_onion_optin": "required",
//           "gossip_queries_ex": "unsupported",
//           "option_static_remotekey": "unsupported",
//           "payment_secret": "required",
//           "basic_mpp": "supported",
//           "option_support_large_channel": "unsupported",
//           "extra_bits": {
//               "start_bit": 20,
//               "bits": [
//                   false,
//                   false,
//                   false,
//                   false,
//                   false,
//                   true,
//                   false,
//                   false,
//                   false,
//                   false
//               ],
//               "has_required": false
//           }
//       }
//   },
//   {
//       "name": "signature",
//       "letters": "ml5za767e9scmd52l8mh8zl0g93n74jq0asr98ezvq0gpw8cmsrknehucng4utdjm3cx5mpzkc3psty5yp3ftddkhhrp2hsvy3q08ucq",
//       "value": "dfe82efb5ec9618db68af9f7738bef41633f56407f60329f22601e80b8f8dc0769e6fcc4d15e2db2dc706a6c22b622182c94206295b5b6bdc6155e0c2440f3f300"
//   },
//   {
//       "name": "checksum",
//       "letters": "ef6k3v"
//   }
// ],
