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
import { account } from '../../translations';
import { nip19 } from '../../lib/nTools';

import { PrimalUser } from '../../types/primal';
import { PremiumStore, PrimalPremiumSubscription } from './Premium';

import styles from './Premium.module.scss';
import PremiumSubscriptionOptions, { PremiumOption } from './PremiumSubscriptionOptions';
import TextInput from '../../components/TextInput/TextInput';


const PremiumChangeRecipientDialog: Component<{
  open?: boolean,
  setOpen: (v: boolean) => void,
  onOpen?: () => void,
  onApply?: (pk: string) => void,
  onClose?: () => void,
}> = (props) => {

  createEffect(() => {
    if (props.open) {
      props.onOpen && props.onOpen();
    } else {
      props.onClose && props.onClose();
    }
  })

  const [pk, setPk] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal('');


  const isValidKey = (key: string) => {

    if (key.length < 63) {
      return false;
    }

    if (key.startsWith('npub')) {
      try {
        const decoded = nip19.decode(key);

        setErrorMessage(() => '');
        return decoded.type === 'npub' && (typeof decoded.data === 'string');
      } catch(e) {
        setErrorMessage(() => 'Invalid public key');
        return false;
      }
    }

    try {
      nip19.npubEncode(key);
      setErrorMessage(() => '');
      return true;
    } catch(_) {
      setErrorMessage(() => 'Invalid public key');
      return false;
    }
  };

  const decodePk = (key: string) => {
    if (!isValidKey(key)) return '';

    if (key.startsWith('npub')) {
      return nip19.decode(key).data;
    }

    return key;
  }

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={props.setOpen}
      triggerClass="hidden"
      title={
        <div>
          Assign to a different nostr account
        </div>
      }
    >
      <div class={styles.changeRecipientDialog}>
        <div class={styles.description}>
          Enter the public key of the account you wish to assign this Primal Name to:
        </div>
        <div class={styles.input}>
          <TextInput
            value={pk()}
            onChange={setPk}
            type="text"
            validationState={errorMessage().length > 0 ? 'invalid' : 'valid'}
            errorMessage={errorMessage()}
            inputClass={styles.centralize}
            descriptionClass={styles.centralize}
            errorClass={styles.centralError}
            noExtraSpace={true}
          />

        </div>
        <div class={styles.warning}>
          Warning: only the person who owns this Nostr account will be able to administer this Primal name.
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
              const pubkey = decodePk(pk())
              props.onApply && props.onApply(pubkey);
            }}
            disabled={!isValidKey(pk())}
          >
            Apply
          </ButtonPrimary>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumChangeRecipientDialog
