import { Component, createEffect, createSignal } from 'solid-js';

import styles from './EmojiPickModal.module.scss';
import Modal from '../Modal/Modal';

import { EmojiOption } from '../../types/primal';
import EmojiPicker from '../EmojiPicker/EmojiPicker';
import EmojiPickHeader from './EmojiPickHeader';
import { useAccountContext } from '../../contexts/AccountContext';

const defaultTerm = 'smile';

const EmojiPickModal: Component<{
  id?: string,
  open: boolean,
  onClose: (e: MouseEvent | KeyboardEvent) => void,
  onSelect: (emoji: EmojiOption) => void,
}> = (props) => {

  const account = useAccountContext();

  const [emojiSearchTerm, setEmojiSearchTerm] = createSignal(defaultTerm);
  const [focusInput, setFocusInput] = createSignal(false);
  const [showPreset, setShowPreset] = createSignal(true);

  createEffect(() => {
    if (props.open) {
      setTimeout(() => {
        setEmojiSearchTerm(() => 'smile')
        setFocusInput(true);
        setFocusInput(() => false);
      }, 10);
    }
  });

  createEffect(() => {
    if (emojiSearchTerm().length === 0) {
      setEmojiSearchTerm(() => defaultTerm)
    }
  });

  const setFilter = (filter: string) => {
    if (filter === 'default') {
      setShowPreset(true);
      setEmojiSearchTerm(() => 'smile');
    }
    else {
      setShowPreset(false);
      setEmojiSearchTerm(() => filter);
    }
  };

  const onEmojiSearch = (term: string) => {
    setEmojiSearchTerm(() => term);
    setShowPreset(() => term.length === 0);
  };

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
    >
      <div id={props.id} class={styles.zapEmojiChangeModal}>
        <EmojiPickHeader
          focus={focusInput()}
          onInput={onEmojiSearch}
          onFilter={setFilter}
        />

        <EmojiPicker
          showPreset={showPreset()}
          preset={account?.emojiHistory || []}
          filter={emojiSearchTerm()}
          onSelect={(emoji: EmojiOption) => {
            props.onSelect(emoji);
            setFocusInput(true);
            setFocusInput(() => false);
          }}
        />
      </div>
    </Modal>
  );
}

export default EmojiPickModal;
