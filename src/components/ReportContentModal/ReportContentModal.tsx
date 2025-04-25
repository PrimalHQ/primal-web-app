import { useIntl } from '@cookbook/solid-intl';

import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Kind } from '../../constants';
import { hookForDev } from '../../lib/devTools';
import { NostrTier, PrimalArticle, PrimalNote, PrimalUser } from '../../types/primal';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import Modal from '../Modal/Modal';

import styles from './ReportContentModal.module.scss';
import { userName } from '../../stores/profile';
import Avatar from '../Avatar/Avatar';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import { APP_ID } from '../../App';
import { subsTo, subTo } from '../../sockets';
import { getAuthorSubscriptionTiers } from '../../lib/feed';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import { Select } from '@kobalte/core/select';
import Loader from '../Loader/Loader';
import { logInfo } from '../../lib/logger';
import { getExchangeRate, getMembershipStatus } from '../../lib/membership';
import { useAccountContext } from '../../contexts/AccountContext';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

import { actions as tActions } from '../../translations';
import CheckBox2 from '../Checkbox/CheckBox2';
import { sendContentReport, triggerImportEvents } from '../../lib/notes';
import { useToastContext } from '../Toaster/Toaster';
import RadioBox, { RadioBoxOption } from '../Checkbox/RadioBox';
import { titleCase } from '../../utils';

const reportReasons = ['nudity', 'profanity', 'illegal', 'spam', 'impersonation'];

const ReportContentModal: Component<{
  id?: string,
  note: PrimalNote | PrimalArticle,
  onClose: () => void,
  onReport?: () => void,
}> = (props) => {

  const account = useAccountContext();
  const intl = useIntl();
  const toast = useToastContext();

  const [selectedReason, setSelectedReason] = createSignal<string>();

  return (
    <AdvancedSearchDialog
      open={props.note !== undefined}
      setOpen={(isOpen: boolean) => !isOpen && props.onClose && props.onClose()}
      title={intl.formatMessage(tActions.reportContentConfirmTitle)}
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.reportContent}>
        <div class={styles.modalBody}>
          <div class={styles.description}>
            All reports posted will be publically visible.
          </div>
          <RadioBox
            onChange={(option: RadioBoxOption) => {
              setSelectedReason(() => option.value)
            }}
            options={reportReasons.map(value => ({ value, label: titleCase(value) }))}
          />
        </div>

        <div class={styles.footer}>
          <div class={styles.payAction}>
            <ButtonSecondary
              light={true}
              onClick={props.onClose}
            >
              Dismiss
            </ButtonSecondary>
          </div>

          <div class={styles.payAction}>
            <ButtonPrimary
              disabled={selectedReason() === undefined}
              onClick={async () => {
                if (account) {
                  const { success, note: event } = await sendContentReport(
                    props.note.id,
                    props.note.pubkey,
                    selectedReason() || '',
                    account.proxyThroughPrimal,
                    account.activeRelays,
                    account.relaySettings,
                  );

                  if (success && event) {
                    triggerImportEvents([event], `import_report_${APP_ID}`);
                    toast?.sendSuccess(`Content reported as ${selectedReason()}`)
                  }
                }
                props.onClose();
              }}
            >
              Report
            </ButtonPrimary>
          </div>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ReportContentModal);
