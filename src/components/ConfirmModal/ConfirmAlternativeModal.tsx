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

import { confirmDefaults as t } from '../../translations';

import styles from './ConfirmModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';

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
    <Modal open={props.open} onClose={props.onCancel}>
      <div id={props.id} class={styles.confirmAlternateModal}>
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

    </Modal>
  );
}

export default hookForDev(ConfirmAlternativeModal);
