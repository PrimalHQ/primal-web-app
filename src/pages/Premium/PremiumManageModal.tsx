import { Component, createEffect, Show } from 'solid-js';
import { SetStoreFunction } from 'solid-js/store';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import { PremiumStore } from './Premium';

import styles from './Premium.module.scss';
import PremiumSidebarActive from './PremiumSidebarActive';


const PremiumManageModal: Component<{
  data: PremiumStore,
  setData: SetStoreFunction<PremiumStore>,
  onSelect: (action: string) => void,
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

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={props.setOpen}
      triggerClass="hidden"
      title={
        <div>
          Manage Premium
        </div>
      }
    >
      <div class={styles.managePremium}>
        <PremiumSidebarActive
          data={props.data}
          onSidebarAction={(action) => {
            props.setOpen(false);
            props.onSelect(action);
          }}
          onOpenFAQ={() => {
            props.setOpen(false);
            props.setData('openFeatures', () => 'faq');
          }}
        />
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumManageModal
