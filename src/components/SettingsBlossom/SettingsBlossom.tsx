import { Component, createSignal, For } from 'solid-js';

import styles from './SettingsBlossom.module.scss';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { debounce } from '../../utils';
import { useIntl } from '@cookbook/solid-intl';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { settings as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import ButtonLink from '../Buttons/ButtonLink';

import { EmojiOption } from '../../types/primal';
import EmojiPickModal from '../EmojiPickModal/EmojiPickModal';
import { useAccountContext } from '../../contexts/AccountContext';

const SettingsBlossom: Component<{ id?: string }> = (props) => {

  const intl = useIntl();
  const settings = useSettingsContext();
  const account = useAccountContext();

  const blossomList = () => {

  }


  return (
    <div id={props.id} class={styles.zapSettings}>
      Blossom
    </div>
  );
}

export default hookForDev(SettingsBlossom);
