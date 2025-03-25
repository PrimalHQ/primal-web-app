import { Popover } from '@kobalte/core/popover';
import { Component, createSignal } from 'solid-js';

import styles from './ReadsEditor.module.scss';
import { Editor } from '@tiptap/core';
import { FormatControls } from './ReadsEditorToolbar';

export type FormatBubbleCommands = {
  bold: () => void,
  italic: () => void,
  uline: () => void,
  strike: () => void,
}

const ReadsEditorBubbleMenu: Component<{
  id?: string,
  editor: Editor | undefined,
  store: FormatControls,
  commands:FormatBubbleCommands,
}> = (props) => {

  return (
    <div id='bubble_menu_one' class={styles.bubbleMenu}>
      <button
        id="boldBtnBubble"
        class={`${styles.mdToolButton} ${props.store.isBoldActive ? styles.selected : ''}`}
        onClick={props.commands.bold}
        title="bold"
      >
        <div class={styles.boldIcon}></div>
      </button>

      <button
        id="italicBtnBubble"
        class={`${styles.mdToolButton} ${props.store.isItalicActive ? styles.selected : ''}`}
        onClick={props.commands.italic}
        title="italic"
      >
        <div class={styles.italicIcon}></div>
      </button>

      <button
        id="ulineBtnBubble"
        class={`${styles.mdToolButton} ${props.store.isUlineActive ? styles.selected : ''}`}
        onClick={props.commands.uline}
        title="underline"
      >
        <div class={styles.ulineIcon}></div>
      </button>

      <button
        id="strikeBtnBubble"
        class={`${styles.mdToolButton} ${props.store.isStrikeActive ? styles.selected : ''}`}
        onClick={props.commands.strike}
        title="strike"
      >
        <div class={styles.strikeIcon}></div>
      </button>
    </div>
  );
}

export default ReadsEditorBubbleMenu;
