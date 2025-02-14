import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
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


const AdvancedSearchCommandTextField: Component<{
  command: string,
  id?: string,
  onCommandChange: (command: string) => void,
  submitCommandChange: (command: string) => void,
}> = (props) => {

  const [allowCommandChange, setAllowCommandChange] = createSignal(false);


  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Enter') {
      e.stopPropagation();
      e.preventDefault();

      props.submitCommandChange(props.command);
      return false;
    }
  }

  return (
    <>
      <TextField
        class={styles.searchCommand}
        value={props.command}
        onKeyDown={onKeyDown}
        onChange={props.onCommandChange}
        >
        <TextField.Label>Search Command</TextField.Label>
        <TextField.TextArea
            autoResize={true}
            onFocus={() => setAllowCommandChange(() => true)}
            onBlur={() => setAllowCommandChange(() => false)}
        />
      </TextField>
      <Show when={allowCommandChange()}>
        <button
            class={styles.faintButton}
            type="submit"
        >
            Press Enter to apply changes
        </button>
      </Show>
    </>

  )
}

export default hookForDev(AdvancedSearchCommandTextField);
