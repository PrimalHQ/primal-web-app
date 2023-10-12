import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, For, Match, Show, Switch } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { zapNote } from '../../lib/zap';
import { userName } from '../../stores/profile';
import { toastZapFail, zapCustomOption } from '../../translations';
import { PrimalNote } from '../../types/primal';
import { debounce } from '../../utils';
import Modal from '../Modal/Modal';
import { useToastContext } from '../Toaster/Toaster';
import { base64 } from '@scure/base';

import { nip19, utils } from 'nostr-tools';


import { login as tLogin, pin as tPin, actions as tActions } from '../../translations';

import styles from './EnterPinModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonLink from '../Buttons/ButtonLink';
import { useNavigate } from '@solidjs/router';
import TextInput from '../TextInput/TextInput';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import { decryptWithPin, encryptWithPin, setCurrentPin } from '../../lib/PrimalNostr';

const EnterPinModal: Component<{
  id?: string,
  open?: boolean,
  valueToDecrypt?: string,
  onSuccess?: (decryptedValue: string) => void,
  onAbort?: () => void,
}> = (props) => {

  const intl = useIntl();
  const toast = useToastContext();

  let pinInput: HTMLInputElement | undefined;

  const [pin, setPin] = createSignal('');

  const decWithPin = async () => {
    const val = props.valueToDecrypt || '';
    const dec = await decryptWithPin(pin(), val);
    // console.log('ENCODED: ', dec);
    // console.log('PIN: ', pin());
    // console.log('DECODE: ', decryptWithPin);
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
      console.log('Failed to decode nsec: ', e);
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


  return (
    <Modal open={props.open} opaqueBackdrop={true}>
      <div id={props.id} class={styles.modal}>
        <button class={styles.xClose} onClick={props.onAbort}>
          <div class={styles.iconClose}></div>
        </button>
        <div class={styles.title}>
          {intl.formatMessage(tPin.enterTitle)}
        </div>
        <div class={styles.inputs}>
          <TextInput
            type="password"
            ref={pinInput}
            value={pin()}
            onChange={(val: string) => setPin(val)}
            label={intl.formatMessage(tPin.enter)}
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
        </div>
      </div>
    </Modal>
  );
}

export default hookForDev(EnterPinModal);
