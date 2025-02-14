import { useIntl } from '@cookbook/solid-intl';
import { Component } from 'solid-js';
import Modal from '../Modal/Modal';

import { account as t, actions as tActions } from '../../translations';

import styles from './CreateAccountModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonLink from '../Buttons/ButtonLink';
import { useNavigate } from '@solidjs/router';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

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
    <AdvancedSearchDialog
      open={props.open}
      setOpen={(isOpen: boolean) => !isOpen && props.onAbort && props.onAbort()}
      title={
      <div class={styles.title}>
        {intl.formatMessage(tActions.getStarted)}
      </div>
      }
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.modal}>
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
        {intl.formatMessage(t.alreadyHaveAccount)}&nbsp;
          <ButtonLink onClick={props.onLogin}>
            {intl.formatMessage(tActions.loginNow)}
          </ButtonLink>
        </div>
      </div>

    </AdvancedSearchDialog>
  );
}

export default hookForDev(CreateAccountModal);
