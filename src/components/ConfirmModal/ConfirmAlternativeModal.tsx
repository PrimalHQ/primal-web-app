import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import Modal from '../Modal/Modal';

import { confirmDefaults as t } from '../../translations';

import styles from './ConfirmModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

const ConfirmAlternativeModal: Component<{
  id?: string,
  open?: boolean,
  title?: string,
  description?: string,
  confirmLabel?: string,
  cancelLabel?: string,
  abortLabel?: string
  onConfirm?: () => void,
  onCancel?: () => void,
  onAbort?: () => void,
}> = (props) => {

  const intl = useIntl();

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={(isOpen: boolean) => !isOpen && props.onCancel && props.onCancel()}
      title={
        <div class={styles.feedConfirmationTitle}>
          {props.title || intl.formatMessage(t.title)}
        </div>
      }
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.confirmAlternateModal}>
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

          <Show when={props.onCancel}>
            <ButtonSecondary
              onClick={props.onCancel}
              light={true}
            >
              {props.cancelLabel || intl.formatMessage(t.cancel)}
            </ButtonSecondary>
          </Show>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ConfirmAlternativeModal);
