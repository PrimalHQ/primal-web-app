import { Component, createEffect, Show } from 'solid-js';
import { SetStoreFunction } from 'solid-js/store';
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

import { PrimalUser } from '../../types/primal';
import { PremiumStore, PrimalPremiumSubscription } from './Premium';

import styles from './Premium.module.scss';
import PremiumSubscriptionOptions, { PremiumOption } from './PremiumSubscriptionOptions';


const PremiumRenewModal: Component<{
  data: PremiumStore,
  setData: SetStoreFunction<PremiumStore>,
  open?: boolean,
  setOpen: (v: boolean) => void,
  onOpen?: () => void,
  onClose?: () => void,
}> = (props) => {

  createEffect(() => {
    if (props.open) {
      props.onOpen && props.onOpen();
    } else {
      props.onClose && props.onClose();
    }
  })

  const isExpired = () => ((new Date()).getTime() / 1_000) > (props.data.membershipStatus.expires_on || 0);

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={props.setOpen}
      triggerClass="hidden"
      title={
        <div>
          <Show
            when={isExpired()}
            fallback={'Extend your subscription'}
          >
            Renew your subscription
          </Show>
        </div>
      }
    >
      <div class={styles.renewModal}>
        <PremiumSubscriptionOptions
          options={props.data.subOptions}
          selectedOption={props.data.selectedSubOption}
          data={props.data}
          onSelect={(option) => {
            props.setData('selectedSubOption', () => ({ ...option }));
          }}
          openPromoCode={() => props.setData('openPromoCode', () => true)}
          promoCode={props.data.promoCode}
        />

        <div class={styles.footer}>
          <div class={styles.disclaimer}>
          By clicking “Buy Now” you acknowledge<br/>
          that  you agree to our <a href="https://primal.net/terms" target="__blank">Terms of Service</a>
          </div>
          <div class={styles.actions}>
            <ButtonSecondary
              onClick={() => props.setOpen && props.setOpen(false)}
              light={true}
            >
              Cancel
            </ButtonSecondary>

            <ButtonPrimary
              onClick={() => {
                props.setData('openSubscribe', () => true);
              }}
            >
              Buy now
            </ButtonPrimary>
          </div>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumRenewModal
