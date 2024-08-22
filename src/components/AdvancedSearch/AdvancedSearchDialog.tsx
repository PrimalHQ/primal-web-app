import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { Component, createEffect, createSignal, For, JSXElement, Show } from 'solid-js';
import { useSearchContext } from '../../contexts/SearchContext';
import { nip05Verification, userName } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import { debounce } from '../../utils';
import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import { useToastContext } from '../Toaster/Toaster';
import { placeholders, search as t } from '../../translations';

import styles from './AdvancedSearch.module.scss';
import { hookForDev } from '../../lib/devTools';
import { useProfileContext } from '../../contexts/ProfileContext';
import { DropdownMenu } from '@kobalte/core/dropdown-menu';
import SearchOption from '../Search/SearchOption';
import { Slider } from '@kobalte/core/slider';
import { TextField } from '@kobalte/core/text-field';
import { Dialog } from '@kobalte/core/dialog';


const AdvancedSearchDialog: Component<{
  triggerClass: string,
  triggerContent: JSXElement,
  title: JSXElement,
  children?: JSXElement,
  open?: boolean,
  setOpen?: (v: boolean) => void,
  id?: string,
}> = (props) => {

  return (
    <Dialog open={props.open} onOpenChange={props.setOpen}>
      <Dialog.Trigger class={props.triggerClass}>
        {props.triggerContent}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class={styles.dialogOverlay} />
        <div class={styles.dialog}>
          <Dialog.Content class={styles.dialogContent} >
            <div class={styles.dialogHeader}>
              <Dialog.Title class={styles.dialogTitle}>
                {props.title}
              </Dialog.Title>
              <Dialog.CloseButton class={styles.dialogCloseButton}>
                <div class={styles.excludeIcon}></div>
              </Dialog.CloseButton>
            </div>
            <Dialog.Description class={styles.dialogDescription}>
              {props.children}
            </Dialog.Description>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>

  )
}

export default hookForDev(AdvancedSearchDialog);
