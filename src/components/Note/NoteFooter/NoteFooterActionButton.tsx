import { Component, Show, createEffect, onCleanup } from 'solid-js';
import { PrimalNote } from '../../../types/primal';

import styles from './NoteFooter.module.scss';
import { isPhone } from '../../../utils';

const buttonTypeClasses: Record<string, string> = {
  zap: styles.zapType,
  like: styles.likeType,
  reply: styles.replyType,
  repost: styles.repostType,
};

const NoteFooterActionButton: Component<{
  type: 'zap' | 'like' | 'reply' | 'repost',
  note: PrimalNote,
  disabled?: boolean,
  highlighted?: boolean,
  onClick?: (e: MouseEvent) => void,
  onMouseDown?: (e: MouseEvent) => void,
  onMouseUp?: (e: MouseEvent) => void,
  onTouchStart?: (e: TouchEvent) => void,
  onTouchEnd?: (e: TouchEvent) => void,
  label: string | number,
  hidden?: boolean,
  title?: string,
  large?: boolean,
  noteType?: 'primary',
}> = (props) => {

  return (
    <button
      id={`btn_${props.type}_${props.note.post.id}`}
      class={`${styles.stat} ${props.highlighted ? styles.highlighted : ''}`}
      onClick={props.onClick ?? (() => {})}
      onMouseDown={props.onMouseDown ?? (() => {})}
      onMouseUp={props.onMouseUp ?? (() => {})}
      onTouchStart={props.onTouchStart ?? (() => {})}
      onTouchEnd={props.onTouchEnd ?? (() => {})}
      disabled={props.disabled}
    >
      <div class={`${buttonTypeClasses[props.type]} ${props.large ? styles.large : ''}`}>
        <div
          class={`${styles.icon} ${props.large ? styles.large : ''}`}
          style={props.hidden ? 'visibility: hidden': 'visibility: visible'}
        ></div>
        <Show when={!(isPhone() && props.noteType === 'primary')}>
          <div class={styles.statNumber}>{props.label || ''}</div>
        </Show>
      </div>
    </button>
  )
}

export default NoteFooterActionButton;
