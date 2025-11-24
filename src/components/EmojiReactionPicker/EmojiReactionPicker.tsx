import { Component, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { COMMON_REACTIONS } from '../../lib/reactions';
import styles from './EmojiReactionPicker.module.scss';
import { hookForDev } from '../../lib/devTools';

export type EmojiReactionPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  anchorEl?: HTMLElement;
  position?: { x: number; y: number };
};

const EmojiReactionPicker: Component<EmojiReactionPickerProps> = (props) => {

  const handleEmojiClick = (emoji: string) => {
    props.onEmojiSelect(emoji);
    props.onClose();
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  // Calculate position relative to anchor element
  const getPosition = () => {
    if (props.position) {
      return {
        left: `${props.position.x}px`,
        top: `${props.position.y}px`,
      };
    }

    if (props.anchorEl) {
      const rect = props.anchorEl.getBoundingClientRect();
      return {
        left: `${rect.left}px`,
        top: `${rect.bottom + 8}px`, // 8px spacing below the button
      };
    }

    return {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class={styles.backdrop} onClick={handleBackdropClick}>
          <div class={styles.picker} style={getPosition()}>
            <div class={styles.emojiGrid}>
              <For each={COMMON_REACTIONS}>
                {(emoji) => (
                  <button
                    class={styles.emojiButton}
                    onClick={() => handleEmojiClick(emoji)}
                    title={emoji === '+' ? 'Like' : emoji}
                  >
                    {emoji === '+' ? '❤️' : emoji}
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default hookForDev(EmojiReactionPicker);
