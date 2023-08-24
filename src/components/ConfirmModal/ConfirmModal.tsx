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

const ConfirmModal: Component<{
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
    <Modal open={props.open}>
      <div class={styles.feedsRestoreModal}>
        <div class={styles.feedConfirmationTitle}>
          {props.title || intl.formatMessage(t.title)}
        </div>
        <div class={styles.feedConfirmationDescription}>
          {props.description}
        </div>
        <div class={styles.feedConfirmationActions}>
          <Show when={props.onConfirm}>
            <button
              class={styles.feedRestoreConfirm}
              onClick={props.onConfirm}
            >
            {props.confirmLabel || intl.formatMessage(t.confirm)}
            </button>
          </Show>

          <Show when={props.onAbort}>
            <button
              class={styles.feedRestoreAbort}
              onClick={props.onAbort}
            >
            {props.abortLablel || intl.formatMessage(t.abort)}
            </button>
          </Show>
        </div>
      </div>

    </Modal>
  );
}

export default ConfirmModal;
