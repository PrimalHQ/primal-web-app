import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, For } from 'solid-js';
import { defaultZap, defaultZapOptions } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { hookForDev } from '../../lib/devTools';
import { zapNote, zapProfile } from '../../lib/zap';
import { userName } from '../../stores/profile';
import { toastZapFail, zapCustomOption, actions as tActions, placeholders as tPlaceholders, zapCustomAmount } from '../../translations';
import { PrimalNote, PrimalUser, ZapOption } from '../../types/primal';
import { debounce } from '../../utils';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import Modal from '../Modal/Modal';
import { lottieDuration } from '../Note/NoteFooter/NoteFooter';
import TextInput from '../TextInput/TextInput';
import { useToastContext } from '../Toaster/Toaster';

import styles from './CustomZap.module.scss';

const CustomZap: Component<{
  id?: string,
  open?: boolean,
  note?: PrimalNote,
  profile?: PrimalUser,
  onConfirm: (zapOption?: ZapOption) => void,
  onSuccess: (zapOption?: ZapOption) => void,
  onFail: (zapOption?: ZapOption) => void,
  onCancel: (zapOption?: ZapOption) => void
}> = (props) => {

  const toast = useToastContext();
  const account = useAccountContext();
  const intl = useIntl();
  const settings = useSettingsContext();

  const [selectedValue, setSelectedValue] = createSignal(settings?.availableZapOptions[0] || defaultZapOptions[0]);
  const [comment, setComment] = createSignal(defaultZapOptions[0].message || '');

  createEffect(() => {
    setSelectedValue(settings?.availableZapOptions[0] || defaultZapOptions[0])
  });

  const isSelected = (value: ZapOption) => {
    const sel = selectedValue();
    return value.amount === sel.amount && value.emoji === sel.emoji && value.message === sel.message;
  };

  const updateCustomAmount = (value: string) => {
    const amount = parseInt(value.replaceAll(',', ''));

    if (isNaN(amount)) {
      setSelectedValue(() => ({ amount: 0 }))
    };

    setSelectedValue(()=> ({ amount }));
  };

  const truncateNumber = (amount: number) => {
    const t = 1000;

    if (amount < t) {
      return `${amount}`;
    }

    if (amount < Math.pow(t, 2)) {
      return (amount % t === 0) ?
        `${Math.floor(amount / t)}K` :
        intl.formatNumber(amount);
    }

    if (amount < Math.pow(t, 3)) {
      return (amount % t === 0) ?
        `${Math.floor(amount / Math.pow(t, 2))}M` :
        intl.formatNumber(amount);
    }

    if (amount < Math.pow(t, 4)) {
      return (amount % t === 0) ?
        `${Math.floor(amount / Math.pow(t, 3))}B` :
        intl.formatNumber(amount);
    }

    if (amount < Math.pow(t, 5)) {
      return (amount % t === 0) ?
        `${Math.floor(amount / Math.pow(t, 3))}T` :
        intl.formatNumber(amount);
    }

    return intl.formatNumber(amount);
  };

  const submit = async () => {
    if (account?.hasPublicKey()) {
      props.onConfirm(selectedValue());

      const note = props.note;

      if (note) {
        setTimeout(async () => {
          const success = await zapNote(
            note,
            account.publicKey,
            selectedValue().amount || 0,
            comment(),
            account.relays,
          );

          handleZap(success);
        }, lottieDuration());
        return;
      }

      if (props.profile) {
        const success = await zapProfile(
          props.profile,
          account.publicKey,
          selectedValue().amount || 0,
          comment(),
          account.relays,
        );

        handleZap(success);
        return;
      }
    }
  };

  const handleZap = (success = false) => {
    if (success) {
      props.onSuccess(selectedValue());
      return;
    }

    toast?.sendWarning(
      intl.formatMessage(toastZapFail),
    );

    props.onFail(selectedValue());
  };

  return (
    <Modal open={props.open} onClose={() => props.onCancel({ amount: 0, message: '' })}>
      <div id={props.id} class={styles.customZap}>
        <div class={styles.header}>
          <div class={styles.title}>
            <div class={styles.caption}>
              {intl.formatMessage(tActions.zap)}
            </div>
          </div>
          <button class={styles.close} onClick={() => props.onCancel({ amount: 0, message: '' })}>
          </button>
        </div>

        <div class={styles.description}>
          {intl.formatMessage(zapCustomOption,{
            user: userName(props.note?.user || props.profile),
          })}

          <span class={styles.amount}>
            {truncateNumber(selectedValue().amount || 0)}
          </span>
          <span class={styles.units}>sats</span>
        </div>

        <div class={styles.options}>
          <For each={settings?.availableZapOptions}>
            {(value) =>
              <button
                class={`${styles.zapOption} ${isSelected(value) ? styles.selected : ''}`}
                onClick={() => {
                  setComment(value.message || '')
                  setSelectedValue(value);
                }}
              >
                <div>
                  <span class={styles.emoji}>
                    {value.emoji}
                  </span>
                  <span class={styles.amount}>
                    {truncateNumber(value.amount || 0)}
                  </span>
                  <span class={styles.sats}>sats</span>
                </div>
              </button>
            }
          </For>
        </div>

        <div class={styles.customAmount}>
          <TextInput
            name="customAmountInput"
            type="text"
            value={selectedValue().amount ? intl.formatNumber(selectedValue().amount || 0) : ''}
            placeholder="0 sats"
            onChange={updateCustomAmount}
            noExtraSpace={true}
          />
          <label for="customAmountInput">
            {intl.formatMessage(zapCustomAmount)}
          </label>
        </div>

        <TextInput
          type="text"
          value={comment()}
          placeholder={intl.formatMessage(tPlaceholders.addComment)}
          onChange={setComment}
          noExtraSpace={true}
        />

        <div
          class={styles.action}
        >
          <ButtonPrimary
            onClick={submit}
          >
            <div class={styles.caption}>
              {intl.formatMessage(tActions.zap)}
            </div>
          </ButtonPrimary>
        </div>

      </div>
    </Modal>
  );
}

export default hookForDev(CustomZap);
