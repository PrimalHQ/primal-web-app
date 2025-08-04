import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, For } from 'solid-js';
import { defaultZap, defaultZapOptions, Kind } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { hookForDev } from '../../lib/devTools';
import { zapArticle, zapDVM, zapNote, zapProfile, zapStream } from '../../lib/zap';
import { userName } from '../../stores/profile';
import { toastZapFail, zapCustomOption, actions as tActions, placeholders as tPlaceholders, zapCustomAmount, toast as toastText } from '../../translations';
import { PrimalDVM, PrimalNote, PrimalUser, ZapOption } from '../../types/primal';
import { debounce } from '../../utils';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import Modal from '../Modal/Modal';
import { lottieDuration } from '../Note/NoteFooter/NoteFooter';
import TextInput from '../TextInput/TextInput';
import { useToastContext } from '../Toaster/Toaster';

import styles from './CustomZap.module.scss';
import { readSecFromStorage } from '../../lib/localStore';
import { StreamingData } from '../../lib/streaming';

const CustomZap: Component<{
  id?: string,
  open?: boolean,
  note?: PrimalNote,
  profile?: PrimalUser,
  dvm?: PrimalDVM,
  stream?: StreamingData,
  streamAuthor?: PrimalUser,
  onConfirm: (zapOption?: ZapOption) => void,
  onSuccess: (zapOption?: ZapOption, data?: any) => void,
  onFail: (zapOption?: ZapOption) => void,
  onCancel: (zapOption?: ZapOption) => void
}> = (props) => {

  const toast = useToastContext();
  const account = useAccountContext();
  const intl = useIntl();
  const settings = useSettingsContext();

  const [selectedValue, setSelectedValue] = createSignal(settings?.availableZapOptions[0] || defaultZapOptions[0]);

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
      setSelectedValue((v) => ({ ...v, amount: 0 }))
    };

    setSelectedValue((v)=> ({ ...v, amount }));
  };

  const updateComment = (message: string) => {
    setSelectedValue((v) => ({ ...v, message }))
  }

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
    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }

    if (!account.sec || account.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        account.actions.setShowPin(sec);
        return;
      }
    }

    // if (!account.proxyThroughPrimal && account.relays.length === 0) {
    //   toast?.sendWarning(
    //     intl.formatMessage(toastText.noRelaysConnected),
    //   );
    //   return;
    // }

    props.onConfirm(selectedValue());

    const note = props.note;

    if (note) {
      setTimeout(async () => {

        const zappers: Record<string, Function> = {
          [Kind.Text]: zapNote,
          [Kind.LongForm]: zapArticle,
          [Kind.LongFormShell]: zapArticle,
        }

        const success = await zappers[note.msg.kind](
          note,
          account.publicKey,
          selectedValue().amount || 0,
          selectedValue().message,
          account.activeRelays,
          account.activeNWC,
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
        selectedValue().message,
        account.activeRelays,
        account.activeNWC,
      );

      handleZap(success);
      return;
    }

    const dvm = props.dvm;
    const dvmUser = dvm?.user;

    if (dvm && dvmUser) {
      setTimeout(async () => {

        const success = await zapDVM(
          dvm,
          dvmUser,
          account.publicKey,
          selectedValue().amount || 0,
          selectedValue().message,
          account.activeRelays,
          );

          handleZap(success);
        }, lottieDuration());
      return;
    }

    if (props.stream && props.streamAuthor) {
      const s = props.stream;
      const a = props.streamAuthor;

      setTimeout(async () => {
        const { success, event } = await zapStream(
          s,
          a,
          account.publicKey,
          selectedValue().amount || 0,
          selectedValue().message,
          account.activeRelays,
          account.activeNWC,
        );

        if (success && event) {
          props.onSuccess(selectedValue(), event);
          return;
        }

        toast?.sendWarning(
          intl.formatMessage(toastZapFail),
        );

        props.onFail(selectedValue());
      }, lottieDuration());
      return;
    }
  };

  const handleZap = (success = true) => {
    if (success) {
      props.onSuccess(selectedValue());
      return;
    }

    toast?.sendWarning(
      intl.formatMessage(toastZapFail),
    );

    props.onFail(selectedValue());
  };

  let md = false;

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={(isOpen: boolean) => {
        if (isOpen) return;

        if (md) {
          md = false;
        }
        else {
          props.onCancel({ amount: 0, message: '' });
        }
      }}
      title={
        <div class={styles.title}>
          <div class={styles.caption}>
            {intl.formatMessage(tActions.zap)}
          </div>
        </div>
      }
      triggerClass={styles.hidden}
    >
      <div
        id={props.id}
        class={styles.customZap}
        onMouseUp={() => md = false}
        onMouseDown={() => md = true}
        onClick={(e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >

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
                  setSelectedValue(() => ({...value}));
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
          value={selectedValue().message || ''}
          placeholder={intl.formatMessage(tPlaceholders.addComment)}
          onChange={updateComment}
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
    </AdvancedSearchDialog>
  );
}

export default hookForDev(CustomZap);
