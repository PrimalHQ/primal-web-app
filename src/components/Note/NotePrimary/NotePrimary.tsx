import { Component } from 'solid-js';
import { truncateNpub } from '../../../stores/profile';
import { PrimalNote } from '../../../types/primal';
import ParsedNote from '../../ParsedNote/ParsedNote';
import NoteFooter from '../NoteFooter/NoteFooter';
import NoteHeader from '../NoteHeader/NoteHeader';

import styles from './NotePrimary.module.scss';


const NotePrimary: Component<{ note: PrimalNote }> = (props) => {

  return (
      <div
        class={styles.post}
        data-event={props.note.post.id}
        data-event-bech32={props.note.post.noteId}
      >
        <div class={styles.border}></div>
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

export default NotePrimary;
