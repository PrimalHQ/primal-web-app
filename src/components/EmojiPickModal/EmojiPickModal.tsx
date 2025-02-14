import { Component, createEffect, createSignal } from 'solid-js';

import styles from './EmojiPickModal.module.scss';
import Modal from '../Modal/Modal';

import { EmojiOption } from '../../types/primal';
import EmojiPicker from '../EmojiPicker/EmojiPicker';
import EmojiPickHeader from './EmojiPickHeader';
import { useAccountContext } from '../../contexts/AccountContext';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

const defaultTerm = 'face';

const EmojiPickModal: Component<{
  id?: string,
  open: boolean,
  onClose: (e?: MouseEvent | KeyboardEvent) => void,
  onSelect: (emoji: EmojiOption) => void,
}> = (props) => {

  const account = useAccountContext();

  const [emojiSearchTerm, setEmojiSearchTerm] = createSignal(defaultTerm);
  const [focusInput, setFocusInput] = createSignal(false);
  const [showPreset, setShowPreset] = createSignal(true);

  createEffect(() => {
    if (props.open) {
      setTimeout(() => {
        setEmojiSearchTerm(() => defaultTerm)
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
      setEmojiSearchTerm(() => defaultTerm);
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
    <AdvancedSearchDialog
      open={props.open}
      setOpen={(isOpen: boolean) => !isOpen && props.onClose && props.onClose()}
      triggerClass={styles.hidden}
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
    </AdvancedSearchDialog>
  );
}

export default EmojiPickModal;
