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
    <Modal open={props.open}>
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
