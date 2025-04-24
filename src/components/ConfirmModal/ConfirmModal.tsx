import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import Modal from '../Modal/Modal';

import { confirmDefaults as t } from '../../translations';

import styles from './ConfirmModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

const ConfirmModal: Component<{
  id?: string,
  open?: boolean,
  setOpen?: (v: boolean) => void,
  title?: string,
  description?: string,
  confirmLabel?: string,
  abortLabel?: string
  onConfirm?: () => void,
  onAbort?: () => void,
}> = (props) => {

  const intl = useIntl();

  const setOpen = (isOpen: boolean) => {
    if (props.onAbort && !isOpen) {
      props.onAbort();
      return;
    }

    if (props.setOpen) {
      props.setOpen(isOpen);
      return;
    }
  }

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={setOpen}
      title={
        <div class={styles.feedConfirmationTitle}>
          {props.title || intl.formatMessage(t.title)}
        </div>
      }
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.feedsRestoreModal}>

        <div class={styles.feedConfirmationDescription}>
          {props.description}
        </div>
        <div class={styles.feedConfirmationActions}>
          <Show when={props.onConfirm}>
            <ButtonPrimary
              onClick={props.onConfirm}
            >
              {props.confirmLabel || intl.formatMessage(t.confirm)}
            </ButtonPrimary>
          </Show>

          <Show when={props.onAbort}>
            <ButtonSecondary
              onClick={props.onAbort}
              light={true}
            >
              {props.abortLabel || intl.formatMessage(t.abort)}
            </ButtonSecondary>
          </Show>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ConfirmModal);
