import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import Modal from '../Modal/Modal';

import { confirmDefaults as t } from '../../translations';

import styles from './ConfirmModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';

const ConfirmModal: Component<{
  id?: string,
  open?: boolean,
  title?: string,
  description?: string,
  confirmLabel?: string,
  abortLablel?: string
  onConfirm?: () => void,
  onAbort?: () => void,
}> = (props) => {

  const intl = useIntl();

  return (
    <Modal open={props.open} onClose={props.onAbort}>
      <div id={props.id} class={styles.feedsRestoreModal}>
        <div class={styles.feedConfirmationTitle}>
          {props.title || intl.formatMessage(t.title)}
        </div>
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
              {props.abortLablel || intl.formatMessage(t.abort)}
            </ButtonSecondary>
          </Show>
        </div>
      </div>

    </Modal>
  );
}

export default hookForDev(ConfirmModal);
