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
      <NoteHeader note={props.note} />
      <div class={styles.content}>

        <div class={styles.message}>
          <ParsedNote note={props.note} />
        </div>

        <NoteFooter note={props.note}/>
      </div>
    </div>
  )
}

export default hookForDev(NotePrimary);
