import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, Match, Switch } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import Modal from '../Modal/Modal';

import { login as tLogin, actions as tActions } from '../../translations';

import styles from './LoginModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import CreatePinModal from '../CreatePinModal/CreatePinModal';
import TextInput from '../TextInput/TextInput';
import { nip19 } from '../../lib/nTools';
import { storeSec } from '../../lib/localStore';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

const LoginModal: Component<{
  id?: string,
  open?: boolean,
  onAbort?: () => void,
}> = (props) => {

  const intl = useIntl();
  const account = useAccountContext();

  const [step, setStep] = createSignal<'login' | 'pin' | 'none'>('login')
  const [enteredKey, setEnteredKey] = createSignal('');

  let loginInput: HTMLInputElement | undefined;

  const onLogin = () => {
    const sec = enteredKey();

    if (!isValidNsec()) return;

    account?.actions.setSec(sec);
    setStep(() => 'pin');
  };

  const onStoreSec = (sec: string | undefined) => {
    storeSec(sec);
    onAbort();
  }

  const onAbort = () => {
    setStep(() => 'login');
    setEnteredKey('');
    props.onAbort && props.onAbort();
  }

  const isValidNsec: () => boolean = () => {
    const key = enteredKey();

    if (key.length === 0) {
      return false;
    }

    if (key.startsWith('nsec')) {
      try {
        const decoded = nip19.decode(key);

        return decoded.type === 'nsec' && decoded.data;
      } catch(e) {
        return false;
      }
    }

    return false;
  };

  createEffect(() => {
    if (props.open && step() === 'login') {
      loginInput?.focus();
    }
  });

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Enter' && isValidNsec()) {
      onLogin();
    }
  };

  return (
    <Switch>
      <Match when={step() === 'login'}>
        <AdvancedSearchDialog
          open={props.open}
          setOpen={(isOpen: boolean) => !isOpen && props.onAbort && props.onAbort()}
          title={
            <div class={styles.title}>
              {intl.formatMessage(tLogin.title)}
            </div>
          }
          triggerClass={styles.hidden}
        >
          <div id={props.id} class={styles.modal}>
            <div class={styles.description}>
              {intl.formatMessage(tLogin.description)}
            </div>
            <div class={styles.inputs}>
              <TextInput
                ref={loginInput}
                type="password"
                value={enteredKey()}
                onKeyUp={onKeyUp}
                onChange={setEnteredKey}
                validationState={enteredKey().length === 0 || isValidNsec() ? 'valid' : 'invalid'}
                errorMessage={intl.formatMessage(tLogin.invalidNsec)}
              />
            </div>
            <div class={styles.actions}>
              <ButtonPrimary
                onClick={onLogin}
                disabled={enteredKey().length === 0 || !isValidNsec()}
              >
                {intl.formatMessage(tActions.login)}
              </ButtonPrimary>
            </div>
          </div>
        </AdvancedSearchDialog>
      </Match>

      <Match when={step() === 'pin'}>
        <CreatePinModal
          open={step() === 'pin'}
          onAbort={() => {
            onStoreSec(account?.sec);
          }}
          valueToEncrypt={enteredKey()}
          onPinApplied={onStoreSec}
        />
      </Match>
    </Switch>
  );
}

export default hookForDev(LoginModal);
