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

import { login as tLogin, pin as tPin, actions as tActions } from '../../translations';

import styles from './CreatePinModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonLink from '../Buttons/ButtonLink';
import { useNavigate } from '@solidjs/router';
import TextInput from '../TextInput/TextInput';
import ButtonSecondary from '../Buttons/ButtonSecondary';

const CreatePinModal: Component<{
  id?: string,
  open?: boolean,
  valueToEncrypt?: string,
  onPinApplied?: (encryptedValue: string) => void,
  onAbort?: () => void,
}> = (props) => {

  const intl = useIntl();
  const navigate = useNavigate();

  let pinInput: HTMLInputElement | undefined;

  const [pin, setPin] = createSignal('');
  const [rePin, setRePin] = createSignal('');

  const encriptWithPin = () => {
    const val = props.valueToEncrypt || '<NA>';
    return `${val}_${pin()}`;
  };

  const onSetPin = () => {
    // Verify pin
    // Encrypt private key
    // Execute callback
    props.onPinApplied && props.onPinApplied(encriptWithPin());
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
  }

  const isValidRePin = () => {
    return rePin() === pin();
  };


  return (
    <Modal open={props.open}>
      <div id={props.id} class={styles.modal}>
        <button class={styles.xClose} onClick={props.onAbort}>
          <div class={styles.iconClose}></div>
        </button>
        <div class={styles.title}>
          {intl.formatMessage(tPin.title)}
        </div>
        <div class={styles.description}>
          {intl.formatMessage(tPin.description)}
        </div>
        <div class={styles.inputs}>
          <TextInput
            type="password"
            ref={pinInput}
            value={pin()}
            onChange={(val: string) => setPin(val)}
            validationState={isValidPin() ? 'valid' : 'invalid'}
            errorMessage={intl.formatMessage(tPin.invalidPin)}
          />
          <TextInput
            type="password"
            value={rePin()}
            onChange={(val: string) => setRePin(val)}
            label={intl.formatMessage(tPin.reEnter)}
            validationState={rePin().length === 0 || isValidRePin() ? 'valid' : 'invalid'}
            errorMessage={intl.formatMessage(tPin.invalidRePin)}
          />
        </div>
        <div class={styles.actions}>
          <ButtonPrimary
            onClick={onSetPin}
            disabled={!isValidPin() || !isValidRePin()}
          >
            {intl.formatMessage(tActions.createPin)}
          </ButtonPrimary>
          <ButtonSecondary
            onClick={onOptout}
          >
            {intl.formatMessage(tActions.optoutPin)}
          </ButtonSecondary>
        </div>
      </div>
    </Modal>
  );
}

export default hookForDev(CreatePinModal);
