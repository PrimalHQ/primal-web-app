import { Component, createEffect, createSignal, Show } from 'solid-js';
import { SetStoreFunction } from 'solid-js/store';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import { PremiumStore } from './Premium';

import styles from './Premium.module.scss';
import PremiumSidebarActive from './PremiumSidebarActive';
import TextInput from '../../components/TextInput/TextInput';
import { RadioGroup } from '@kobalte/core/radio-group';


const PremiumLegendMoreDonation: Component<{
  data: PremiumStore,
  // setData: SetStoreFunction<PremiumStore>,
  open?: boolean,
  setOpen: (v: boolean) => void,
  onOpen?: () => void,
  onClose?: () => void,
  onDonate?: (amount: number, paymentType: 'lightning' | 'onchain') => void,
}> = (props) => {

  let amountInput: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.open) {
      setTimeout(() => {
        amountInput && amountInput.focus();
      }, 10);
      props.onOpen && props.onOpen();
    } else {
      props.onClose && props.onClose();
    }
  })

  const [donationAmount, setDonationAmount] = createSignal(0);
  const [paymentType, setPaymentType] = createSignal<'lightning' | 'onchain'>('lightning');

  const donationAmountAlt = () => {
    const rate = props.data.exchangeRateUSD / 100_000_000;
    return `$${(donationAmount() * rate).toFixed(2)} USD`;
  };

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={props.setOpen}
      triggerClass="hidden"
      title={
        <div>
          Make a Donation
        </div>
      }
    >
      <div class={styles.moreDonateModal}>
        <div class={styles.amountInput}>
          <TextInput
            ref={amountInput}
            type="text"
            label="Amount (sats):"
            value={`${donationAmount() || ''}`}
            noExtraSpace={true}
            onChange={(v) => {
              v.length > 0 ? setDonationAmount(parseInt(v)) : setDonationAmount(0);
            }}
          />

          <div class={styles.altValue}>
            {donationAmountAlt()}
          </div>
        </div>

        <RadioGroup
          class={styles.paymentOptions}
          value={paymentType()} onChange={setPaymentType}
        >
          <RadioGroup.Item value="lightning" class={styles.radio}>
            <RadioGroup.ItemInput class={styles.radioInput} />
            <RadioGroup.ItemControl class={styles.radioControl}>
              <RadioGroup.ItemIndicator class={styles.radioIndicatior} />
            </RadioGroup.ItemControl>
            <RadioGroup.ItemLabel class={styles.radioLabel}>
              Pay with bitcoin lightning
            </RadioGroup.ItemLabel>
          </RadioGroup.Item>

          <RadioGroup.Item value="onchain" class={styles.radio}>
            <RadioGroup.ItemInput class={styles.radioInput} />
            <RadioGroup.ItemControl class={styles.radioControl}>
              <RadioGroup.ItemIndicator />
            </RadioGroup.ItemControl>
            <RadioGroup.ItemLabel class={styles.radioLabel}>
              Pay with on-chain bitcoin
            </RadioGroup.ItemLabel>
          </RadioGroup.Item>
        </RadioGroup>

        <div class={styles.actions}>
          <ButtonSecondary
            light={true}
            onClick={() => {
              setDonationAmount(0);
              props.setOpen(false);
            }}
          >
            Cancel
          </ButtonSecondary>
          <ButtonPrimary
            onClick={() => {
              const amount = donationAmount();
              const payment = paymentType();
              setDonationAmount(0);
              setPaymentType('lightning');
              props.setOpen(false);
              props.onDonate && props.onDonate(amount, payment);
            }}
            disabled={donationAmount() === 0}
          >
            Next
          </ButtonPrimary>
        </div>

      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumLegendMoreDonation
