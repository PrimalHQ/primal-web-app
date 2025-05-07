import { useIntl } from '@cookbook/solid-intl';
import { Component, createSignal } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useAppContext } from '../../contexts/AppContext';
import { hookForDev } from '../../lib/devTools';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

import styles from './ReadsMentionDialog.module.scss';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { useSearchContext } from '../../contexts/SearchContext';
import { useProfileContext } from '../../contexts/ProfileContext';
import ButtonSecondary from '../Buttons/ButtonSecondary';


const ReadsLeaveDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  onSave: () => void,
  onReturn: () => void,
  onLeave: () => void,
  title: string,
  description: string,
}> = (props) => {

  const intl = useIntl();
  const account = useAccountContext();
  const app = useAppContext();
  const search = useSearchContext();
  const profile = useProfileContext();

  const [promotion, setPromotion] = createSignal('');
  const [showPromotion, setShowPromotion] = createSignal(false);

  return (
    <AdvancedSearchDialog
      triggerClass="hidden"
      open={props.open}
      setOpen={props.setOpen}
      title={props.title}
    >
      <div class={styles.leaveDialog}>
        <div class={styles.description}>
          {props.description}
        </div>

        <div class={styles.actions}>
          <ButtonSecondary
            onClick={() => props.onReturn && props.onReturn()}
            light={true}
            shrink={false}
          >
            Continue Editing
          </ButtonSecondary>

          <ButtonSecondary
            onClick={() => props.onLeave && props.onLeave()}
            light={true}
            shrink={false}
          >
            Discard changes
          </ButtonSecondary>

          <ButtonPrimary
            onClick={() => props.onSave && props.onSave()}
          >
            Save Draft
          </ButtonPrimary>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ReadsLeaveDialog);
