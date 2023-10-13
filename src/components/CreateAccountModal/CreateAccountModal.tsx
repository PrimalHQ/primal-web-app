import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { zapNote } from '../../lib/zap';
import { userName } from '../../stores/profile';
import { toastZapFail, zapCustomOption } from '../../translations';
import { PrimalNote } from '../../types/primal';
import { debounce } from '../../utils';
import Modal from '../Modal/Modal';
import { useToastContext } from '../Toaster/Toaster';

import { account as t, actions as tActions } from '../../translations';

import styles from './CreateAccountModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonLink from '../Buttons/ButtonLink';
import { useNavigate } from '@solidjs/router';

const CreateAccountModal: Component<{
  id?: string,
  open?: boolean,
  onLogin?: () => void,
  onAbort?: () => void,
}> = (props) => {

  const intl = useIntl();
  const navigate = useNavigate();

  const onCreateAccount = () => {
    props.onAbort && props.onAbort();
    navigate('/new');
  };

  return (
    <Modal open={props.open}>
      <div id={props.id} class={styles.modal}>
        <button class={styles.xClose} onClick={props.onAbort}>
          <div class={styles.iconClose}></div>
        </button>
        <div class={styles.title}>
          {intl.formatMessage(tActions.getStarted)}
        </div>
        <div class={styles.description}>
          {intl.formatMessage(t.createNewDescription)}
        </div>
        <div class={styles.actions}>
          <ButtonPrimary
            onClick={onCreateAccount}
          >
            {intl.formatMessage(tActions.createAccount)}
          </ButtonPrimary>
        </div>
        <div class={styles.alternative}>
          Already have Nostr a account?&nbsp;
          <ButtonLink onClick={props.onLogin}>
            {intl.formatMessage(tActions.loginNow)}
          </ButtonLink>
        </div>
      </div>

    </Modal>
  );
}

export default hookForDev(CreateAccountModal);
