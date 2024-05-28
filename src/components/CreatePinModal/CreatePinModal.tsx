import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal } from 'solid-js';
import Modal from '../Modal/Modal';

import {
  login as tLogin,
  pin as tPin,
  actions as tActions,
} from '../../translations';

import styles from './CreatePinModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import TextInput from '../TextInput/TextInput';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import { encryptWithPin, setCurrentPin } from '../../lib/PrimalNostr';

const CreatePinModal: Component<{
  id?: string;
  open?: boolean;
  valueToEncrypt?: string;
  onPinApplied?: (encryptedValue: string) => void;
  onAbort?: () => void;
}> = (props) => {
  const intl = useIntl();

  let pinInput: HTMLInputElement | undefined;

  const [pin, setPin] = createSignal('');
  const [rePin, setRePin] = createSignal('');

  const encWithPin = async () => {
    const val = props.valueToEncrypt || '';
    const enc = await encryptWithPin(pin(), val);
    return enc;
  };

  const onSetPin = async () => {
    if (!isValidPin || !isValidRePin()) return;

    // Encrypt private key
    const enc = await encWithPin();

    // Save PIN for the session
    setCurrentPin(pin());

    // Execute callback
    props.onPinApplied && props.onPinApplied(enc);
  };

  const onOptout = () => {
    props.onPinApplied && props.onPinApplied(props.valueToEncrypt || '');
  };

  createEffect(() => {
    if (props.open) {
      pinInput?.focus();
    }
  });

  const isValidPin = () => {
    return pin().length > 3;
  };

  const isValidRePin = () => {
    return rePin() === pin();
  };

  const onSubmit = (e: Event) => {
    e.preventDefault();

    if (isValidPin() && isValidRePin()) {
      onSetPin();
    }
  };

  return (
    <Modal open={props.open} onClose={props.onAbort}>
      <form id={props.id} class={styles.modal} onSubmit={onSubmit}>
        <button class={styles.xClose} onClick={props.onAbort}>
          <div class={styles.iconClose}></div>
        </button>
        <div class={styles.title}>{intl.formatMessage(tPin.title)}</div>
        <div class={styles.description}>
          {intl.formatMessage(tPin.description)}
        </div>

        <TextInput
          type="password"
          ref={pinInput}
          value={pin()}
          onChange={(val: string) => setPin(val)}
          validationState={
            pin().length === 0 || isValidPin() ? 'valid' : 'invalid'
          }
          errorMessage={intl.formatMessage(tPin.invalidPin)}
        />

        <div class={styles.description}>{intl.formatMessage(tPin.reEnter)}</div>
        <TextInput
          type="password"
          value={rePin()}
          onChange={(val: string) => setRePin(val)}
          validationState={
            rePin().length === 0 || isValidRePin() ? 'valid' : 'invalid'
          }
          errorMessage={intl.formatMessage(tPin.invalidRePin)}
        />

        <div class={styles.actions}>
          <ButtonPrimary
            type="submit"
            disabled={!isValidPin() || !isValidRePin()}
          >
            {intl.formatMessage(tActions.createPin)}
          </ButtonPrimary>
          <ButtonSecondary onClick={onOptout} light={true}>
            {intl.formatMessage(tActions.optoutPin)}
          </ButtonSecondary>
        </div>
      </form>
    </Modal>
  );
};

export default hookForDev(CreatePinModal);
