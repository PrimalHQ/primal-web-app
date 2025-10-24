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
import { loginUsingExtension, logUserIn, setLoginType } from '../../stores/accountStore';

import { appStoreLink, playstoreLink, apkLink } from '../../constants';

import appstoreImg from '../../assets/images/appstore_download.svg';
import playstoreImg from '../../assets/images/playstore_download.svg';
import primalQr from '../../assets/images/primal_qr.png';

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
        {intl.formatMessage(tActions.getStartedTitle)}
      </div>
      }
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.modal}>
        <div class={styles.infoWrapper}>
          <img src={primalQr}></img>
          <div class={styles.loginSteps}>
            <div class={styles.loginExplain}>
              {intl.formatMessage(t.createNewDescription)}
            </div>
            <div class={styles.loginList}>
              <div class={styles.loginListItem}>
                <div class={styles.number}>1</div>
                <div class={styles.itemLabel}>
                  {intl.formatMessage(t.getStartedSteps.step_one)}
                </div>
              </div>

              <div class={styles.loginListItem}>
                <div class={styles.number}>2</div>
                <div class={styles.itemLabel}>
                  {intl.formatMessage(t.getStartedSteps.step_two)}
                </div>
              </div>

              <div class={styles.loginListItem}>
                <div class={styles.number}>3</div>
                <div class={styles.itemLabel}>
                  <span>Go to the </span>
                  <button onClick={props.onLogin}>login page</button>
                  <span> and scan the QR code</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class={styles.bellowInfo}>
          <div class={styles.appLinks}>
            <a
              href={appStoreLink}
              target='_blank'
            >
              <img src={appstoreImg} />
            </a>

            <a
              href={playstoreLink}
              target='_blank'
            >
              <img src={playstoreImg} />
            </a>
          </div>

          <div class={styles.loginNow}>
            {intl.formatMessage(t.alreadyHaveAccount)}&nbsp;
            <button onClick={props.onLogin}>{intl.formatMessage(tActions.loginNow)}</button>
          </div>
        </div>
      </div>

    </AdvancedSearchDialog>
  );
}

export default hookForDev(CreateAccountModal);
