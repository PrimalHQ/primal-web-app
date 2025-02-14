import { Component, createEffect, createSignal } from 'solid-js';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';

import styles from './Premium.module.scss';
import TextInput from '../../components/TextInput/TextInput';


const PremiumPromoCodeDialog: Component<{
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

  const [promoCode, setPromoCode] = createSignal('');

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={props.setOpen}
      triggerClass="hidden"
      title={
        <div>
          Apply a promo code
        </div>
      }
    >
      <div class={styles.changeRecipientDialog}>
        <div class={styles.description}>
          If you have a promo code enter it below:
        </div>
        <div class={styles.input}>
          <TextInput
            value={promoCode()}
            onChange={setPromoCode}
            type="text"
            inputClass={styles.centralize}
            descriptionClass={styles.centralize}
            errorClass={styles.centralError}
            noExtraSpace={true}
            placeholder="promo code..."
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
              props.onApply && props.onApply(promoCode());
            }}
          >
            Apply
          </ButtonPrimary>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumPromoCodeDialog
