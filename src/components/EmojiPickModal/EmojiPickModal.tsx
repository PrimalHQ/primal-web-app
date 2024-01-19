import { Component, createEffect, createSignal, For } from 'solid-js';

import styles from './EmojiPickModal.module.scss';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { debounce, isVisibleInContainer, uuidv4 } from '../../utils';
import { useIntl } from '@cookbook/solid-intl';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { settings as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import ButtonLink from '../Buttons/ButtonLink';
import Modal from '../Modal/Modal';

import emojiSearch from '@jukben/emoji-search';
import { createStore } from 'solid-js/store';
import { EmojiOption } from '../../types/primal';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import EmojiPicker from '../EmojiPicker/EmojiPicker';

const defaultTerm = 'smile';

const EmojiPickModal: Component<{
  id?: string,
  open: boolean,
  onClose: (e: MouseEvent | KeyboardEvent) => void,
  onSelect: (emoji: EmojiOption) => void,
}> = (props) => {

  const intl = useIntl();

  const [emojiSearchTerm, setEmojiSearchTerm] = createSignal(defaultTerm);

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      props.onClose(e);
      return;
    }
  };

  let emojiInput: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.open) {
      window.addEventListener('keydown', onKey);
      setTimeout(() => {
        setEmojiSearchTerm(() => 'smile')
        emojiInput?.focus();
      }, 10);
    }
    else {
      window.removeEventListener('keydown', onKey);
    }
  });

  createEffect(() => {
    if (emojiSearchTerm().length === 0) {
      setEmojiSearchTerm(() => defaultTerm)
    }
  });

  return (
    <Modal
      open={props.open}
      onBackdropClick={(e: MouseEvent) => props.onClose(e)}
    >
      <div id={props.id} class={styles.zapEmojiChangeModal}>
        <div class={styles.title}>
          {intl.formatMessage(t.zapEmojiFilterTitle)}
        </div>

        <button class={styles.xClose} onClick={props.onClose}>
          <div class={styles.iconClose}></div>
        </button>

        <input
          ref={emojiInput}
          onInput={(e: InputEvent) => {
            const target = e.target as HTMLInputElement;
            setEmojiSearchTerm(() => target.value);
          }}
          placeholder={intl.formatMessage(t.zapEmojiFilterPlaceholder)}
        >
        </input>

        <EmojiPicker
          filter={emojiSearchTerm()}
          onSelect={(emoji: EmojiOption) => {
            props.onSelect(emoji);
            emojiInput?.focus();
          }}
        />
      </div>
    </Modal>
  );
}

export default EmojiPickModal;
