import { Component, createEffect, onCleanup } from 'solid-js';
import { PrimalDVM, PrimalNote } from '../../../types/primal';

import styles from './NoteFooter.module.scss';

const buttonTypeClasses: Record<string, string> = {
  zap: styles.zapType,
  like: styles.likeType,
  reply: styles.replyType,
  repost: styles.repostType,
};

const DvmFooterActionButton: Component<{
  type: 'zap' | 'like' | 'reply' | 'repost',
  dvm: PrimalDVM | undefined,
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
}> = (props) => {

  return (
    <button
      id={`btn_${props.type}_${props.dvm?.id}`}
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
        <div class={styles.statNumber}>{props.label || ''}</div>
      </div>
    </button>
  )
}

export default DvmFooterActionButton;
