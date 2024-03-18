import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal } from 'solid-js';
import Modal from '../Modal/Modal';
import { useToastContext } from '../Toaster/Toaster';

import { nip19 } from 'nostr-tools';


import { pin as tPin, actions as tActions } from '../../translations';

import styles from './EnterPinModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import TextInput from '../TextInput/TextInput';
import { decryptWithPin, setCurrentPin } from '../../lib/PrimalNostr';
import { logError } from '../../lib/logger';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import { useAccountContext } from '../../contexts/AccountContext';

const EnterPinModal: Component<{
  id?: string,
  open?: boolean,
  valueToDecrypt?: string,
  onSuccess?: (decryptedValue: string) => void,
  onAbort?: () => void,
  onForgot?: () => void,
}> = (props) => {

  const intl = useIntl();
  const toast = useToastContext();
  const account = useAccountContext();

  let pinInput: HTMLInputElement | undefined;

  const [pin, setPin] = createSignal('');

  const decWithPin = async () => {
    const val = props.valueToDecrypt || '';
    const dec = await decryptWithPin(pin(), val);
    return dec;
  };

  const onConfirm = async() => {
    if (!isValidPin) return;

    // Decrypt private key
    const enc = await decWithPin();

    try {
      const decoded = nip19.decode(enc);

      if (decoded.type !== 'nsec' || !decoded.data) {
        throw('invalid-nsec-decoded');
      }

      // Save PIN for the session
      setCurrentPin(pin());

      // Execute callback
      props.onSuccess && props.onSuccess(enc);
    } catch(e) {
      logError('Failed to decode nsec: ', e);
      toast?.sendWarning('PIN is incorrect');
    }

  };

  createEffect(() => {
    if (props.open) {
      setTimeout(() => pinInput?.focus(), 200);
    }
  });

  const isValidPin = () => {
    return pin().length > 3;
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Enter' && isValidPin()) {
      onConfirm();
    }
  };

  return (
    <Modal open={props.open} opaqueBackdrop={true}>
      <div id={props.id} class={styles.modal}>
        <button class={styles.xClose} onClick={props.onAbort}>
          <div class={styles.iconClose}></div>
        </button>
        <div class={styles.title}>
          {intl.formatMessage(tPin.enterTitle)}
        </div>
        <div class={styles.description}>
          {intl.formatMessage(tPin.enter)}
        </div>
        <div class={styles.inputs}>
          <TextInput
            type="password"
            ref={pinInput}
            value={pin()}
            onKeyUp={onKeyUp}
            onChange={(val: string) => setPin(val)}
            validationState={pin().length === 0 || isValidPin() ? 'valid' : 'invalid'}
            errorMessage={intl.formatMessage(tPin.invalidRePin)}
          />
        </div>
        <div class={styles.actions}>
          <ButtonPrimary
            onClick={onConfirm}
            disabled={!isValidPin()}
          >
            {intl.formatMessage(tActions.login)}
          </ButtonPrimary>

          <ButtonSecondary
            onClick={props.onForgot}
          >
            {intl.formatMessage(tActions.forgotPin)}
          </ButtonSecondary>
        </div>
      </div>
    </Modal>
  );
}

export default hookForDev(EnterPinModal);
