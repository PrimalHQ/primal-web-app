import { Component, onMount, onCleanup, createSignal } from 'solid-js';
import 'emoji-picker-element';
import styles from './FullEmojiPicker.module.scss';

// Extend JSX types for the web component
declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "emoji-picker": any;
    }
  }
}

type FullEmojiPickerProps = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  anchorRef?: HTMLElement;
};

const FullEmojiPicker: Component<FullEmojiPickerProps> = (props) => {
  let pickerRef: any;
  let backdropRef: HTMLDivElement | undefined;
  const [position, setPosition] = createSignal({ top: 0, left: 0 });

  onMount(() => {
    // Position the picker relative to anchor
    if (props.anchorRef) {
      const rect = props.anchorRef.getBoundingClientRect();
      const pickerWidth = Math.min(436, window.innerWidth - 32); // Responsive width (436px to prevent scroll)
      const pickerHeight = Math.min(435, window.innerHeight - 100); // Responsive height

      let top = rect.bottom + 8;
      let left = rect.left;

      // Keep picker on screen
      if (left + pickerWidth > window.innerWidth) {
        left = Math.max(16, window.innerWidth - pickerWidth - 16);
      }
      if (top + pickerHeight > window.innerHeight) {
        top = Math.max(16, rect.top - pickerHeight - 8);
      }

      setPosition({ top, left });
    }

    // Listen for emoji selection
    if (pickerRef) {
      pickerRef.addEventListener('emoji-click', handleEmojiClick);
    }

    // Close on backdrop click
    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === backdropRef) {
        props.onClose();
      }
    };

    backdropRef?.addEventListener('click', handleBackdropClick);

    onCleanup(() => {
      pickerRef?.removeEventListener('emoji-click', handleEmojiClick);
      backdropRef?.removeEventListener('click', handleBackdropClick);
    });
  });

  const handleEmojiClick = (event: any) => {
    const emoji = event.detail.unicode;
    props.onSelect(emoji);
    props.onClose();
  };

  return (
    <>
      <div ref={backdropRef} class={styles.backdrop} />
      <div
        class={styles.pickerContainer}
        style={`top: ${position().top}px; left: ${position().left}px;`}
      >
        <emoji-picker ref={pickerRef} class={styles.picker} />
      </div>
    </>
  );
};

export default FullEmojiPicker;
