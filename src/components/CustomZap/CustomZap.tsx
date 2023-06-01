import { useIntl } from '@cookbook/solid-intl';
import { A, useLocation, useNavigate } from '@solidjs/router';
import { Component, createSignal, For, JSXElement, Show } from 'solid-js';
import { Portal, PropAliases } from 'solid-js/web';
import { useAccountContext } from '../../contexts/AccountContext';
import { truncateNumber } from '../../lib/notifications';
import { zapNote } from '../../lib/zap';
import { userName } from '../../stores/profile';
import { PrimalNote } from '../../types/primal';
import Modal from '../Modal/Modal';
import { useToastContext } from '../Toaster/Toaster';

import styles from './CustomZap.module.scss';

const availableSatsValues = [
  21,
  420,
  10_000,
  69_000,
  100_000,
  1_000_000,
];

const CustomZap: Component<{ open?: boolean, note: PrimalNote, onSuccess: () => void, onFail: () => void }> = (props) => {

  const toast = useToastContext();
  const account = useAccountContext();
  const intl = useIntl();

  const [selectedValue, setSelectedValue] = createSignal(availableSatsValues[0]);

  const isSelected = (value: number) => value === selectedValue();

  let comment = '';

  const submit = async () => {
    if (account?.hasPublicKey()) {
        const success = await zapNote(props.note, account.publicKey, selectedValue(), comment, account.relays);

        if (success) {
          toast?.sendSuccess(
            intl.formatMessage({
              id: 'toast.zapSuccess',
              defaultMessage: 'Zapped successfully',
              description: 'Toast message indicating successfull zap',
            }),
          );

          props.onSuccess();
          return;
        }

        toast?.sendWarning(
          intl.formatMessage({
            id: 'toast.zapFail',
            defaultMessage: 'We were unable to send this Zap',
            description: 'Toast message indicating failed zap',
          }),
        );

        props.onFail()
      }
  };

  return (
    <Modal open={props.open}>
      <div class={styles.customZap}>
        <div class={styles.header}>
          <div class={styles.title}>
            <div class={styles.zapIcon}></div>
            <div class={styles.caption}>
              Zap {userName(props.note.user)} <span class={styles.amount}>{truncateNumber(selectedValue())}</span> <span class={styles.units}>sats</span>
            </div>
          </div>
          <button class={styles.close} onClick={props.onFail}>
          </button>
        </div>

        <div class={styles.options}>
          <For each={availableSatsValues}>
            {(value) =>
              <button
                class={`${styles.zapOption} ${isSelected(value) ? styles.selected : ''}`}
                onClick={() => setSelectedValue(value)}
              >
                {truncateNumber(value)}
              </button>
            }
          </For>
        </div>

        <input
          type="text"
          class={styles.comment}
          value={comment}
          placeholder={'Comment'}
        />

        <button
          class={styles.action}
          onClick={submit}
        >
          <div class={styles.caption}>
            Zap {userName(props.note.user)} <span class={styles.amount}>{truncateNumber(selectedValue())}</span> <span class={styles.units}>sats</span>
          </div>
        </button>

      </div>
    </Modal>
  );
}

export default CustomZap;
