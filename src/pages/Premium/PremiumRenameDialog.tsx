import { Component, createEffect, createSignal, Show } from 'solid-js';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import Avatar from '../../components/Avatar/Avatar';
import ButtonCopy from '../../components/Buttons/ButtonCopy';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import Modal from '../../components/Modal/Modal';
import QrCode from '../../components/QrCode/QrCode';
import TransactionAmount from '../../components/TransactionAmount/TransactionAmount';
import { authorName, nip05Verification, userName } from '../../stores/profile';
import { premium as t } from '../../translations';
import { nip19 } from '../../lib/nTools';

import { PrimalUser } from '../../types/primal';
import { PremiumStore, PrimalPremiumSubscription } from './Premium';

import styles from './Premium.module.scss';
import PremiumSubscriptionOptions, { PremiumOption } from './PremiumSubscriptionOptions';
import TextInput from '../../components/TextInput/TextInput';
import { usernameRegex } from '../../constants';
import { isPremiumNameAvailable } from '../../lib/premium';
import { useIntl } from '@cookbook/solid-intl';


const PremiumRenameDialog: Component<{
  open?: boolean,
  setOpen: (v: boolean) => void,
  onOpen?: () => void,
  onApply?: (pk: string) => void,
  onClose?: () => void,
  name?: string,
  checkNameAvailability: (name: string) => Promise<boolean>
}> = (props) => {

  const intl = useIntl();

  const [newName, setNewName] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal('');
  const [isNameAvailable, setIsNameAvailable] = createSignal(false);

  let newNameInput: HTMLInputElement | undefined;
  let nameCheckTimeout = 0;

  const checkName = (name: string) => {
    setNewName(() => name);
    clearTimeout(nameCheckTimeout);

    nameCheckTimeout = setTimeout(async () => {

      if (name.length < 3) {
        setErrorMessage(() => intl.formatMessage(t.errors.nameTooShort));
        return;
      }

      const isAvailable = await props.checkNameAvailability(name);
      setIsNameAvailable(() => isAvailable);

      if (isAvailable) {
        setErrorMessage(() => '')
      }
      else {
        setErrorMessage(() => intl.formatMessage(t.errors.nameUnavailable))
      }
    }, 500)
  }

  createEffect(() => {
    if (props.open) {
      setTimeout(() => {
        setNewName(() => props.name || '');
        newNameInput && newNameInput.focus();
        props.onOpen && props.onOpen();
      }, 300)
    } else {
      props.onClose && props.onClose();
    }
  });



  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={props.setOpen}
      triggerClass="hidden"
      title={
        <div>
          Change your primal name
        </div>
      }
    >
      <div class={styles.renameDialog}>
        <div class={styles.description}>
          Enter your new desired name below. If available, it will be reserved immediately and your old name will be released.
        </div>
        <div class={styles.input}>
          <TextInput
            ref={newNameInput}
            value={newName()}
            onChange={checkName}
            validationState={errorMessage().length > 0 ? 'invalid' : 'valid'}
            errorMessage={errorMessage()}
            type="text"
            inputClass={styles.centralize}
            descriptionClass={styles.centralize}
            errorClass={styles.centralError}
            noExtraSpace={true}
            successMessage={isNameAvailable() && errorMessage().length === 0 ? 'Name is available' : ''}
            successClass={styles.centralError}
          />
        </div>
        <div class={styles.footer}>
          <ButtonSecondary
            onClick={() => props.setOpen && props.setOpen(false)}
            light={true}
          >
            Cancel
          </ButtonSecondary>

          <ButtonPrimary
            onClick={() => {
              props.onApply && props.onApply(newName());
            }}
            disabled={newName() === props.name || newName().length < 3 || errorMessage().length > 0 || !isNameAvailable}
          >
            Apply
          </ButtonPrimary>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumRenameDialog
