import { Component } from 'solid-js';
import { hookForDev } from '../../../lib/devTools';
import { PrimalNote } from '../../../types/primal';
import ParsedNote from '../../ParsedNote/ParsedNote';
import NoteFooter from '../NoteFooter/NoteFooter';
import NoteHeader from '../NoteHeader/NoteHeader';

import styles from './NotePrimary.module.scss';


const NotePrimary: Component<{ note: PrimalNote, id?: string }> = (props) => {

  return (
    <div
      id={props.id}
      class={styles.post}
      data-event={props.note.post.id}
      data-event-bech32={props.note.post.noteId}
    >
      <div class={styles.border}></div>
      <NoteHeader note={props.note} primary={true} />
      <div class={styles.content}>

        <div class={styles.message}>
          <ParsedNote note={props.note} width={Math.min(574, window.innerWidth)} />
        </div>

        <NoteFooter note={props.note} wide={true} />
      </div>
    </div>
  )
}

export default hookForDev(NotePrimary);
